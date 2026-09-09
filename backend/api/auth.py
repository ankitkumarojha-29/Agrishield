import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.session import get_db
from db.models import User, UserRole
from core.security import create_access_token, verify_password, get_password_hash
from core.config import settings

router = APIRouter()

# --- Schema Definitions ---

class RegisterOrLoginRequest(BaseModel):
    phone: str
    name: str = None

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminRegisterRequest(BaseModel):
    email: str
    password: str
    name: str = None

class UpdateProfileRequest(BaseModel):
    name: str

# Helper to generate consistent envelopes
def _ok(data: dict):
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

async def get_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        _error("AUTH_REQUIRED", "Missing or invalid Authorization header", 401)
    
    token = authorization.split(" ")[1]
    from core.security import decode_access_token
    try:
        user_id_str = decode_access_token(token)
    except:
        _error("AUTH_REQUIRED", "Invalid token", 401)
        
    try:
        uid = uuid.UUID(user_id_str)
    except:
        _error("AUTH_REQUIRED", "Invalid user ID in token", 401)

    user = await db.get(User, uid)
    if not user:
        _error("AUTH_REQUIRED", "User not found", 401)
        
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        _error("FORBIDDEN", "Admin access required", 403)
    return current_user


# --- Endpoints ---

@router.post("/register-or-login")
async def register_or_login(req: RegisterOrLoginRequest, db: AsyncSession = Depends(get_db)):
    if not req.phone:
        _error("VALIDATION_ERROR", "Phone number is required")
        
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()
    
    is_new_user = False
    if not user:
        # Create new farmer
        farmer_name = req.name.strip() if req.name and req.name.strip() else (f"Farmer {req.phone[-4:]}" if len(req.phone) >= 4 else "Farmer")
        user = User(phone=req.phone, name=farmer_name, role=UserRole.FARMER)
        db.add(user)
        await db.flush()
        is_new_user = True
        
        # Create welcome notification
        from db.models import Notification, NotificationType
        welcome_notif = Notification(
            user_id=user.id,
            type=NotificationType.POLICY_STATUS,
            message=f"Welcome to AgriShield, {farmer_name}! Please add your farm to get started."
        )
        db.add(welcome_notif)
        await db.commit()
    else:
        # If existing user has no name and name is provided or empty, give valid name
        if req.name and req.name.strip():
            user.name = req.name.strip()
            await db.commit()
            await db.refresh(user)
        elif not user.name:
            user.name = f"Farmer {user.phone[-4:]}" if user.phone and len(user.phone) >= 4 else "Farmer"
            await db.commit()
            await db.refresh(user)
        
    user_id_str = str(user.id)
    access_token = create_access_token(user_id_str)
    
    return _ok({
        "user": {
            "id": user_id_str,
            "phone": user.phone,
            "name": user.name,
            "role": user.role.value
        },
        "access_token": access_token,
        "is_new_user": is_new_user
    })


@router.post("/login")
async def admin_login(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password:
        _error("AUTH_FAILED", "Invalid email or password", 401)
        
    if not verify_password(req.password, user.hashed_password):
        _error("AUTH_FAILED", "Invalid email or password", 401)
        
    access_token = create_access_token(str(user.id))
    return _ok({
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role.value
        },
        "access_token": access_token
    })


@router.post("/register")
async def admin_register(req: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.email or not req.password:
        _error("VALIDATION_ERROR", "Email and password are required")
        
    result = await db.execute(select(User).where(User.email == req.email))
    existing = result.scalar_one_or_none()
    if existing:
        _error("USER_EXISTS", "A user with this email already exists", 400)
        
    hashed = get_password_hash(req.password)
    user_name = req.name.strip() if req.name and req.name.strip() else req.email.split("@")[0]
    new_admin = User(
        email=req.email,
        name=user_name,
        hashed_password=hashed,
        role=UserRole.ADMIN
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    
    access_token = create_access_token(str(new_admin.id))
    return _ok({
        "user": {
            "id": str(new_admin.id),
            "email": new_admin.email,
            "name": new_admin.name,
            "role": new_admin.role.value
        },
        "access_token": access_token
    })


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not current_user.name:
        current_user.name = f"Farmer {current_user.phone[-4:]}" if current_user.phone and len(current_user.phone) >= 4 else "Farmer"
        await db.commit()
        await db.refresh(current_user)

    return _ok({
        "id": str(current_user.id),
        "phone": current_user.phone,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value
    })


@router.patch("/me")
async def update_me(req: UpdateProfileRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.name = req.name
    await db.commit()
    await db.refresh(current_user)
    return _ok({
        "id": str(current_user.id),
        "name": current_user.name
    })
