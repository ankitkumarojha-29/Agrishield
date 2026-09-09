import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.session import get_db
from db.models import User, UserRole
from api.auth import get_admin_user

router = APIRouter()

def _ok(data: dict):
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.utcnow().isoformat()},
        "error": None
    }

@router.get("/farmers")
async def get_farmers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    # Fetch users with role FARMER
    stmt = select(User).where(User.role == UserRole.FARMER).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    farmers = result.scalars().all()
    
    return _ok([{
        "id": str(f.id),
        "phone": f.phone,
        "email": f.email,
        "name": f.name,
        "role": f.role.value,
        "is_active": True,
        "created_at": f.created_at.isoformat()
    } for f in farmers])
