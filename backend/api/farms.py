from fastapi import APIRouter, Depends, UploadFile, File, Form, Body
from pydantic import BaseModel
import uuid, json, logging
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
from db.models import Farm, User, UserRole, PolicyStatus, SoilReport, SoilReportSource, AIAssessment, AssessmentType, Notification, NotificationType
from api.auth import get_current_user, get_optional_current_user, get_admin_user, _ok, _error
import base64

logger = logging.getLogger(__name__)

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
        "khasra_number": getattr(f, "khasra_number", None),
        "crop": f.crop,
        "sowing_date": f.sowing_date.date().isoformat() if f.sowing_date else None,
        "soil_type": getattr(f, "soil_type", None) or "Medium Black (Loam)",
        "irrigation_type": getattr(f, "irrigation_type", None) or "Borewell / Tube Well",
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


@router.get("/soil/reports")
async def get_my_soil_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all saved soil reports across all farms belonging to the current user (or all if admin)."""
    is_admin = current_user.role == UserRole.ADMIN
    if is_admin:
        f_stmt = select(Farm)
    else:
        f_stmt = select(Farm).where(Farm.user_id == current_user.id)
    f_res = await db.execute(f_stmt)
    farms = f_res.scalars().all()
    farm_map = {f.id: f.name for f in farms}

    if not farms:
        return _ok([])

    s_stmt = select(SoilReport).where(SoilReport.farm_id.in_(list(farm_map.keys()))).order_by(SoilReport.created_at.desc())
    s_res = await db.execute(s_stmt)
    reports = s_res.scalars().all()

    return _ok([{
        "id": str(r.id),
        "farm_id": str(r.farm_id),
        "farm_name": farm_map.get(r.farm_id, "Main Plot"),
        "source": r.source.value if hasattr(r.source, "value") else str(r.source),
        "n": r.n,
        "p": r.p,
        "k": r.k,
        "ph": r.ph,
        "confidence": r.confidence,
        "raw_text": r.raw_text,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reports])


@router.get("/scans/history")
async def get_my_crop_scans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns crop disease scans uploaded by the authenticated farmer, strictly isolated to their account (or all for admin)."""
    is_admin = current_user.role == UserRole.ADMIN
    if is_admin:
        f_stmt = select(Farm)
    else:
        f_stmt = select(Farm).where(Farm.user_id == current_user.id)
    f_res = await db.execute(f_stmt)
    farms = f_res.scalars().all()
    farm_ids = [f.id for f in farms]
    farm_name_map = {str(f.id): f.name for f in farms}

    stmt = select(AIAssessment).where(AIAssessment.type == AssessmentType.CROP_HEALTH).order_by(AIAssessment.created_at.desc())
    res = await db.execute(stmt)
    all_scans = res.scalars().all()

    my_scans = []
    for s in all_scans:
        p = s.payload or {}
        matches_user = str(p.get("user_id", "")) == str(current_user.id)
        matches_farm = (s.farm_id in farm_ids) if (s.farm_id and farm_ids) else False
        if is_admin or matches_user or matches_farm:
            my_scans.append({
                "id": str(s.id),
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "confidence": s.confidence,
                "disease": p.get("disease") or p.get("diagnosis") or "Healthy Leaf",
                "severity": p.get("severity") or "LOW",
                "crop": p.get("crop") or "Crop",
                "growth_stage": p.get("growth_stage") or "vegetative",
                "recommendations": p.get("recommendations") or [],
                "image_data_uri": p.get("image_data_uri") or "",
                "farm_name": p.get("farm_name") or (farm_name_map.get(str(s.farm_id)) if s.farm_id else "Field Scan")
            })

    return _ok(my_scans)


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
        khasra_number=req.khasra_number.strip() if req.khasra_number else None,
        crop=req.crop,
        sowing_date=datetime.combine(req.sowing_date, datetime.min.time()) if req.sowing_date else None,
        soil_type=req.soil_type,
        irrigation_type=req.irrigation_type,
        area_m2=val_res.area_m2,
        boundary=WKTElement(wkt_polygon, srid=4326),
    )
    db.add(new_farm)
    await db.commit()
    await db.refresh(new_farm)

    # 1. Immediately evaluate farm & generate initial advisory notification for the farmer
    try:
        from services.farm_monitor_service import evaluate_farm_and_notify, notify_admins
        await evaluate_farm_and_notify(new_farm, db, force_check=True)
        # 2. Notify admins about newly registered farm parcel
        await notify_admins(
            db,
            title="🌾 नया खेत पंजीकृत (New Farm Registered)",
            message=f"किसान '{current_user.name}' ने '{farm_name}' ({req.crop or 'फसल'}) का नया खेत (क्षेत्रफल: {round(val_res.area_m2/10000, 2)} ha) पंजीकृत किया है।",
            notif_type=NotificationType.SYSTEM_ALERT,
            ref_id=new_farm.id
        )
    except Exception as e:
        logger.warning("Auto-evaluation or admin notify after farm creation error: %s", e)

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
    khasra_number: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None

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

    if req.name is not None and req.name.strip():
        farm.name = req.name.strip()
    if req.crop is not None and req.crop.strip():
        farm.crop = req.crop.strip()
    if req.sowing_date is not None:
        farm.sowing_date = datetime.combine(req.sowing_date, datetime.min.time())
    if req.khasra_number is not None:
        farm.khasra_number = req.khasra_number.strip()
    if req.soil_type is not None:
        farm.soil_type = req.soil_type.strip()
    if req.irrigation_type is not None:
        farm.irrigation_type = req.irrigation_type.strip()

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

    # 1. Fetch mandi price (data.gov.in / Daily DB cache / MSP benchmark)
    mandi = await get_mandi_price(target_crop, db=db)
    price_per_qtl = mandi["price_per_quintal"]

    # 2. Get predicted yield
    try:
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

        crop_clean = (target_crop or "wheat").strip().lower()
        ndvi = 0.71 if crop_clean not in ("unsown", "fallow", "none", "") else 0.22
        ndmi = 0.44 if crop_clean not in ("unsown", "fallow", "none", "") else -0.15
        ndwi = -0.12 if crop_clean not in ("unsown", "fallow", "none", "") else -0.38

        ai = get_ai_client()
        yield_res = await ai.get_yield_prediction(
            crop=target_crop,
            area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 27, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200, "organic_carbon": 0.5},
            satellite={"ndvi_mean": ndvi, "ndwi_mean": ndwi, "ndmi_mean": ndmi},
            boundary_coordinates=boundary_coords,
            centroid_lat=centroid_lat,
            centroid_lon=centroid_lon,
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
    farm = None
    if farm_id not in ("demo", "general", "scan"):
        farm = await _get_farm_or_404(farm_id, db, current_user)
        if not isinstance(farm, Farm):
            return farm
    else:
        # Link to the farmer's first registered farm if available
        stmt = select(Farm).where(Farm.user_id == current_user.id)
        f_res = await db.execute(stmt)
        user_farms = f_res.scalars().all()
        if user_farms:
            farm = user_farms[0]
        
    try:
        image_bytes = await image.read()
        ai = get_ai_client()
        result = await ai.get_crop_health(image_bytes, crop, growth_stage)

        # Store image thumbnail data URI so admin and farmer can review uploaded leaf photos
        data_uri = ""
        try:
            # Keep up to 350KB thumbnail
            thumb_slice = image_bytes[:350000]
            thumb_b64 = base64.b64encode(thumb_slice).decode("utf-8")
            ct = image.content_type or "image/jpeg"
            data_uri = f"data:{ct};base64,{thumb_b64}"
        except Exception:
            pass

        try:
            assessment = AIAssessment(
                farm_id=farm.id if farm else None,
                type=AssessmentType.CROP_HEALTH,
                model_version=str(result.get("model_version", "crop-health-v1")),
                confidence=float(result.get("confidence", 0.9)),
                low_confidence=bool(result.get("low_confidence", False)),
                payload={
                    "user_id": str(current_user.id),
                    "farmer_name": current_user.name or f"Farmer {current_user.phone[-4:] if current_user.phone else ''}",
                    "farmer_phone": current_user.phone,
                    "crop": crop,
                    "growth_stage": growth_stage,
                    "farm_name": farm.name if farm else "Field Scan",
                    "diagnosis": result.get("diagnosis", "Healthy"),
                    "disease": result.get("disease", result.get("diagnosis", "Healthy")),
                    "severity": result.get("severity", "LOW"),
                    "recommendations": result.get("recommendations", []),
                    "image_data_uri": data_uri
                }
            )
            db.add(assessment)
            await db.commit()
        except Exception as save_err:
            # Do not block client response if persistence fails
            print(f"Warning: Failed to save crop scan assessment: {save_err}")

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

        crop_clean = (crop_to_predict or "wheat").strip().lower()
        ndvi = 0.71 if crop_clean not in ("unsown", "fallow", "none", "") else 0.22
        ndmi = 0.44 if crop_clean not in ("unsown", "fallow", "none", "") else -0.15
        ndwi = -0.12 if crop_clean not in ("unsown", "fallow", "none", "") else -0.38

        result = await ai.get_yield_prediction(
            crop=crop_to_predict, area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 27, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200, "organic_carbon": 0.5},
            satellite={"ndvi_mean": ndvi, "ndwi_mean": ndwi, "ndmi_mean": ndmi},
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

        crop_clean = crop.strip().lower()
        ndvi = 0.71 if crop_clean not in ("unsown", "fallow", "none", "") else 0.22
        ndmi = 0.44 if crop_clean not in ("unsown", "fallow", "none", "") else -0.15
        ndwi = -0.12 if crop_clean not in ("unsown", "fallow", "none", "") else -0.38

        ai = get_ai_client()
        result = await ai.get_risk_score(
            crop=crop, area_ha=area_ha,
            weather={"rainfall": 80, "temp_mean": 28, "humidity": 65},
            soil={"pH": 6.5, "N": 50, "P": 25, "K": 200},
            satellite={"ndvi_mean": ndvi, "ndwi_mean": ndwi, "ndmi_mean": ndmi},
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
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    farm = None
    if farm_id not in ("demo", "general", "scan"):
        if not current_user:
            return _error("AUTH_REQUIRED", "Login required to associate soil analysis with registered farm", 401)
        farm = await _get_farm_or_404(farm_id, db, current_user)
        if not isinstance(farm, Farm):
            return farm
    elif current_user:
        try:
            stmt = select(Farm).where(Farm.user_id == current_user.id)
            f_res = await db.execute(stmt)
            user_farms = f_res.scalars().all()
            if user_farms:
                farm = user_farms[0]
        except Exception:
            pass

    try:
        file_bytes = await file.read()
        ai = get_ai_client()
        result = await ai.get_soil_ocr(file_bytes, file.filename or "soil_report")

        if farm:
            try:
                report = SoilReport(
                    farm_id=farm.id,
                    source=SoilReportSource.OCR,
                    n=float(result.get("N", 45.0)),
                    p=float(result.get("P", 22.0)),
                    k=float(result.get("K", 180.0)),
                    ph=float(result.get("pH", 6.8)),
                    confidence=float(result.get("confidence", 0.85)),
                    raw_text=result.get("extracted_text", "")
                )
                db.add(report)
                await db.commit()
                await db.refresh(report)
                logger.info("Saved SoilReport %s for farm %s", report.id, farm.id)
            except Exception as e:
                logger.error("Failed to save SoilReport to DB: %s", e)

        return _ok(result)
    except Exception as e:
        return _error("AI_UNAVAILABLE", str(e), 500)


@router.get("/{farm_id}/soil")
async def get_farm_soil_reports(
    farm_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns saved Soil Health Card reports for a specific farm parcel."""
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm

    stmt = select(SoilReport).where(SoilReport.farm_id == farm.id).order_by(SoilReport.created_at.desc())
    res = await db.execute(stmt)
    reports = res.scalars().all()

    return _ok([{
        "id": str(r.id),
        "farm_id": str(r.farm_id),
        "farm_name": farm.name,
        "source": r.source.value if hasattr(r.source, "value") else str(r.source),
        "n": r.n,
        "p": r.p,
        "k": r.k,
        "ph": r.ph,
        "confidence": r.confidence,
        "raw_text": r.raw_text,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reports])


@router.get("/{farm_id}/satellite/indices")
async def farm_satellite_indices(
    farm_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from services.satellite_service import get_live_satellite_indices
    farm = await _get_farm_or_404(farm_id, db, current_user)
    if not isinstance(farm, Farm):
        return farm
    
    lat, lon = 23.2599, 77.4126
    try:
        if farm.boundary is not None:
            shape = to_shape(farm.boundary)
            lat, lon = shape.centroid.y, shape.centroid.x
    except Exception:
        pass

    indices = await get_live_satellite_indices(
        centroid_lat=lat,
        centroid_lon=lon,
        crop=farm.crop or "Wheat"
    )
    indices["farm_id"] = str(farm.id)
    indices["farm_name"] = farm.name
    return _ok(indices)


@router.get("/{farm_id}/weather/current")
async def farm_weather_current(
    farm_id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    from services.weather_client import get_current_weather
    farm = None
    lat, lon = 18.5204, 73.8567  # Pune / Maharashtra agricultural belt default
    crop = "Soybean"
    soil_type = "Medium Black (Loam)"
    irrigation_type = "Tubewell"

    if farm_id not in ("demo", "general", "sample", "default"):
        if current_user:
            farm_obj = await _get_farm_or_404(farm_id, db, current_user)
            if isinstance(farm_obj, Farm):
                farm = farm_obj
        else:
            try:
                f_uuid = uuid.UUID(farm_id)
                stmt = select(Farm).where(Farm.id == f_uuid)
                res = await db.execute(stmt)
                farm = res.scalar_one_or_none()
            except Exception:
                pass

    if farm:
        crop = farm.crop or "Wheat"
        soil_type = getattr(farm, "soil_type", "Medium Black (Loam)")
        irrigation_type = getattr(farm, "irrigation_type", "Tubewell")
        try:
            shape = to_shape(farm.boundary)
            c = shape.centroid
            lat, lon = c.y, c.x
        except Exception:
            pass

    weather = await get_current_weather(
        lat, 
        lon, 
        crop=crop, 
        soil_type=soil_type, 
        irrigation_type=irrigation_type
    )
    if not weather:
        return _error("AI_UNAVAILABLE", "Weather service unavailable", 500)

    # Attach farm context
    weather["farm_id"] = str(farm.id) if farm else farm_id
    weather["farm_name"] = farm.name if farm else "मेरा आदर्श खेत (Demo Farm)"
    weather["crop"] = crop

    # Auto-record high priority notification if alert condition is met
    if current_user and weather.get("farmer_notification", {}).get("requires_alert"):
        try:
            notif_info = weather["farmer_notification"]
            # Check recent notification to prevent duplicate spam
            stmt = select(Notification).where(
                Notification.user_id == current_user.id,
                Notification.type == NotificationType.WEATHER_ALERT
            ).order_by(Notification.created_at.desc()).limit(1)
            recent_res = await db.execute(stmt)
            recent_notif = recent_res.scalar_one_or_none()

            if not recent_notif or (notif_info["title"] not in recent_notif.message):
                new_notif = Notification(
                    user_id=current_user.id,
                    type=NotificationType.WEATHER_ALERT,
                    message=f"{notif_info['title']}: {notif_info['message']}",
                    ref_id=farm.id if farm else None,
                    read=False
                )
                db.add(new_notif)
                await db.commit()
        except Exception as e:
            logger.warning("Failed to auto-create weather alert: %s", e)

    return _ok(weather)


@router.post("/{farm_id}/irrigation/notify")
async def send_irrigation_notification(
    farm_id: str,
    payload: Optional[dict] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Explicitly trigger or broadcast an irrigation/weather notification to the farmer.
    """
    target_user_id = None
    farm_ref_id = None

    if farm_id not in ("demo", "general", "sample"):
        try:
            f_uuid = uuid.UUID(farm_id)
            f_res = await db.execute(select(Farm).where(Farm.id == f_uuid))
            farm = f_res.scalar_one_or_none()
            if farm:
                target_user_id = farm.user_id
                farm_ref_id = farm.id
        except Exception:
            pass

    if not target_user_id and current_user:
        target_user_id = current_user.id

    if not target_user_id:
        u_res = await db.execute(select(User).limit(1))
        u = u_res.scalar_one_or_none()
        if u:
            target_user_id = u.id

    if not target_user_id:
        return _error("USER_NOT_FOUND", "No farmer account available to receive alert", 404)

    title = payload.get("title", "💧 सिंचाई व मौसम अलर्ट") if payload else "💧 सिंचाई व मौसम अलर्ट"
    msg = payload.get("message", "खेत में नमी की स्थिति के अनुसार सिंचाई सलाह अपडेट की गई है।") if payload else "खेत में नमी की स्थिति के अनुसार सिंचाई सलाह अपडेट की गई है।"
    full_message = f"{title}: {msg}" if title not in msg else msg

    notif = Notification(
        user_id=target_user_id,
        type=NotificationType.WEATHER_ALERT,
        message=full_message,
        ref_id=farm_ref_id,
        read=False
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    return _ok({
        "success": True,
        "notification_id": str(notif.id),
        "title": title,
        "message": msg,
        "timestamp": notif.created_at.isoformat() if notif.created_at else datetime.utcnow().isoformat()
    })

