import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from db.session import get_db
from db.models import (
    User, UserRole, Farm, Notification, NotificationType, 
    SoilReport, AIAssessment, AssessmentType, InsurancePolicy, Claim
)
from api.auth import get_admin_user

router = APIRouter()

def _ok(data: any):
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.utcnow().isoformat()},
        "error": None
    }

def _error(code: str, message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={
        "success": False,
        "data": None,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.utcnow().isoformat()},
        "error": {"code": code, "message": message}
    })

class BroadcastAlertRequest(BaseModel):
    title: str
    message: str
    severity: str = "warning"
    target_crop: Optional[str] = None

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    # Total farmers count
    farmers_res = await db.execute(select(func.count(User.id)).where(User.role == UserRole.FARMER))
    total_farmers = farmers_res.scalar() or 0

    # Total farms & acreage
    farms_res = await db.execute(select(Farm))
    all_farms = farms_res.scalars().all()
    total_farms = len(all_farms)
    total_area_m2 = sum(f.area_m2 or 0 for f in all_farms)
    total_acreage_ha = round(total_area_m2 / 10000.0, 2)

    # Crop distribution
    crop_counts = {}
    for f in all_farms:
        crop_name = f.crop or "Fallow / Unsown"
        crop_counts[crop_name] = crop_counts.get(crop_name, 0) + 1

    # Real AI Diagnostics breakdown from AIAssessment
    scans_res = await db.execute(
        select(AIAssessment).where(AIAssessment.type == AssessmentType.CROP_HEALTH)
    )
    all_scans = scans_res.scalars().all()
    total_scans = len(all_scans)
    healthy_count = 0
    for s in all_scans:
        p = s.payload or {}
        disease = (p.get("disease") or p.get("diagnosis") or "").lower()
        if "healthy" in disease or disease in ("", "none", "healthy leaf"):
            healthy_count += 1
    ai_healthy_pct = round((healthy_count / total_scans * 100.0), 1) if total_scans > 0 else 100.0

    # Total soil tests, policies, and claims
    soil_res = await db.execute(select(func.count(SoilReport.id)))
    total_soil_reports = soil_res.scalar() or 0

    policies_res = await db.execute(select(func.count(InsurancePolicy.id)))
    total_policies = policies_res.scalar() or 0

    claims_res = await db.execute(select(func.count(Claim.id)))
    total_claims = claims_res.scalar() or 0

    return _ok({
        "total_farmers": total_farmers,
        "total_farms": total_farms,
        "total_acreage_ha": total_acreage_ha,
        "crop_distribution": crop_counts,
        "total_scans": total_scans,
        "total_soil_reports": total_soil_reports,
        "total_policies": total_policies,
        "total_claims": total_claims,
        "active_sentinel_passes": max(total_farms, 1),
        "ai_diagnostics_healthy_pct": ai_healthy_pct,
        "system_status": "ONLINE"
    })

