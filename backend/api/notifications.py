from fastapi import APIRouter, Depends
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.session import get_db
from db.models import Notification, User
from api.auth import get_current_user, _ok, _error

router = APIRouter()

@router.get("")
async def list_notifications(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    data = []
    for n in notifications:
        data.append({
            "id": str(n.id),
            "title": n.type.value if hasattr(n.type, "value") else n.type,
            "message": n.message,
            "is_read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
        
    return _ok(data)

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
