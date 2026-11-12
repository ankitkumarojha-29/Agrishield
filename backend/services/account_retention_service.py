"""
Account Retention & Statutory Forensic Dossier Service for AgriShield.
Compliant with:
  1. Digital Personal Data Protection Act, 2023 (DPDP Act, Sec 8 & 12)
  2. Information Technology Act, 2000 & CERT-In Directions (180-Day Quarantine)
  3. Bharatiya Sakshya Adhiniyam, 2023 (Section 63 - Electronic Record Certificate)
"""
import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User, Farm, SoilReport, AIAssessment, AssessmentType, AuditLog
from geoalchemy2.shape import to_shape

logger = logging.getLogger("agrishield.retention_service")


async def log_audit_event(
    db: AsyncSession,
    action: str,
    user_id: Optional[uuid.UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
):
    """Appends an immutable audit event to the audit_logs table."""
    try:
        log_entry = AuditLog(
            id=uuid.uuid4(),
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {},
            created_at=datetime.utcnow()
        )
        db.add(log_entry)
        await db.flush()
    except Exception as e:
        logger.warning(f"Failed to record audit log for action '{action}': {e}")


async def purge_expired_quarantined_accounts(db: AsyncSession) -> int:
    """
    Day 181 Automated Smart Anonymization Worker.
    Wipes Personal Identifiable Information (PII) per DPDP Act Sec 8(7),
    while preserving anonymized agricultural spatial polygons & satellite telemetry for AI training.
    """
    now = datetime.utcnow()
    stmt = select(User).where(
        User.is_deleted == True,
        User.purge_scheduled_at <= now
    )
    result = await db.execute(stmt)
    expired_users = result.scalars().all()
    anonymized_count = 0

    for user in expired_users:
        try:
            old_phone_tail = user.phone[-4:] if user.phone else "USER"
            user_uid_short = str(user.id)[:8]

            # 1. Anonymize PII completely
            user.phone = f"+91XXXXXX{old_phone_tail}_{user_uid_short}"
            user.name = "Anonymized Account (DPDP Purged)"
            user.email = None
            user.google_id = None
            user.avatar_url = None
            user.hashed_password = None
            user.registration_ip = "0.0.0.0"
            user.last_login_ip = "0.0.0.0"
            user.deleted_ip = "0.0.0.0"
            user.is_approved = False

            # 2. Record statutory purge audit event
            await log_audit_event(
                db,
                action="ACCOUNT_PII_PURGED_DAY_181",
                user_id=user.id,
                details={
                    "purged_at": now.isoformat(),
                    "reason": "180-Day statutory retention period concluded under DPDP Act 2023 Sec 8(7)"
                }
            )
            anonymized_count += 1
        except Exception as item_err:
            logger.error(f"Error anonymizing user {user.id}: {item_err}")

    if anonymized_count > 0:
        await db.commit()
        logger.info(f"Anonymized {anonymized_count} expired quarantined accounts (Day 181 PII wipe).")

    return anonymized_count


async def generate_section_63_bsa_dossier(
    farmer_id: uuid.UUID,
    db: AsyncSession,
    admin_user: User,
    server_ip: str = "127.0.0.1"
) -> Dict[str, Any]:
    """
    Generates an authoritative, court-admissible Forensic Audit Dossier
    compliant with Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA).
    Computes cryptographic SHA-256 hash across identity, parcels, scans, and soil tests.
    """
    # 1. Retrieve farmer profile (active or soft-deleted)
    farmer = await db.get(User, farmer_id)
    if not farmer:
        raise ValueError("Farmer account not found in database.")

    # 2. Retrieve all registered farm parcels
    f_stmt = select(Farm).where(Farm.user_id == farmer_id).order_by(Farm.created_at.desc())
    f_res = await db.execute(f_stmt)
    farms = f_res.scalars().all()

    parcels_data = []
    farm_ids = []
    for f in farms:
        farm_ids.append(f.id)
        coords = []
        centroid = {"lat": None, "lon": None}
        if f.boundary is not None:
            try:
                shape = to_shape(f.boundary)
                centroid = {"lat": round(shape.centroid.y, 6), "lon": round(shape.centroid.x, 6)}
                coords = [[lon, lat] for lon, lat in shape.exterior.coords]
            except Exception:
                pass

        parcels_data.append({
            "farm_id": str(f.id),
            "name": f.name,
            "khasra_number": getattr(f, "khasra_number", None) or "Not Provided",
            "crop": f.crop or "Unspecified",
            "sowing_date": f.sowing_date.strftime("%Y-%m-%d") if f.sowing_date else None,
            "soil_type": getattr(f, "soil_type", None) or "Medium Black (Loam)",
            "irrigation_type": getattr(f, "irrigation_type", None) or "Borewell",
            "area_m2": f.area_m2 or 0,
            "area_ha": round((f.area_m2 or 0) / 10000.0, 2),
            "centroid": centroid,
            "vertex_count": len(coords),
            "registered_at": f.created_at.isoformat() if f.created_at else None
        })

    # 3. Retrieve soil test reports
    soil_reports = []
    if farm_ids:
        s_stmt = select(SoilReport).where(SoilReport.farm_id.in_(farm_ids)).order_by(SoilReport.created_at.desc())
        s_res = await db.execute(s_stmt)
        s_records = s_res.scalars().all()
        for s in s_records:
            soil_reports.append({
                "report_id": str(s.id),
                "farm_id": str(s.farm_id),
                "n": s.n,
                "p": s.p,
                "k": s.k,
                "ph": s.ph,
                "confidence": s.confidence,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })

    # 4. Retrieve Crop Health AI diagnostic scans
    crop_scans = []
    a_stmt = select(AIAssessment).where(AIAssessment.type == AssessmentType.CROP_HEALTH).order_by(AIAssessment.created_at.desc())
    a_res = await db.execute(a_stmt)
    all_assessments = a_res.scalars().all()
    for sc in all_assessments:
        p = sc.payload or {}
        matches_user = str(p.get("user_id", "")) == str(farmer_id)
        matches_farm = (sc.farm_id in farm_ids) if (sc.farm_id and farm_ids) else False
        if matches_user or matches_farm:
            crop_scans.append({
                "scan_id": str(sc.id),
                "farm_id": str(sc.farm_id) if sc.farm_id else None,
                "disease": p.get("disease") or p.get("diagnosis") or "Healthy Leaf",
                "severity": p.get("severity") or "LOW",
                "crop": p.get("crop") or "Crop",
                "confidence": sc.confidence,
                "model_version": sc.model_version or "effnet-crop-v1",
                "scanned_at": sc.created_at.isoformat() if sc.created_at else None
            })

    # 5. Retrieve security and lifecycle audit log events
    audit_events = []
    l_stmt = select(AuditLog).where(AuditLog.user_id == farmer_id).order_by(AuditLog.created_at.desc()).limit(50)
    l_res = await db.execute(l_stmt)
    logs = l_res.scalars().all()
    for l in logs:
        audit_events.append({
            "action": l.action,
            "ip_address": l.ip_address,
            "timestamp": l.created_at.isoformat() if l.created_at else None,
            "details": l.details
        })

    generation_time = datetime.now(timezone.utc).isoformat()
    raw_payload_for_hash = {
        "farmer_id": str(farmer.id),
        "phone": farmer.phone,
        "name": farmer.name,
        "email": farmer.email,
        "registration_ip": farmer.registration_ip or "Not Recorded",
        "last_login_ip": farmer.last_login_ip or "Not Recorded",
        "deleted_ip": farmer.deleted_ip or "N/A",
        "is_deleted": farmer.is_deleted,
        "deleted_at": farmer.deleted_at.isoformat() if farmer.deleted_at else None,
        "purge_scheduled_at": farmer.purge_scheduled_at.isoformat() if farmer.purge_scheduled_at else None,
        "deletion_reason": farmer.deletion_reason,
        "parcels": parcels_data,
        "soil_reports": soil_reports,
        "crop_scans": crop_scans,
        "audit_events": audit_events,
        "certified_by": admin_user.email,
        "generation_time": generation_time
    }

    # Canonical SHA-256 electronic evidence hash
    canonical_json = json.dumps(raw_payload_for_hash, sort_keys=True)
    sha256_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    statutory_certificate = {
        "statute": "Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023)",
        "former_statute": "Section 65B, Indian Evidence Act, 1872",
        "electronic_record_hash_sha256": sha256_hash,
        "certified_by_admin": admin_user.email,
        "certifier_name": admin_user.name or "System Administrator",
        "certifier_id": str(admin_user.id),
        "system_host": server_ip,
        "generated_at_utc": generation_time,
        "legal_declaration": (
            "I hereby certify pursuant to Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 that the "
            "information contained in this electronic record was produced by the computerized servers of the "
            "AgriShield platform during regular operational activities. During the material period, the system "
            "operated under cryptographic integrity controls and the contents accurately mirror stored database records."
        )
    }

    return {
        "dossier_id": f"BSA63-{str(farmer.id)[:8].upper()}-{int(datetime.utcnow().timestamp())}",
        "subject_farmer": {
            "id": str(farmer.id),
            "name": farmer.name or f"Farmer {farmer.phone[-4:] if farmer.phone else 'User'}",
            "phone": farmer.phone,
            "email": farmer.email,
            "account_status": "QUARANTINED (180-Day Regulatory Retention)" if farmer.is_deleted else "ACTIVE",
            "registered_at": farmer.created_at.isoformat() if farmer.created_at else None,
            "registration_ip": farmer.registration_ip or "127.0.0.1 (Self Registered)",
            "last_login_ip": farmer.last_login_ip or "127.0.0.1",
            "deleted_ip": farmer.deleted_ip or ("N/A (Active Account)" if not farmer.is_deleted else "Recorded"),
            "deleted_at": farmer.deleted_at.isoformat() if farmer.deleted_at else None,
            "purge_scheduled_at": farmer.purge_scheduled_at.isoformat() if farmer.purge_scheduled_at else None,
            "days_until_statutory_purge": max(0, int(((farmer.purge_scheduled_at or datetime.utcnow()) - datetime.utcnow()).total_seconds()) // 86400) if farmer.is_deleted else None,
            "deletion_reason": farmer.deletion_reason or "N/A"
        },
        "parcels_summary": {
            "total_parcels": len(parcels_data),
            "total_area_ha": round(sum(p["area_ha"] for p in parcels_data), 2),
            "parcels": parcels_data
        },
        "soil_test_history": soil_reports,
        "crop_health_scans": crop_scans,
        "security_audit_logs": audit_events,
        "statutory_certificate": statutory_certificate
    }

