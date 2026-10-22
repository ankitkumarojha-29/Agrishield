from fastapi import APIRouter, Depends
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update

from db.session import get_db
from db.models import Notification, User, UserRole, NotificationType
from api.auth import get_current_user, _ok, _error

logger = logging.getLogger(__name__)

router = APIRouter()


TYPE_FRIENDLY_TITLES = {
    "POLICY_STATUS": "📋 खाता व योजना स्थिति (Account & Policy)",
    "CLAIM_STATUS": "📑 दावा स्थिति (Claim Status)",
    "WEATHER_ALERT": "🌦️ मौसम अलर्ट (Weather Alert)",
    "RISK_ALERT": "⚠️ फसल जोखिम चेतावनी (Crop Risk Alert)",
    "SYSTEM_ALERT": "🔔 सिस्टम सूचना (System Notice)",
}


def _parse_notification(n: Notification) -> dict:
    """Helper to parse raw notification message into rich bilingual structure."""
    raw_msg = (n.message or "").strip()
    n_type_raw = n.type.value if hasattr(n.type, "value") else str(n.type or "")
    
    title = TYPE_FRIENDLY_TITLES.get(n_type_raw, "🔔 कृषि सूचना (Agri Notice)")
    body = raw_msg
    
    # Strip any literal raw prefix like "POLICY_STATUS: " or "SYSTEM_ALERT: "
    for prefix in ["POLICY_STATUS:", "policy_status:", "SYSTEM_ALERT:", "WEATHER_ALERT:", "RISK_ALERT:"]:
        if body.startswith(prefix):
            body = body[len(prefix):].strip()

    if ": " in body:
        parts = body.split(": ", 1)
        # Only treat before colon as title if it is not an ugly uppercase enum
        first_part = parts[0].strip()
        if first_part.upper() not in TYPE_FRIENDLY_TITLES:
            title = first_part
            body = parts[1].strip()

    is_welcome = "welcome" in raw_msg.lower() or "स्वागत" in raw_msg

    # Determine severity
    severity = "advisory" if is_welcome else "warning"
    if any(k in title for k in ["बाढ़", "Flood", "चक्रवात", "Cyclone", "पाला", "Frost", "गंभीर", "Critical", "रतुआ", "Yellow Rust"]):
        severity = "critical"
    elif any(k in title for k in ["सिंचाई", "Irrigation", "गर्मी", "Heat", "हवा", "Wind"]):
        severity = "warning"
    elif any(k in title for k in ["रिपोर्ट", "Report", "पंजीकरण", "Registered", "अनुरोध", "Request", "दावा", "Claim", "स्वागत", "Welcome"]):
        severity = "advisory"

    # Determine category
    category = "system" if is_welcome else "weather"
    if any(k in title for k in ["सिंचाई", "Irrigation", "नमी", "Moisture"]):
        category = "irrigation"
    elif any(k in title for k in ["कीट", "फफूंद", "Disease", "रतुआ", "Rust", "NDVI"]):
        category = "disease"
    elif any(k in title for k in ["पंजीकरण", "व्यवस्थापक", "Admin", "दावा", "Claim", "रिपोर्ट", "खाता", "Account", "स्वागत", "Welcome"]):
        category = "system"

    # Friendly bilingual action and risk texts
    if is_welcome:
        title = "🎉 स्वागत (Welcome)"
        threat_hi = body
        threat_en = "Your AgriShield farmer identity and credentials are verified."
        action_hi = "अपने खेत (GPS Boundaries) जोड़ें और वास्तविक समय सेटेलाइट निगरानी शुरू करें।"
        action_en = "Add your farm boundary to begin real-time satellite crop health monitoring."
    else:
        threat_hi = body
        action_hi = "कृषि व मौसम सलाह अनुसार सावधानी बरतें।"
        action_markers = ["कदम:", "करें:", "सलाह:", "करें।", "रखें।", "चलाएं।"]
        for marker in action_markers:
            if marker in body:
                parts = body.split(marker, 1)
                threat_hi = parts[0] + (marker if not marker.endswith(("।", ":")) else "")
                action_hi = parts[1].strip()
                break
        clean_title = title.replace("POLICY_STATUS", "योजना स्थिति").replace("policy_status", "")
        threat_en = f"Agricultural advisory update: {clean_title}"
        action_en = "Follow the specified agronomic advisory guidelines."

    return {
        "id": str(n.id),
        "type": n_type_raw,
        "title": title,
        "message": body,
        "raw_message": raw_msg,
        "threat_hi": threat_hi,
        "threat_en": threat_en,
        "action_hi": action_hi,
        "action_en": action_en,
        "severity": severity,
        "category": category,
        "ref_id": str(n.ref_id) if n.ref_id else None,
        "is_read": n.read,
        "read": n.read,
        "created_at": (n.created_at.isoformat() + "Z") if n.created_at and not n.created_at.isoformat().endswith("Z") and "+" not in n.created_at.isoformat() else (n.created_at.isoformat() if n.created_at else None),
    }


@router.get("")
async def list_notifications(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return _ok([_parse_notification(n) for n in notifications])


@router.post("/scan")
async def scan_farms_and_refresh(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    On-demand re-scan for current farmer's registered farms.
    Forces an immediate evaluation and generates fresh advisory notifications.
    """
    try:
        from services.farm_monitor_service import auto_monitor_farmer_farms
        new_alerts = await auto_monitor_farmer_farms(current_user.id, db, force_recheck=True)
        return _ok({
            "scanned": True,
            "new_alerts_generated": len(new_alerts),
            "message": f"{len(new_alerts)} ताज़ा अलर्ट/रिपोर्ट आपके खेतों के लिए उत्पन्न की गईं।"
        })
    except Exception as e:
        logger.error("Failed to run on-demand farm scan: %s", e)
        return _error("SCAN_FAILED", f"Error scanning farms: {str(e)}", 500)


@router.post("/{id}/read")
async def mark_notification_read(
    id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        notif_uuid = uuid.UUID(id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")
        
    notif = await db.get(Notification, notif_uuid)
    if not notif:
        return _error("NOT_FOUND", "Notification not found", 404)
        
    if notif.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed", 403)
        
    notif.read = True
    await db.commit()
    
    return _ok({"id": id, "is_read": True})


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks all notifications for current user as read atomically."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read == False)
        .values(read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    marked_count = res.rowcount if hasattr(res, "rowcount") and res.rowcount is not None else 0
    return _ok({"marked_count": marked_count})


@router.delete("/{id}")
async def delete_notification(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes/dismisses an individual notification."""
    try:
        notif_uuid = uuid.UUID(id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")

    notif = await db.get(Notification, notif_uuid)
    if not notif:
        return _error("NOT_FOUND", "Notification not found", 404)

    if notif.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed", 403)

    await db.delete(notif)
    await db.commit()
    return _ok({"id": id, "deleted": True})


@router.delete("")
@router.post("/clear")
async def clear_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clears all notifications for the current user so they can clean up their tray."""
    stmt = delete(Notification).where(Notification.user_id == current_user.id)
    res = await db.execute(stmt)
    await db.commit()
    return _ok({"cleared": True, "message": "All notifications cleaned up successfully."})