@router.get("/farmers")
async def get_farmers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    stmt = (
        select(User)
        .where(User.role == UserRole.FARMER)
        .options(selectinload(User.farms))
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    farmers = result.scalars().all()
    
    return _ok([{
        "id": str(f.id),
        "phone": f.phone or "N/A",
        "email": f.email or "N/A",
        "name": f.name or f"Farmer {f.phone[-4:] if f.phone else 'User'}",
        "role": f.role.value,
        "avatar_url": f.avatar_url,
        "is_active": True,
        "created_at": f.created_at.isoformat() if f.created_at else datetime.utcnow().isoformat(),
        "farm_count": len(f.farms),
        "total_area_ha": round(sum((farm.area_m2 or 0) for farm in f.farms) / 10000.0, 2),
        "crops": list({farm.crop for farm in f.farms if farm.crop})
    } for f in farmers])

@router.get("/farmers/{farmer_id}/farms")
async def get_farmer_farms(
    farmer_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    stmt = select(Farm).where(Farm.user_id == f_uuid)
    result = await db.execute(stmt)
    farms = result.scalars().all()

    return _ok([{
        "id": str(f.id),
        "name": f.name,
        "crop": f.crop,
        "sowing_date": f.sowing_date.isoformat() if f.sowing_date else None,
        "area_m2": f.area_m2,
        "area_ha": round((f.area_m2 or 0) / 10000.0, 2),
        "status": f.status.value,
        "created_at": f.created_at.isoformat() if f.created_at else None
    } for f in farms])

@router.get("/farmers/{farmer_id}/overview")
async def get_farmer_overview(
    farmer_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    # 1. Farmer user
    farmer = await db.get(User, f_uuid)
    if not farmer:
        return _error("FARMER_NOT_FOUND", "Farmer not found", 404)

    # 2. Farms
    f_stmt = select(Farm).where(Farm.user_id == f_uuid).order_by(Farm.created_at.desc())
    f_res = await db.execute(f_stmt)
    farms = f_res.scalars().all()
    farm_ids = [farm.id for farm in farms]

    farm_name_map = {str(farm.id): farm.name for farm in farms}

    # 3. Soil Reports
    soil_reports = []
    if farm_ids:
        s_stmt = select(SoilReport).where(SoilReport.farm_id.in_(farm_ids)).order_by(SoilReport.created_at.desc())
        s_res = await db.execute(s_stmt)
        soil_reports = s_res.scalars().all()

    # 4. Leaf Scans (AIAssessment with type CROP_HEALTH)
    assessments_stmt = (
        select(AIAssessment)
        .where(AIAssessment.type == AssessmentType.CROP_HEALTH)
        .order_by(AIAssessment.created_at.desc())
    )
    a_res = await db.execute(assessments_stmt)
    all_scans = a_res.scalars().all()

    farmer_scans = []
    for scan in all_scans:
        p = scan.payload or {}
        matches_user = str(p.get("user_id", "")) == str(farmer_id)
        matches_farm = (scan.farm_id in farm_ids) if (scan.farm_id and farm_ids) else False
        if matches_user or matches_farm:
            farmer_scans.append({
                "id": str(scan.id),
                "created_at": scan.created_at.isoformat() if scan.created_at else None,
                "confidence": scan.confidence,
                "disease": p.get("disease") or p.get("diagnosis") or "Healthy Leaf",
                "severity": p.get("severity") or "LOW",
                "crop": p.get("crop") or "Crop",
                "growth_stage": p.get("growth_stage") or "vegetative",
                "recommendations": p.get("recommendations") or [],
                "image_data_uri": p.get("image_data_uri") or "",
                "farm_name": p.get("farm_name") or (farm_name_map.get(str(scan.farm_id)) if scan.farm_id else "Field Scan")
            })

    # 5. Claims submitted by this farmer
    claims_stmt = select(Claim).where(Claim.user_id == f_uuid).order_by(Claim.created_at.desc())
    c_res = await db.execute(claims_stmt)
    claims = c_res.scalars().all()

    # 6. Policies held by this farmer
    policies_stmt = select(InsurancePolicy).where(InsurancePolicy.user_id == f_uuid).order_by(InsurancePolicy.created_at.desc())
    p_res = await db.execute(policies_stmt)
    policies = p_res.scalars().all()

    return _ok({
        "farmer": {
            "id": str(farmer.id),
            "name": farmer.name or f"Farmer {farmer.phone[-4:] if farmer.phone else ''}",
            "phone": farmer.phone or "N/A",
            "email": farmer.email or "N/A",
            "role": farmer.role.value,
            "avatar_url": farmer.avatar_url,
            "created_at": farmer.created_at.isoformat() if farmer.created_at else None
        },
        "farms": [{
            "id": str(f.id),
            "name": f.name,
            "khasra_number": getattr(f, "khasra_number", None),
            "crop": f.crop or "Unsown",
            "sowing_date": f.sowing_date.isoformat() if f.sowing_date else None,
            "soil_type": getattr(f, "soil_type", None) or "Medium Black (Loam)",
            "irrigation_type": getattr(f, "irrigation_type", None) or "Borewell / Tube Well",
            "area_m2": f.area_m2,
            "area_ha": round((f.area_m2 or 0) / 10000.0, 2),
            "area_acre": round((f.area_m2 or 0) / 4046.856, 2),
            "status": f.status.value,
            "created_at": f.created_at.isoformat() if f.created_at else None
        } for f in farms],
        "scans": farmer_scans,
        "soil_reports": [{
            "id": str(s.id),
            "farm_id": str(s.farm_id),
            "farm_name": farm_name_map.get(str(s.farm_id), "Main Plot"),
            "n": s.n,
            "p": s.p,
            "k": s.k,
            "ph": s.ph,
            "confidence": s.confidence,
            "created_at": s.created_at.isoformat() if s.created_at else None
        } for s in soil_reports],
        "claims": [{
            "id": str(c.id),
            "farm_id": str(c.farm_id) if c.farm_id else None,
            "farm_name": farm_name_map.get(str(c.farm_id), "Farm Plot") if c.farm_id else "All Fields",
            "event_type": c.event_type.value if hasattr(c.event_type, 'value') else str(c.event_type),
            "description": c.description,
            "damage_pct": c.damage_pct,
            "ai_confidence": c.ai_confidence,
            "status": c.status.value if hasattr(c.status, 'value') else str(c.status),
            "created_at": c.created_at.isoformat() if c.created_at else None
        } for c in claims],
        "policies": [{
            "id": str(pol.id),
            "farm_id": str(pol.farm_id) if pol.farm_id else None,
            "farm_name": farm_name_map.get(str(pol.farm_id), "Farm Plot") if pol.farm_id else "Insured Farm",
            "premium": pol.premium,
            "sum_insured": pol.sum_insured,
            "status": pol.status.value if hasattr(pol.status, 'value') else str(pol.status),
            "created_at": pol.created_at.isoformat() if pol.created_at else None
        } for pol in policies]
    })

@router.post("/alerts/broadcast")
async def broadcast_alert(
    req: BroadcastAlertRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    # Fetch all registered farmers
    farmers_res = await db.execute(select(User).where(User.role == UserRole.FARMER))
    farmers = farmers_res.scalars().all()

    created_count = 0
    for f in farmers:
        notif = Notification(
            user_id=f.id,
            type=NotificationType.WEATHER_ALERT if req.severity in ("critical", "warning") else NotificationType.RISK_ALERT,
            message=f"[{req.title}] {req.message}"
        )
        db.add(notif)
        created_count += 1

    await db.commit()
    return _ok({
        "broadcast_success": True,
        "recipients_count": created_count,
        "title": req.title,
        "timestamp": datetime.utcnow().isoformat()
    })
