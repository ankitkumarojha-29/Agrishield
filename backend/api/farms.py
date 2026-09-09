from fastapi import APIRouter, Depends, UploadFile, File, Form
from pydantic import BaseModel
import uuid, json
from datetime import datetime, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape

from schemas.contract import Envelope, EnvelopeMeta, EnvelopeError, GeoPolygon, PolygonValidationResult
from services.polygon_validator import validate_farm_boundary
from services.ai_client import get_ai_client
from db.session import get_db
from db.models import Farm, User, UserRole, PolicyStatus, SoilReport, SoilReportSource
from api.auth import get_current_user, get_admin_user, _ok, _error

router = APIRouter()

def _serialize_farm(f: Farm, include_farmer=False) -> dict:
    """Serialize a Farm ORM object to a dict matching openapi.yaml Farm schema."""
    boundary = None
    centroid = {"lat": 20.5937, "lon": 78.9629}  # India geographic center as fallback

    if f.boundary is not None:
        try:
            shape = to_shape(f.boundary)
            coords = [[[lon, lat] for lon, lat in shape.exterior.coords]]
            boundary = {"type": "Polygon", "coordinates": coords}
            lons = [c[0] for c in shape.exterior.coords]
            lats = [c[1] for c in shape.exterior.coords]
            centroid = {
                "lat": round(sum(lats) / len(lats), 6),
                "lon": round(sum(lons) / len(lons), 6),
            }
        except Exception:
            pass

    active_policy = None
    has_insurance = False
    if hasattr(f, "policies") and f.policies:
        for p in f.policies:
            if p.status == PolicyStatus.ACTIVE:
                has_insurance = True
                active_policy = {
                    "id": str(p.id),
                    "premium_amount": p.premium,
                    "coverage_amount": p.sum_insured,
                    "tx_hash": p.tx_hash,
                    "canonical_hash": p.canonical_hash,
                    "status": p.status.value,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                break

    data = {
        "id": str(f.id),
        "user_id": str(f.user_id),
        "name": f.name,
        "crop": f.crop,
        "sowing_date": f.sowing_date.date().isoformat() if f.sowing_date else None,
        "area_m2": f.area_m2,
        "boundary": boundary,
        "centroid": centroid,
        "status": "VERIFIED" if has_insurance else (f.status.value if f.status else "PENDING"),
        "has_insurance": has_insurance,
        "active_policy": active_policy,
        "policy": active_policy,
    }
    
    if include_farmer and f.owner:
        data["farmer"] = {
            "id": str(f.owner.id),
            "name": f.owner.name,
            "phone": f.owner.phone
        }
        
    return data

class CreateFarmRequest(BaseModel):
    name: str
    crop: Optional[str] = None
    sowing_date: Optional[date] = None
    boundary: GeoPolygon
    khasra_number: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    ownership_type: Optional[str] = None

@router.get("")
async def list_farms(
    page: int = 1, 
    page_size: int = 50, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * page_size
    query = select(Farm).options(selectinload(Farm.owner), selectinload(Farm.policies)).order_by(Farm.name, Farm.id)
    
    if current_user.role != UserRole.ADMIN:
        query = query.where(Farm.user_id == current_user.id)
        
    query = query.limit(page_size).offset(offset)
    result = await db.execute(query)
    farms = result.scalars().all()
    
    # If admin, include farmer details
    is_admin = current_user.role == UserRole.ADMIN
    return _ok([_serialize_farm(f, include_farmer=is_admin) for f in farms])

@router.post("", status_code=201)
async def create_farm(
    req: CreateFarmRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    val_res = validate_farm_boundary(req.boundary)
    if not val_res.valid:
        return _error("FARM_BOUNDARY_INVALID", f"Invalid boundary: {val_res.reason}", 400)

    coordinates = req.boundary.coordinates[0]
    points = ", ".join([f"{lon} {lat}" for lon, lat in coordinates])
    wkt_polygon = f"POLYGON(({points}))"

    farm_name = req.name.strip()
    if req.khasra_number and req.khasra_number.strip() and f"#{req.khasra_number.strip()}" not in farm_name:
        farm_name = f"{farm_name} (Khasra #{req.khasra_number.strip()})"

    new_farm = Farm(
        user_id=current_user.id,
        name=farm_name,
        crop=req.crop,
        sowing_date=datetime.combine(req.sowing_date, datetime.min.time()) if req.sowing_date else None,
        area_m2=val_res.area_m2,
        boundary=WKTElement(wkt_polygon, srid=4326),
    )
    db.add(new_farm)
    await db.commit()
    await db.refresh(new_farm)

    return _ok({"farm_id": str(new_farm.id), "area_m2": val_res.area_m2})

@router.get("/{farm_id}")
async def get_farm(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        farm_uuid = uuid.UUID(farm_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")

    query = select(Farm).options(selectinload(Farm.owner), selectinload(Farm.policies)).where(Farm.id == farm_uuid)
    result = await db.execute(query)
    farm = result.scalar_one_or_none()
    
    if not farm:
        return _error("FARM_NOT_FOUND", "Farm not found", 404)
        
    if current_user.role != UserRole.ADMIN and farm.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed to view this farm", 403)

    return _ok(_serialize_farm(farm, include_farmer=(current_user.role == UserRole.ADMIN)))

class UpdateFarmRequest(BaseModel):
    crop: Optional[str] = None
    sowing_date: Optional[date] = None
    name: Optional[str] = None

@router.patch("/{farm_id}")
async def update_farm(
    farm_id: str,
    req: UpdateFarmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        farm_uuid = uuid.UUID(farm_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")

    farm = await db.get(Farm, farm_uuid)
    if not farm:
        return _error("FARM_NOT_FOUND", "Farm not found", 404)

    if current_user.role != UserRole.ADMIN and farm.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed to edit this farm", 403)

    if req.crop is not None:
        farm.crop = req.crop
    if req.sowing_date is not None:
        farm.sowing_date = datetime.combine(req.sowing_date, datetime.min.time())
    if req.name is not None:
        farm.name = req.name

    await db.commit()
    await db.refresh(farm)
    return _ok(_serialize_farm(farm))

@router.get("/{farm_id}/revenue")
async def get_farm_revenue(
    farm_id: str,
    crop: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.agmarknet_client import get_mandi_price
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm

    area_ha = max((farm.area_m2 or 10000) / 10000.0, 0.01)
    target_crop = crop or farm.crop or "Wheat"
    if target_crop.lower() in ("unsown", "none", "fallow", ""):
        target_crop = "Soybean"

    # 1. Fetch mandi price (data.gov.in / MSP benchmark)
    mandi = await get_mandi_price(target_crop)
    price_per_qtl = mandi["price_per_quintal"]

    # 2. Get predicted yield
    try:
        ai = get_ai_client()
        yield_res = await ai.get_yield_prediction(
            crop=target_crop,
            area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 27, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200, "organic_carbon": 0.5},
            satellite={"ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0},
        )
        yield_kg_per_ha = float(yield_res.get("yield_value", 3200.0))
    except Exception:
        yield_kg_per_ha = 3200.0

    total_yield_kg = round(yield_kg_per_ha * area_ha, 2)
    total_yield_quintals = round(total_yield_kg / 100.0, 2)

    # 3. Revenue = Yield in Quintals * Mandi Price per Quintal
    total_revenue = round(total_yield_quintals * price_per_qtl, 2)
    revenue_per_ha = round(total_revenue / area_ha, 2)

    return _ok({
        "farm_id": str(farm.id),
        "farm_name": farm.name,
        "crop": target_crop,
        "area_ha": round(area_ha, 2),
        "area_acres": round(area_ha * 2.47105, 2),
        "yield_kg_per_ha": yield_kg_per_ha,
        "total_yield_kg": total_yield_kg,
        "total_yield_quintals": total_yield_quintals,
        "mandi_price_per_quintal": price_per_qtl,
        "mandi_price_per_kg": round(price_per_qtl / 100.0, 2),
        "market": mandi["market"],
        "grade": mandi["grade"],
        "price_date": mandi["date"],
        "price_source": mandi["source"],
        "is_live_mandi": mandi["is_live"],
        "total_revenue": total_revenue,
        "total_revenue_inr": total_revenue,
        "revenue_per_ha": revenue_per_ha,
        "yield_quintals": total_yield_quintals,
    })

class BoundaryCheckRequest(BaseModel):
    boundary: GeoPolygon

@router.post("/{farm_id}/validate-boundary", response_model=PolygonValidationResult)
async def check_boundary(farm_id: str, req: BoundaryCheckRequest):
    return validate_farm_boundary(req.boundary)


# ─── AI PROXY ROUTES ────────────────────────────────────────────────────────

async def _get_farm_or_404(farm_id: str, db: AsyncSession, user: User):
    try:
        farm_uuid = uuid.UUID(farm_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")
    
    farm = await db.get(Farm, farm_uuid)
    if not farm:
        return _error("FARM_NOT_FOUND", "Farm not found", 404)
        
    if user.role != UserRole.ADMIN and farm.user_id != user.id:
        return _error("FORBIDDEN", "Not allowed to access this farm", 403)
        
    return farm


@router.post("/{farm_id}/crop-health")
async def farm_crop_health(
    farm_id: str,
    image: UploadFile = File(...),
    crop: str = Form(...),
    growth_stage: str = Form(default="vegetative"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if farm_id not in ("demo", "general", "scan"):
        farm = await _get_farm_or_404(farm_id, db, current_user)
        if not isinstance(farm, Farm):
            return farm
        
    try:
        image_bytes = await image.read()
        ai = get_ai_client()
        result = await ai.get_crop_health(image_bytes, crop, growth_stage)
        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.post("/{farm_id}/yield-predict")
async def farm_yield_predict(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
        
    try:
        area_ha = (farm.area_m2 or 10000) / 10000.0
        is_unsown = not farm.crop or farm.crop.strip().lower() in ("unsown", "fallow", "none", "")
        
        ai = get_ai_client()
        crop_to_predict = farm.crop
        if is_unsown:
            try:
                adv = await ai.get_advisory({
                    "crop": "unsown",
                    "area_ha": area_ha,
                    "weather": {"temp_mean": 28, "rainfall": 80},
                    "soil": {"N": 50, "P": 25, "K": 200, "pH": 6.5},
                })
                crop_to_predict = adv.get("suggested_crop", "Soybean")
            except Exception:
                crop_to_predict = "Soybean"

        boundary_coords = None
        centroid_lat = None
        centroid_lon = None
        try:
            if farm.boundary is not None:
                shape = to_shape(farm.boundary)
                centroid_lat = shape.centroid.y
                centroid_lon = shape.centroid.x
                boundary_coords = [[lon, lat] for lon, lat in shape.exterior.coords]
        except Exception:
            pass

        result = await ai.get_yield_prediction(
            crop=crop_to_predict, area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 27, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200, "organic_carbon": 0.5},
            satellite={"ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0},
            boundary_coordinates=boundary_coords,
            centroid_lat=centroid_lat,
            centroid_lon=centroid_lon,
        )
        
        # Calculate total farm yield
        yield_val = float(result.get("yield_value", 3200.0))
        result["area_ha"] = round(area_ha, 2)
        result["total_yield_kg"] = round(yield_val * area_ha, 2)
        result["total_yield_quintals"] = round(result["total_yield_kg"] / 100.0, 2)
        result["is_unsown"] = is_unsown
        if is_unsown:
            result["suggested_crop"] = crop_to_predict

        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.post("/{farm_id}/risk-score")
async def farm_risk_score(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
        
    try:
        area_ha = (farm.area_m2 or 10000) / 10000.0
        crop = farm.crop or "wheat"

        boundary_coords = None
        centroid_lat = None
        centroid_lon = None
        try:
            if farm.boundary is not None:
                shape = to_shape(farm.boundary)
                centroid_lat = shape.centroid.y
                centroid_lon = shape.centroid.x
                boundary_coords = [[lon, lat] for lon, lat in shape.exterior.coords]
        except Exception:
            pass

        ai = get_ai_client()
        result = await ai.get_risk_score(
            crop=crop, area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 28, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200},
            satellite={"ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0},
            history={"yield_prediction": 3000, "disease_probability": 0.1, "historical_loss": 0.1},
            boundary_coordinates=boundary_coords,
            centroid_lat=centroid_lat,
            centroid_lon=centroid_lon,
        )
        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.post("/{farm_id}/advisory")
async def farm_advisory(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
        
    try:
        ai = get_ai_client()
        result = await ai.get_advisory({
            "crop": farm.crop,
            "area_ha": (farm.area_m2 or 10000) / 10000.0,
            "weather": {"temp_mean": 28, "rainfall": 80},
            "soil": {"N": 50, "P": 25, "K": 200, "pH": 6.5},
        })
        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.post("/{farm_id}/soil/analyze")
async def farm_soil_analyze(
    farm_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
        
    try:
        file_bytes = await file.read()
        ai = get_ai_client()
        result = await ai.get_soil_ocr(file_bytes, file.filename or "soil_report")
        
        try:
            report = SoilReport(
                farm_id=farm.id,
                source=SoilReportSource.OCR_UPLOAD,
                n=result.get("N", 45.0),
                p=result.get("P", 22.0),
                k=result.get("K", 180.0),
                ph=result.get("pH", 6.5),
                confidence=result.get("confidence", 0.85),
                raw_text=result.get("extracted_text", "")
            )
            db.add(report)
            await db.commit()
        except Exception:
            pass

        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.get("/{farm_id}/weather/current")
async def farm_weather_current(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    from services.weather_client import get_current_weather
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
        
    lat, lon = 20.5937, 78.9629
    try:
        shape = to_shape(farm.boundary)
        c = shape.centroid
        lat, lon = c.y, c.x
    except Exception:
        pass
        
    weather = await get_current_weather(lat, lon)
    if not weather:
        return _error("AI_UNAVAILABLE", "Weather service unavailable", 500)
    return _ok(weather)
