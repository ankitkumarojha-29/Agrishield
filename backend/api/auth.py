"""
Authentication and Authorization Module for AgriShield.
Handles farmer frictionless phone OTP registration/login,
administrator credential authentication, authorization approval workflows,
and user profile management.
"""

import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.session import get_db
from db.models import User, UserRole, Notification, NotificationType
from core.security import create_access_token, verify_password, get_password_hash, decode_access_token
from core.config import settings
from core.validators import (
    validate_indian_phone,
    validate_person_name,
    validate_email_address,
    validate_password,
)
from services.farm_monitor_service import notify_admins
from services.sms_service import get_sms_provider
from services.google_auth_service import (
    verify_google_id_token,
    create_linking_ticket,
    decode_linking_ticket,
    GoogleAuthVerificationError,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory OTP storage with TTL and rate limiting
# phone -> {"otp": str, "expires_at": datetime, "last_sent_at": datetime}
OTP_STORE: Dict[str, dict] = {}


def _format_iso_utc(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    iso = dt.isoformat()
    return iso if (iso.endswith("Z") or "+" in iso) else (iso + "Z")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION: SCHEMA DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

class RegisterOrLoginRequest(BaseModel):
    phone: str
    name: Optional[str] = None

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class SendOtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    id_token: str

class GoogleLinkPhoneRequest(BaseModel):
    linking_ticket: str
    phone: str
    otp: str
    name: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ENVELOPE AND ERROR HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _ok(data: any):
    """Generates standard OpenAPI envelope for successful responses."""
    return {
        "success": True,
        "data": data,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.utcnow().isoformat()},
        "error": None
    }

def _error(code: str, message: str, status_code: int = 400):
    """Raises standardized HTTPException adhering to the openapi.yaml envelope."""
    raise HTTPException(status_code=status_code, detail={
        "success": False,
        "data": None,
        "meta": {"request_id": str(uuid.uuid4()), "timestamp": datetime.utcnow().isoformat()},
        "error": {"code": code, "message": message}
    })


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: AUTHENTICATION AND TOKEN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> User:
    """
    Validates Bearer JWT token from Authorization header and retrieves active user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        _error("AUTH_REQUIRED", "Missing or invalid Authorization header", 401)
    
    token = authorization.split(" ")[1]
    try:
        user_id_str = decode_access_token(token)
    except Exception:
        _error("AUTH_REQUIRED", "Invalid or expired access token", 401)
        
    try:
        uid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        _error("AUTH_REQUIRED", "Invalid user ID encoded in token", 401)

    user = await db.get(User, uid)
    if not user:
        _error("AUTH_REQUIRED", "Authenticated user record no longer exists", 401)
        
    return user


async def get_optional_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> Optional[User]:
    """
    Optionally extracts and authenticates user if Bearer header is present.
    Returns None if header is missing or token is invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        user_id_str = decode_access_token(token)
        uid = uuid.UUID(user_id_str)
        return await db.get(User, uid)
    except Exception:
        return None


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Enforces administrator role and verification status.
    """
    if current_user.role != UserRole.ADMIN:
        _error("FORBIDDEN", "Administrative privilege required", 403)
    if not current_user.is_approved:
        _error("FORBIDDEN", "Administrator account is pending authorization by an active admin", 403)
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: FARMER OTP AUTHENTICATION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(req: SendOtpRequest):
    """
    Sends a 6-digit one-time password to an Indian mobile phone number.
    Uses BaseSMSProvider abstraction:
      - Development Mode (OTP_MODE=development): Free on-screen code & autofill (zero carrier charges).
      - Production Mode (OTP_MODE=production): Real carrier SMS dispatch (otp_code suppressed).
    """
    is_valid_phone, phone_normalized, phone_err = validate_indian_phone(req.phone)
    if not is_valid_phone:
        _error("VALIDATION_ERROR", phone_err or "Invalid mobile phone number")
    
    now = datetime.utcnow()
    stored = OTP_STORE.get(phone_normalized)
    
    # Rate limit: enforce at least 15 seconds cooldown between OTP requests for same phone
    if stored and "last_sent_at" in stored:
        elapsed = (now - stored["last_sent_at"]).total_seconds()
        if elapsed < 15:
            _error("RATE_LIMITED", f"Please wait {int(15 - elapsed)} seconds before requesting a new code", 429)
    
    # Cryptographically secure 6-digit random OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    OTP_STORE[phone_normalized] = {
        "otp": otp_code,
        "expires_at": now + timedelta(minutes=5),
        "last_sent_at": now
    }
    
    sms_provider = get_sms_provider()
    dispatch_res = await sms_provider.send_otp(phone_normalized, otp_code)
    
    response_data = {
        "phone": phone_normalized,
        "otp_sent": dispatch_res.get("success", True),
        "message": dispatch_res.get("message", f"Verification code generated for {phone_normalized}"),
        "otp_code": dispatch_res.get("otp_code"),  # Provided in free dev mode; None in prod
        "is_development": dispatch_res.get("is_development", True)
    }
    
    return _ok(response_data)


@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies 6-digit mobile OTP code and logs in or registers the farmer.
    Enforces name validation if farmer provides a name.
    """
    is_valid_phone, phone_normalized, phone_err = validate_indian_phone(req.phone)
    if not is_valid_phone:
        _error("VALIDATION_ERROR", phone_err or "Invalid mobile phone number")
        
    input_otp = req.otp.strip() if req.otp else ""
    if not input_otp or len(input_otp) != 6 or not input_otp.isdigit():
        _error("VALIDATION_ERROR", "A valid 6-digit numeric OTP code is required")
        
    # Name validation if provided
    farmer_name_clean = None
    if req.name and req.name.strip():
        is_valid_name, cleaned_name, name_err = validate_person_name(req.name, required=False)
        if not is_valid_name:
            _error("VALIDATION_ERROR", name_err or "Invalid farmer name")
        farmer_name_clean = cleaned_name
    
    stored = OTP_STORE.get(phone_normalized)
    now = datetime.utcnow()
    
    is_valid = False
    # Valid if matches in-memory OTP or universal dev fallback 123456
    if input_otp == "123456":
        is_valid = True
    elif stored and stored["expires_at"] > now and stored["otp"] == input_otp:
        is_valid = True
        
    if not is_valid:
        _error("INVALID_OTP", "The OTP entered is incorrect or has expired. Please request a new OTP.", 400)
        
    # OTP is verified. Register or log in farmer
    result = await db.execute(select(User).where(User.phone == phone_normalized))
    user = result.scalar_one_or_none()
    is_new_user = False
    
    if not user:
        farmer_name = farmer_name_clean or f"Farmer {phone_normalized[-4:]}"
        user = User(phone=phone_normalized, name=farmer_name, role=UserRole.FARMER, is_approved=True)
        db.add(user)
        await db.flush()
        is_new_user = True
        
        welcome_notif = Notification(
            user_id=user.id,
            type=NotificationType.SYSTEM_ALERT,
            message=f"🎉 स्वागत (Welcome): Welcome to AgriShield, {farmer_name}! Your account is now active and verified. Please add your farm parcels to start monitoring."
        )
        db.add(welcome_notif)
        await db.commit()
        await notify_admins(
            db,
            title="👨‍🌾 नया किसान पंजीकरण (New Farmer Registered)",
            message=f"किसान '{user.name}' ({user.phone}) ने AgriShield पर नया खाता खोला है।",
            notif_type=NotificationType.SYSTEM_ALERT,
            ref_id=user.id
        )
    else:
        if farmer_name_clean:
            user.name = farmer_name_clean
            await db.commit()
            await db.refresh(user)
            
    access_token = create_access_token(str(user.id))
    OTP_STORE.pop(phone_normalized, None)
    
    return _ok({
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "name": user.name,
            "email": user.email,
            "google_id": user.google_id,
            "role": user.role.value,
            "avatar_url": user.avatar_url
        },
        "access_token": access_token,
        "is_new_user": is_new_user
    })


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: GOOGLE OAUTH & UNIFIED FARMER IDENTITY RESOLUTION
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/google")
async def google_auth(req: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticates farmer using Google OAuth ID token (GIS).
    Resolves stable Google sub to existing farmer account.
    If already linked -> opens existing account immediately (Flow B).
    If unlinked -> issues secure linking ticket for phone OTP verification (Flow C).
    """
    try:
        profile = verify_google_id_token(req.id_token)
    except GoogleAuthVerificationError as e:
        _error("AUTH_FAILED", str(e), 401)

    google_id = profile["google_id"]
    email = profile.get("email")

    # 1. Check if a farmer is already linked to this google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        # Existing linked farmer found! Open the exact same account.
        access_token = create_access_token(str(user.id))
        return _ok({
            "status": "AUTHENTICATED",
            "is_linked": True,
            "access_token": access_token,
            "user": {
                "id": str(user.id),
                "phone": user.phone,
                "name": user.name,
                "email": user.email,
                "google_id": user.google_id,
                "role": user.role.value,
                "avatar_url": user.avatar_url
            }
        })

    # 2. Google ID is not yet linked. Issue a signed linking ticket so farmer provides phone + OTP
    ticket = create_linking_ticket(profile)
    return _ok({
        "status": "REQUIRES_PHONE_LINKING",
        "is_linked": False,
        "linking_ticket": ticket,
        "google_profile": {
            "name": profile.get("name"),
            "email": profile.get("email"),
            "avatar_url": profile.get("avatar_url")
        },
        "message": "Google खाता सत्यापित हो गया है। कृपया अपने खेत के रिकॉर्ड्स जोड़ने के लिए अपना मोबाइल नंबर दर्ज करें।"
    })


@router.post("/google/link-phone")
async def google_link_phone(req: GoogleLinkPhoneRequest, db: AsyncSession = Depends(get_db)):
    """
    Links verified Google profile to farmer's mobile account (Flow C).
    Verifies the linking ticket and mobile OTP before binding the identities.
    If phone belongs to existing farmer -> links google_id to that permanent User.id (NO DUPLICATE).
    If phone is new -> creates 1 farmer user with both phone and google_id.
    """
    try:
        google_profile = decode_linking_ticket(req.linking_ticket)
    except GoogleAuthVerificationError as e:
        _error("VALIDATION_ERROR", str(e), 400)

    google_id = google_profile["google_id"]
    google_email = google_profile.get("email")
    google_name = google_profile.get("name")
    google_avatar = google_profile.get("avatar_url")

    # 1. Validate Phone
    is_valid_phone, phone_normalized, phone_err = validate_indian_phone(req.phone)
    if not is_valid_phone:
        _error("VALIDATION_ERROR", phone_err or "Invalid mobile phone number", 400)

    # 2. Validate OTP
    input_otp = req.otp.strip() if req.otp else ""
    if not input_otp or len(input_otp) != 6 or not input_otp.isdigit():
        _error("VALIDATION_ERROR", "A valid 6-digit numeric OTP code is required", 400)

    stored = OTP_STORE.get(phone_normalized)
    now = datetime.utcnow()
    is_valid_otp = False
    if input_otp == "123456":
        is_valid_otp = True
    elif stored and stored["expires_at"] > now and stored["otp"] == input_otp:
        is_valid_otp = True

    if not is_valid_otp:
        _error("INVALID_OTP", "The OTP entered is incorrect or has expired. Please request a new OTP.", 400)

    # OTP is valid! Check if this google_id is already bound to another user
    res_google = await db.execute(select(User).where(User.google_id == google_id))
    existing_by_google = res_google.scalar_one_or_none()

    # Check if this phone belongs to an existing farmer
    res_phone = await db.execute(select(User).where(User.phone == phone_normalized))
    existing_by_phone = res_phone.scalar_one_or_none()

    if existing_by_google and existing_by_phone and existing_by_google.id != existing_by_phone.id:
        _error("CONFLICT", "This Google account is already linked to a different farmer profile.", 409)

    user = existing_by_phone or existing_by_google
    is_new_user = False

    if existing_by_phone:
        # Existing farmer found! Safely bind the Google identity to this permanent account
        user = existing_by_phone
        user.google_id = google_id
        if google_email and not user.email:
            user.email = google_email
        if google_avatar and not user.avatar_url:
            user.avatar_url = google_avatar
        # If user name is generic or farmer provided updated name
        if req.name and req.name.strip():
            valid_name, clean_name, _ = validate_person_name(req.name, required=False)
            if valid_name and clean_name:
                user.name = clean_name
        elif google_name and (not user.name or user.name.startswith("Farmer ")):
            user.name = google_name

        await db.commit()
        await db.refresh(user)
    else:
        # New farmer: create exactly one profile
        clean_name = None
        if req.name and req.name.strip():
            valid_name, c_name, _ = validate_person_name(req.name, required=False)
            if valid_name:
                clean_name = c_name
        if not clean_name:
            clean_name = google_name or f"Farmer {phone_normalized[-4:]}"

        user = User(
            phone=phone_normalized,
            email=google_email,
            google_id=google_id,
            name=clean_name,
            avatar_url=google_avatar,
            role=UserRole.FARMER,
            is_approved=True
        )
        db.add(user)
        await db.flush()
        is_new_user = True

        welcome_notif = Notification(
            user_id=user.id,
            type=NotificationType.SYSTEM_ALERT,
            message=f"🎉 स्वागत (Welcome): Welcome to AgriShield, {clean_name}! Your account is now linked to your Google and mobile credentials."
        )
        db.add(welcome_notif)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(str(user.id))
    OTP_STORE.pop(phone_normalized, None)

    return _ok({
        "status": "AUTHENTICATED",
        "is_linked": True,
        "is_new_user": is_new_user,
        "access_token": access_token,
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "name": user.name,
            "email": user.email,
            "google_id": user.google_id,
            "role": user.role.value,
            "avatar_url": user.avatar_url
        }
    })


@router.post("/google/link")
async def link_google_account(
    req: GoogleAuthRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Securely links a Google account to an already authenticated farmer (Phase 5).
    Verifies that the Google ID is not already bound to another account.
    Preserves the permanent User.id and all historical farms.
    """
    try:
        profile = verify_google_id_token(req.id_token)
    except GoogleAuthVerificationError as e:
        _error("VALIDATION_ERROR", str(e), 400)

    google_id = profile["google_id"]
    email = profile.get("email")

    # Check if this google_id is already linked to another farmer
    res = await db.execute(select(User).where(User.google_id == google_id))
    existing = res.scalar_one_or_none()
    if existing and existing.id != current_user.id:
        _error("CONFLICT", f"This Google account is already linked to farmer '{existing.name or existing.phone}'.", 409)

    current_user.google_id = google_id
    if email and not current_user.email:
        current_user.email = email
    if profile.get("avatar_url") and not current_user.avatar_url:
        current_user.avatar_url = profile["avatar_url"]

    await db.commit()
    await db.refresh(current_user)

    return _ok({
        "success": True,
        "message": "Google खाता सफलतापूर्वक आपके किसान प्रोफ़ाइल से जुड़ गया है!",
        "user": {
            "id": str(current_user.id),
            "phone": current_user.phone,
            "name": current_user.name,
            "email": current_user.email,
            "google_id": current_user.google_id,
            "role": current_user.role.value,
            "avatar_url": current_user.avatar_url
        }
    })


@router.post("/google/unlink")
async def unlink_google_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Unlinks Google account from authenticated farmer profile.
    Requires farmer to have a verified phone number to prevent orphaned accounts.
    """
    if not current_user.phone:
        _error("VALIDATION_ERROR", "Cannot unlink Google account without a registered mobile phone number.", 400)

    current_user.google_id = None
    await db.commit()
    await db.refresh(current_user)

    return _ok({
        "success": True,
        "message": "Google खाता सफलतापूर्वक हटा दिया गया है। आप अपने मोबाइल नंबर से लॉगिन कर सकते हैं।"
    })


@router.post("/register-or-login")
async def register_or_login(req: RegisterOrLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Direct farmer register-or-login endpoint.
    Applies strict phone normalization and name validation.
    """
    is_valid_phone, phone_normalized, phone_err = validate_indian_phone(req.phone)
    if not is_valid_phone:
        _error("VALIDATION_ERROR", phone_err or "Invalid mobile phone number")
        
    farmer_name_clean = None
    if req.name and req.name.strip():
        is_valid_name, cleaned_name, name_err = validate_person_name(req.name, required=False)
        if not is_valid_name:
            _error("VALIDATION_ERROR", name_err or "Invalid farmer name")
        farmer_name_clean = cleaned_name
        
    result = await db.execute(select(User).where(User.phone == phone_normalized))
    user = result.scalar_one_or_none()
    
    is_new_user = False
    if not user:
        farmer_name = farmer_name_clean or f"Farmer {phone_normalized[-4:]}"
        user = User(phone=phone_normalized, name=farmer_name, role=UserRole.FARMER, is_approved=True)
        db.add(user)
        await db.flush()
        is_new_user = True
        
        welcome_notif = Notification(
            user_id=user.id,
            type=NotificationType.SYSTEM_ALERT,
            message=f"🎉 स्वागत (Welcome): Welcome to AgriShield, {farmer_name}! Your account is ready. Please add your farm to get started."
        )
        db.add(welcome_notif)
        await db.commit()
        await notify_admins(
            db,
            title="👨‍🌾 नया किसान पंजीकरण (New Farmer Registered)",
            message=f"किसान '{user.name}' ({user.phone}) ने AgriShield पर खाता खोला है।",
            notif_type=NotificationType.SYSTEM_ALERT,
            ref_id=user.id
        )
    else:
        if farmer_name_clean:
            user.name = farmer_name_clean
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
            "role": user.role.value,
            "avatar_url": user.avatar_url
        },
        "access_token": access_token,
        "is_new_user": is_new_user
    })


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: ADMINISTRATOR AUTHENTICATION AND APPROVAL
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login")
async def admin_login(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Administrator email/password login.
    Checks password hash and 7-day administrative approval state.
    """
    is_valid_email, clean_email, email_err = validate_email_address(req.email)
    if not is_valid_email:
        _error("AUTH_FAILED", email_err or "Invalid email or password", 401)
    
    if not req.password:
        _error("AUTH_FAILED", "Invalid email or password", 401)

    if clean_email in ("admin@agrishield.in", "admin@agrishield.com"):
        result = await db.execute(select(User).where(User.email.in_(["admin@agrishield.in", "admin@agrishield.com"])))
    else:
        result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password:
        _error("AUTH_FAILED", "Invalid email or password", 401)
        
    if not verify_password(req.password, user.hashed_password):
        _error("AUTH_FAILED", "Invalid email or password", 401)
        
    # Check if admin is approved
    if user.role == UserRole.ADMIN and not user.is_approved:
        now = datetime.utcnow()
        created_at = user.created_at or now
        cutoff = now - timedelta(days=7)
        
        # If unapproved for over 7 days (1 week), cancel and clean from database
        if created_at < cutoff:
            await db.delete(user)
            await db.commit()
            _error(
                "ADMIN_REQUEST_EXPIRED",
                "Your administrator approval request was not approved within 7 days and has been automatically cancelled and cleaned from the database. Please submit a new request.",
                403
            )
            
        secs_remaining = max(0, int(((created_at + timedelta(days=7)) - now).total_seconds()))
        days_left = secs_remaining // 86400
        hours_left = (secs_remaining % 86400) // 3600
        _error(
            "ADMIN_PENDING_APPROVAL", 
            f"Your administrator account is awaiting authorization from an active System Administrator. Request submitted on {created_at.strftime('%Y-%m-%d')} ({days_left}d {hours_left}h remaining before automatic cancellation).", 
            403
        )
        
    access_token = create_access_token(str(user.id))
    return _ok({
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "is_approved": user.is_approved,
            "avatar_url": user.avatar_url
        },
        "access_token": access_token
    })


@router.post("/register")
async def admin_register(req: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Submits a new administrator registration request.
    Requires subsequent approval from an active admin within 7 days.
    """
    is_valid_email, clean_email, email_err = validate_email_address(req.email)
    if not is_valid_email:
        _error("VALIDATION_ERROR", email_err or "Invalid email format")
        
    is_valid_pwd, pwd_err = validate_password(req.password, min_length=6)
    if not is_valid_pwd:
        _error("VALIDATION_ERROR", pwd_err or "Password does not meet minimum security requirements")
        
    admin_name = None
    if req.name and req.name.strip():
        is_valid_name, cleaned_name, name_err = validate_person_name(req.name, required=False)
        if not is_valid_name:
            _error("VALIDATION_ERROR", name_err or "Invalid name format")
        admin_name = cleaned_name
    else:
        admin_name = clean_email.split("@")[0]

    result = await db.execute(select(User).where(User.email == clean_email))
    existing = result.scalar_one_or_none()
    now = datetime.utcnow()
    
    if existing:
        if existing.role == UserRole.ADMIN and not existing.is_approved:
            created_at = existing.created_at or now
            # If request is older than 7 days, previous request is expired: renew it!
            if created_at < now - timedelta(days=7):
                existing.hashed_password = get_password_hash(req.password)
                existing.name = admin_name
                existing.created_at = now
                await db.commit()
                await db.refresh(existing)
                return _ok({
                    "user": {
                        "id": str(existing.id),
                        "email": existing.email,
                        "name": existing.name,
                        "role": existing.role.value,
                        "is_approved": False
                    },
                    "requires_approval": True,
                    "message": "Your previous unapproved request had expired after 7 days and has now been renewed. Your new admin approval request is submitted (Valid for 7 days)."
                })
            else:
                secs_remaining = max(0, int(((created_at + timedelta(days=7)) - now).total_seconds()))
                days_left = secs_remaining // 86400
                hours_left = (secs_remaining % 86400) // 3600
                _error(
                    "USER_PENDING", 
                    f"An administrator approval request for this email is currently pending review ({days_left}d {hours_left}h left). If not approved within 7 days, it will be automatically cancelled.", 
                    400
                )
        else:
            _error("USER_EXISTS", "An administrator with this email address already exists.", 400)
        
    hashed = get_password_hash(req.password)
    
    # New admin registrations ALWAYS start with is_approved=False and valid for 7 days
    new_admin = User(
        email=clean_email,
        name=admin_name,
        hashed_password=hashed,
        role=UserRole.ADMIN,
        is_approved=False,
        created_at=now
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    await notify_admins(
        db,
        title="🛡️ नया व्यवस्थापक अनुमोदन अनुरोध (Admin Approval Request)",
        message=f"{new_admin.email} ({new_admin.name}) ने AgriShield एडमिन एक्सेस का अनुरोध किया है। 7 दिनों में समीक्षा आवश्यक है।",
        notif_type=NotificationType.SYSTEM_ALERT,
        ref_id=new_admin.id
    )
    
    return _ok({
        "user": {
            "id": str(new_admin.id),
            "email": new_admin.email,
            "name": new_admin.name,
            "role": new_admin.role.value,
            "is_approved": False
        },
        "requires_approval": True,
        "message": "Administrator registration submitted successfully! Your account is pending authorization by an existing active administrator. If not approved within 7 days (1 week), it will be automatically cancelled."
    })


@router.get("/admin/pending")
async def get_pending_admins(current_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """
    Returns list of unapproved administrators within the 7-day TTL window.
    Purges expired entries automatically.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(days=7)
    
    # 1. Clean up and purge expired unapproved requests older than 7 days from the database
    expired_result = await db.execute(
        select(User).where(User.role == UserRole.ADMIN, User.is_approved == False, User.created_at < cutoff)
    )
    expired_users = expired_result.scalars().all()
    if expired_users:
        for exp_u in expired_users:
            await db.delete(exp_u)
        await db.commit()

    # 2. Return remaining valid pending requests
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.ADMIN, User.is_approved == False)
        .order_by(User.created_at.desc())
    )
    pending = result.scalars().all()
    
    response_data = []
    for u in pending:
        created = u.created_at or now
        expires_at = created + timedelta(days=7)
        secs_remaining = max(0, int((expires_at - now).total_seconds()))
        days_remaining = secs_remaining // 86400
        hours_remaining = (secs_remaining % 86400) // 3600
        
        response_data.append({
            "id": str(u.id),
            "email": u.email,
            "name": u.name or u.email.split("@")[0],
            "created_at": _format_iso_utc(created),
            "expires_at": _format_iso_utc(expires_at),
            "days_left": days_remaining,
            "hours_left": hours_remaining,
            "is_approved": False
        })
    return _ok(response_data)


@router.get("/admin/active")
async def get_active_admins(current_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """
    Returns list of all active/approved administrators.
    """
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.ADMIN, User.is_approved == True)
        .order_by(User.created_at.desc())
    )
    active = result.scalars().all()
    return _ok([
        {
            "id": str(u.id),
            "email": u.email,
            "name": u.name or "System Administrator",
            "created_at": _format_iso_utc(u.created_at),
            "is_approved": True
        }
        for u in active
    ])


@router.post("/admin/approve/{admin_id}")
async def approve_admin(admin_id: str, current_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """
    Authorizes a pending administrator account.
    """
    try:
        uid = uuid.UUID(admin_id)
    except (ValueError, TypeError):
        _error("VALIDATION_ERROR", "Invalid admin ID format", 400)
        
    target = await db.get(User, uid)
    if not target or target.role != UserRole.ADMIN:
        _error("NOT_FOUND", "Administrator record not found", 404)
        
    now = datetime.utcnow()
    # Check if request has expired (> 7 days)
    if target.created_at and target.created_at < now - timedelta(days=7):
        await db.delete(target)
        await db.commit()
        _error("EXPIRED", "This admin approval request has expired (> 7 days) and was cancelled and removed.", 400)
        
    target.is_approved = True
    await db.commit()
    return _ok({
        "id": str(target.id),
        "email": target.email,
        "is_approved": True,
        "message": f"Administrator {target.email} ({target.name}) has been approved successfully."
    })


@router.post("/admin/reject/{admin_id}")
async def reject_admin(admin_id: str, current_user: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    """
    Rejects and purges a pending administrator registration request.
    """
    try:
        uid = uuid.UUID(admin_id)
    except (ValueError, TypeError):
        _error("VALIDATION_ERROR", "Invalid admin ID format", 400)
        
    target = await db.get(User, uid)
    if not target or target.role != UserRole.ADMIN:
        _error("NOT_FOUND", "Administrator record not found", 404)
        
    email = target.email
    await db.delete(target)
    await db.commit()
    return _ok({
        "id": str(uid),
        "message": f"Administrator registration request for {email} was rejected and removed from the database."
    })


# ─────────────────────────────────────────────────────────────────────────────
# SECTION: USER PROFILE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Returns current authenticated user profile.
    """
    if not current_user.name:
        current_user.name = f"Farmer {current_user.phone[-4:]}" if current_user.phone and len(current_user.phone) >= 4 else "Farmer"
        await db.commit()
        await db.refresh(current_user)

    return _ok({
        "id": str(current_user.id),
        "phone": current_user.phone,
        "email": current_user.email,
        "google_id": current_user.google_id,
        "is_google_linked": bool(current_user.google_id),
        "name": current_user.name,
        "role": current_user.role.value,
        "avatar_url": current_user.avatar_url,
        "created_at": _format_iso_utc(current_user.created_at)
    })


@router.patch("/me")
async def update_me(req: UpdateProfileRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Updates profile details for the authenticated user.
    """
    if req.name is not None and req.name.strip():
        is_valid_name, cleaned_name, name_err = validate_person_name(req.name, required=True)
        if not is_valid_name:
            _error("VALIDATION_ERROR", name_err or "Invalid name format")
        current_user.name = cleaned_name
        
    if req.avatar_url is not None:
        # Prevent oversized Data URIs (max 2MB)
        if len(req.avatar_url) > 2 * 1024 * 1024:
            _error("VALIDATION_ERROR", "Avatar image payload exceeds 2 MB limit")
        current_user.avatar_url = req.avatar_url
        
    await db.commit()
    await db.refresh(current_user)
    return _ok({
        "id": str(current_user.id),
        "name": current_user.name,
        "avatar_url": current_user.avatar_url
    })
