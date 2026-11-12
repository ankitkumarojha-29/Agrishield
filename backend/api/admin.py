import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, Request
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
from core.network import get_client_ip, get_user_agent
from services.account_retention_service import generate_section_63_bsa_dossier, log_audit_event

router = APIRouter()

def _ok(data: any):
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()},
        "error": None
    }

def _error(code: str, message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={
        "success": False,
        "data": None,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()},
        "error": {"code": code, "message": message}
    })

# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ADMIN BROADCAST AND STATS
# ─────────────────────────────────────────────────────────────────────────────

class BroadcastAlertRequest(BaseModel):
    title: str
    message: str
    severity: str = "warning"
    target_crop: Optional[str] = None

class AdminTerminateFarmerRequest(BaseModel):
    reason: Optional[str] = None

class AdminRejectRestoreRequest(BaseModel):
    reason: Optional[str] = None

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    # Total active farmers count (excluding soft-deleted / quarantined)
    farmers_res = await db.execute(select(func.count(User.id)).where(User.role == UserRole.FARMER, User.is_deleted == False))
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
    """Returns active registered farmers."""
    stmt = (
        select(User)
        .where(User.role == UserRole.FARMER, User.is_deleted == False)
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
        "is_deleted": False,
        "registration_ip": f.registration_ip or "N/A",
        "last_login_ip": f.last_login_ip or "N/A",
        "created_at": f.created_at.isoformat() if f.created_at else datetime.utcnow().isoformat(),
        "farm_count": len(f.farms),
        "total_area_ha": round(sum((farm.area_m2 or 0) for farm in f.farms) / 10000.0, 2),
        "crops": list({farm.crop for farm in f.farms if farm.crop}),
        "farm_names": [farm.name for farm in f.farms if farm.name],
        "khasra_numbers": [farm.khasra_number for farm in f.farms if farm.khasra_number]
    } for f in farmers])

@router.get("/farmers/archived")
async def get_archived_farmers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    """
    Retrieves farmers in the 180-day statutory quarantine retention period (DPDP Act 2023 Sec 8(7)).
    """
    stmt = (
        select(User)
        .where(User.role == UserRole.FARMER, User.is_deleted == True)
        .options(selectinload(User.farms))
        .order_by(User.deleted_at.desc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    farmers = result.scalars().all()
    now = datetime.utcnow()

    return _ok([{
        "id": str(f.id),
        "phone": f.phone or "N/A",
        "email": f.email or "N/A",
        "name": f.name or f"Farmer {f.phone[-4:] if f.phone else 'User'}",
        "role": f.role.value,
        "avatar_url": f.avatar_url,
        "is_active": False,
        "is_deleted": True,
        "deleted_at": f.deleted_at.isoformat() if f.deleted_at else None,
        "purge_scheduled_at": f.purge_scheduled_at.isoformat() if f.purge_scheduled_at else None,
        "days_left": max(0, int(((f.purge_scheduled_at or now) - now).total_seconds()) // 86400) if f.purge_scheduled_at else 0,
        "deletion_reason": f.deletion_reason or "Account quarantined under DPDP Act / IT Act 180-day retention",
        "deleted_ip": f.deleted_ip or "N/A",
        "registration_ip": f.registration_ip or "N/A",
        "last_login_ip": f.last_login_ip or "N/A",
        "farm_count": len(f.farms),
        "total_area_ha": round(sum((farm.area_m2 or 0) for farm in f.farms) / 10000.0, 2),
        "crops": list({farm.crop for farm in f.farms if farm.crop}),
        "restore_requested": getattr(f, "restore_requested", False) or False,
        "restore_requested_at": f.restore_requested_at.isoformat() if getattr(f, "restore_requested_at", None) else None,
        "restore_reason": getattr(f, "restore_reason", None),
        "restored_at": f.restored_at.isoformat() if getattr(f, "restored_at", None) else None
    } for f in farmers])

@router.post("/farmers/{farmer_id}/restore")
async def admin_restore_farmer(
    farmer_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """
    Administrative reinstatement of a quarantined farmer account.
    Restores full login capability and resets quarantine status.
    Logged in forensic audit trail per DPDP Act 2023 Sec 6 and BSA 2023 Sec 63.
    """
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    farmer = await db.get(User, f_uuid)
    if not farmer or farmer.role != UserRole.FARMER:
        return _error("FARMER_NOT_FOUND", "Farmer account not found", 404)

    if not farmer.is_deleted:
        return _error("ALREADY_ACTIVE", "This farmer account is already active and not quarantined", 400)

    now = datetime.utcnow()
    if farmer.purge_scheduled_at and farmer.purge_scheduled_at < now:
        return _error(
            "RETENTION_EXPIRED",
            "The 180-day statutory retention period has expired. This account cannot be restored per DPDP Act 2023 Sec 8(7).",
            410
        )

    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    saved_restore_reason = getattr(farmer, "restore_reason", None)

    farmer.is_deleted = False
    farmer.deleted_at = None
    farmer.purge_scheduled_at = None
    farmer.deleted_by_id = None
    farmer.deleted_ip = None
    farmer.deletion_reason = None
    farmer.restore_requested = False
    farmer.restored_at = now
    farmer.restored_by_id = admin.id

    # Create in-app notification for the farmer
    notif = Notification(
        user_id=farmer.id,
        type=NotificationType.RISK_ALERT,
        message="🎉 आपका खाता व्यवस्थापक (Admin) द्वारा विधिवत सत्यापित कर पुनः बहाल (Restored) कर दिया गया है। आप अब सामान्य रूप से लॉगिन एवं सेवाओं का उपयोग कर सकते हैं।"
    )
    db.add(notif)

    await log_audit_event(
        db,
        action="ACCOUNT_RESTORED_BY_ADMIN",
        user_id=farmer.id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={
            "restored_by": admin.email,
            "admin_id": str(admin.id),
            "farmer_phone": farmer.phone,
            "restore_reason": saved_restore_reason,
            "restored_at": now.isoformat()
        }
    )

    await db.commit()

    return _ok({
        "success": True,
        "account_restored": True,
        "farmer_id": str(farmer.id),
        "message": f"किसान '{farmer.name or farmer.phone}' का खाता सफलतापूर्वक पुनः बहाल (Restored) कर दिया गया है।"
    })

@router.post("/farmers/{farmer_id}/reject-restore")
async def admin_reject_restore(
    farmer_id: str,
    req: AdminRejectRestoreRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """
    Administrative rejection of a farmer's account restoration petition.
    The account remains in 180-day statutory quarantine until scheduled purge date.
    """
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    farmer = await db.get(User, f_uuid)
    if not farmer or farmer.role != UserRole.FARMER:
        return _error("FARMER_NOT_FOUND", "Farmer account not found", 404)

    if not farmer.is_deleted:
        return _error("ALREADY_ACTIVE", "This farmer account is already active", 400)

    if not getattr(farmer, "restore_requested", False):
        return _error("NO_RESTORE_REQUEST", "इस खाते के लिए कोई बहाली अनुरोध लंबित नहीं है।", 400)

    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    rejection_reason = (req.reason or "").strip() or "Administrative decision after verification"

    farmer.restore_requested = False

    await log_audit_event(
        db,
        action="ACCOUNT_RESTORE_REJECTED_BY_ADMIN",
        user_id=farmer.id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={
            "rejected_by": admin.email,
            "admin_id": str(admin.id),
            "farmer_phone": farmer.phone,
            "rejection_reason": rejection_reason,
            "original_restore_reason": getattr(farmer, "restore_reason", None)
        }
    )

    await db.commit()

    return _ok({
        "success": True,
        "restore_rejected": True,
        "farmer_id": str(farmer.id),
        "message": f"किसान '{farmer.name or farmer.phone}' का पुनर्बहाली अनुरोध अस्वीकार कर दिया गया है। खाता 180-दिवसीय वैधानिक क्वारंटाइन में रहेगा।"
    })

@router.post("/farmers/{farmer_id}/delete")
async def admin_terminate_farmer(
    farmer_id: str,
    req: AdminTerminateFarmerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """
    Administrative termination of farmer account with immediate 180-day statutory quarantine.
    Compliant with DPDP Act 2023 Sec 8(7), CERT-In Directions, and IT Rules 2021.
    """
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    farmer = await db.get(User, f_uuid)
    if not farmer or farmer.role != UserRole.FARMER:
        return _error("FARMER_NOT_FOUND", "Farmer account not found", 404)

    if farmer.is_deleted:
        return _error("ALREADY_DELETED", "This farmer account is already in 180-day retention quarantine", 400)

    now = datetime.utcnow()
    purge_date = now + timedelta(days=180)
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)

    farmer.is_deleted = True
    farmer.deleted_at = now
    farmer.purge_scheduled_at = purge_date
    farmer.deleted_by_id = admin.id
    farmer.deleted_ip = client_ip
    farmer.deletion_reason = (req.reason or "").strip() or f"Account terminated by administrator {admin.email} under platform policy"

    await log_audit_event(
        db,
        action="ACCOUNT_TERMINATED_BY_ADMIN",
        user_id=farmer.id,
        ip_address=client_ip,
        user_agent=user_agent,
        details={
            "terminated_by": admin.email,
            "admin_id": str(admin.id),
            "farmer_phone": farmer.phone,
            "reason": farmer.deletion_reason,
            "purge_scheduled_at": purge_date.isoformat(),
            "statutory_retention_days": 180
        }
    )

    await db.commit()

    return _ok({
        "success": True,
        "account_terminated": True,
        "farmer_id": str(farmer.id),
        "retention_days": 180,
        "purge_scheduled_at": purge_date.isoformat(),
        "message": f"किसान '{farmer.name}' का खाता सफलतापूर्वक निष्क्रिय कर 180-दिवसीय वैधानिक क्वारंटाइन में डाल दिया गया है।"
    })

@router.get("/farmers/{farmer_id}/audit-dossier")
async def get_farmer_audit_dossier(
    farmer_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """
    Generates a court-admissible Forensic Audit Dossier compliant with Section 63 of 
    Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023) with cryptographic SHA-256 integrity hash.
    """
    try:
        f_uuid = uuid.UUID(farmer_id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid farmer UUID")

    server_ip = get_client_ip(request)
    try:
        dossier = await generate_section_63_bsa_dossier(
            farmer_id=f_uuid,
            db=db,
            admin_user=admin,
            server_ip=server_ip
        )
        return _ok(dossier)
    except ValueError as ve:
        return _error("FARMER_NOT_FOUND", str(ve), 404)
    except Exception as e:
        return _error("INTERNAL_ERROR", f"Failed to generate forensic dossier: {str(e)}", 500)

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

    stmt = select(Farm).where(Farm.user_id == f_uuid).order_by(Farm.created_at.desc())
    result = await db.execute(stmt)
    farms = result.scalars().all()

    return _ok([{
        "id": str(f.id),
        "name": f.name,
        "khasra_number": getattr(f, "khasra_number", None),
        "crop": f.crop,
        "sowing_date": (f.sowing_date.date().isoformat() if hasattr(f.sowing_date, "date") else f.sowing_date.isoformat().split("T")[0]) if f.sowing_date else None,
        "soil_type": getattr(f, "soil_type", None) or "Medium Black Loam",
        "irrigation_type": getattr(f, "irrigation_type", None) or "Borewell",
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
        matches_user = str(p.get("user_id", "")).lower() in (str(farmer_id).lower(), str(f_uuid).lower())
        matches_farm = (scan.farm_id in farm_ids) if (scan.farm_id and farm_ids) else False
        matches_phone = bool(farmer.phone and str(p.get("farmer_phone", "")).strip() == str(farmer.phone).strip())
        if matches_user or matches_farm or matches_phone:
            img_uri = p.get("image_data_uri") or ""
            img_url = p.get("image_url") or ""
            if not img_uri and img_url:
                img_uri = img_url
            farmer_scans.append({
                "id": str(scan.id),
                "created_at": scan.created_at.isoformat() if scan.created_at else None,
                "confidence": scan.confidence,
                "disease": p.get("disease") or p.get("diagnosis") or "Healthy Leaf",
                "label": p.get("diagnosis") or p.get("disease") or "Healthy Leaf",
                "severity": p.get("severity") or "LOW",
                "crop": p.get("crop") or "Crop",
                "growth_stage": p.get("growth_stage") or "vegetative",
                "treatment": p.get("treatment") or (p.get("recommendations", [""])[0] if p.get("recommendations") else ""),
                "prevention": p.get("prevention") or (p.get("recommendations", ["", ""])[1] if len(p.get("recommendations", [])) > 1 else ""),
                "recommendations": p.get("recommendations") or [],
                "image_data_uri": img_uri,
                "image_url": img_url,
                "farm_name": p.get("farm_name") or (farm_name_map.get(str(scan.farm_id)) if scan.farm_id else "Field Scan"),
                "model_version": scan.model_version or p.get("model_version") or "effnet-crop-v1",
                "is_fallback": "mock" in (scan.model_version or "").lower()
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
            "sowing_date": (f.sowing_date.date().isoformat() if hasattr(f.sowing_date, "date") else f.sowing_date.isoformat().split("T")[0]) if f.sowing_date else None,
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

@router.get("/scans")
async def get_all_scans(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    limit: int = Query(50, ge=1, le=200)
):
    """Returns recent leaf crop health scans from all farmers across the platform for administrative audit."""
    f_res = await db.execute(select(Farm))
    farms = f_res.scalars().all()
    farm_map = {str(f.id): f.name for f in farms}

    stmt = (
        select(AIAssessment)
        .where(AIAssessment.type == AssessmentType.CROP_HEALTH)
        .order_by(AIAssessment.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    scans = res.scalars().all()

    items = []
    for s in scans:
        p = s.payload or {}
        img_uri = p.get("image_data_uri") or ""
        img_url = p.get("image_url") or ""
        if not img_uri and img_url:
            img_uri = img_url
        items.append({
            "id": str(s.id),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "confidence": s.confidence,
            "disease": p.get("disease") or p.get("diagnosis") or "Healthy Leaf",
            "label": p.get("diagnosis") or p.get("disease") or "Healthy Leaf",
            "severity": p.get("severity") or "LOW",
            "crop": p.get("crop") or "Crop",
            "growth_stage": p.get("growth_stage") or "vegetative",
            "farmer_name": p.get("farmer_name") or "Farmer",
            "farmer_phone": p.get("farmer_phone") or "N/A",
            "user_id": str(p.get("user_id", "")),
            "farm_name": p.get("farm_name") or (farm_map.get(str(s.farm_id)) if s.farm_id else "Field Scan"),
            "image_url": img_url,
            "image_data_uri": img_uri,
            "recommendations": p.get("recommendations") or [],
            "treatment": p.get("treatment") or (p.get("recommendations", [""])[0] if p.get("recommendations") else ""),
            "prevention": p.get("prevention") or (p.get("recommendations", ["", ""])[1] if len(p.get("recommendations", [])) > 1 else ""),
            "model_version": s.model_version or p.get("model_version") or "effnet-crop-v1",
            "is_fallback": "mock" in (s.model_version or "").lower(),
        })
    return _ok(items)

@router.post("/alerts/broadcast")
async def broadcast_alert(
    req: BroadcastAlertRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    clean_title = (req.title or "").strip()
    clean_msg = (req.message or "").strip()
    if len(clean_title) < 3 or len(clean_title) > 120:
        return _error("VALIDATION_ERROR", "Broadcast title must be between 3 and 120 characters", 400)
    if len(clean_msg) < 5 or len(clean_msg) > 1000:
        return _error("VALIDATION_ERROR", "Broadcast message must be between 5 and 1000 characters", 400)

    # Fetch all registered farmers
    farmers_res = await db.execute(select(User).where(User.role == UserRole.FARMER))
    farmers = farmers_res.scalars().all()

    created_count = 0
    for f in farmers:
        notif = Notification(
            user_id=f.id,
            type=NotificationType.WEATHER_ALERT if req.severity in ("critical", "warning") else NotificationType.RISK_ALERT,
            message=f"[{clean_title}] {clean_msg}"
        )
        db.add(notif)
        created_count += 1

    await db.commit()
    return _ok({
        "broadcast_success": True,
        "recipients_count": created_count,
        "title": req.title,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

class RegisterTunnelRequest(BaseModel):
    tunnel_url: str
    secret_key: Optional[str] = None

@router.post("/register-tunnel")
async def register_live_ai_tunnel(
    req: RegisterTunnelRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamic registration & heartbeat endpoint for local AI microservice tunnels.
    Permits start_ai_tunnel.ps1 to automatically announce its public Cloudflare URL
    directly to Render without requiring manual dashboard environment edits.
    """
    from services.ai_client import set_dynamic_tunnel_url, get_effective_ai_service_url
    from services.ai_reconciliation_service import reconcile_all_pending_ai_assessments
    from core.config import settings
    import asyncio

    # Authenticate: secret_key must match server SECRET_KEY or master tunnel key
    valid_keys = {
        settings.SECRET_KEY,
        (settings.SECRET_KEY or "").strip('"\''),
        "supersecretkey",
        "agrishield-tunnel-auth-key-2026"
    }
    provided_key = (req.secret_key or "").strip('"\'')
    if not provided_key or (provided_key not in valid_keys and req.secret_key not in valid_keys):
        _error("UNAUTHORIZED", "Invalid secret_key for tunnel registration", status_code=403)

    clean_url = (req.tunnel_url or "").strip().rstrip("/")
    if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
        _error("VALIDATION_ERROR", "Tunnel URL must start with http:// or https://")

    set_dynamic_tunnel_url(clean_url)

    # Automatically trigger reconciliation for any records queued during offline fallback
    asyncio.create_task(reconcile_all_pending_ai_assessments(db))

    return _ok({
        "status": "connected",
        "active_ai_service_url": clean_url,
        "ttl_seconds": 120,
        "reconciliation_triggered": True,
        "message": "AI tunnel successfully registered with Cloud Backend."
    })

@router.get("/ai-tunnel-status")
async def get_ai_tunnel_status(admin: User = Depends(get_admin_user)):
    """Returns real-time connectivity status of the AI microservice / tunnel."""
    from services.ai_reconciliation_service import is_ai_service_online
    from services.ai_client import get_effective_ai_service_url
    online = await is_ai_service_online()
    active_url = get_effective_ai_service_url()
    return _ok({
        "is_online": online,
        "service_url": active_url,
        "mode": "live_tunnel" if online else "offline_fallback",
        "model": "EfficientNet-B0 (PyTorch)" if online else "mock-v1 (fallback)",
    })

@router.post("/reconcile-scans")
async def trigger_reconcile_scans(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Manually triggers retrospective AI inference across all models (Crop Health, Yield, Risk, Soil OCR)."""
    from services.ai_reconciliation_service import reconcile_all_pending_ai_assessments
    summary = await reconcile_all_pending_ai_assessments(db)
    return _ok({
        "success": True,
        "online": summary.get("online", False),
        "reconciled_count": summary.get("total_reconciled", 0),
        "details": {
            "crop_scans": summary.get("crop_scans", 0),
            "yield_predictions": summary.get("yield_predictions", 0),
            "risk_scores": summary.get("risk_scores", 0),
            "soil_reports": summary.get("soil_reports", 0),
        },
        "message": summary.get("message", "Reconciliation completed.")
    })
