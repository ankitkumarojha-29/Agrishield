import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from db.session import get_db
from db.models import User, UserRole, Farm, FarmStatus, InsurancePolicy, PolicyStatus, Notification, NotificationType
from schemas.insurance import QuoteRequest, PolicyCreate
from services.pricing_service import calculate_premium
from services.blockchain_service import generate_tamper_proof_hash, record_hash_on_chain
from api.auth import get_current_user, _ok, _error

router = APIRouter()

def _serialize_policy(p: InsurancePolicy, include_farmer: bool = False):
    data = {
        "id": str(p.id),
        "user_id": str(p.user_id),
        "farm_id": str(p.farm_id),
        "premium_amount": p.premium,
        "coverage_amount": p.sum_insured,
        "canonical_hash": p.canonical_hash,
        "tx_hash": p.tx_hash,
        "status": p.status.value if p.status else "ACTIVE",
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "start_date": p.created_at.isoformat() if p.created_at else None,
        "end_date": (p.created_at.replace(year=p.created_at.year + 1)).isoformat() if p.created_at else None
    }
    if include_farmer and p.user:
        data["farmer"] = {
            "id": str(p.user.id),
            "name": p.user.name,
            "phone": p.user.phone
        }
    return data


@router.post("/quote")
async def get_quote(
    request: QuoteRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        farm_uuid = request.farm_id if isinstance(request.farm_id, uuid.UUID) else uuid.UUID(str(request.farm_id))
    except (ValueError, TypeError, AttributeError):
        return _error("VALIDATION_ERROR", "Invalid Farm UUID")
        
    farm = await db.get(Farm, farm_uuid)
    
    if not farm:
        return _error("FARM_NOT_FOUND", "Farm not found")
        
    if current_user.role != UserRole.ADMIN and farm.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed to quote this farm", 403)
    
    crop = request.crop or farm.crop or "Wheat"
    area_m2 = request.area_m2 if request.area_m2 > 0 else (farm.area_m2 or 10000.0)
    
    pricing = calculate_premium(area_m2=area_m2, crop=crop)
    pricing["farm_id"] = str(farm.id)
    pricing["farm_name"] = farm.name
    pricing["crop"] = crop
    return _ok(pricing)


@router.get("/policies")
async def list_policies(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * page_size
    query = select(InsurancePolicy).options(selectinload(InsurancePolicy.user)).order_by(InsurancePolicy.created_at.desc(), InsurancePolicy.id)
    
    if current_user.role != UserRole.ADMIN:
        query = query.where(InsurancePolicy.user_id == current_user.id)
        
    query = query.limit(page_size).offset(offset)
    result = await db.execute(query)
    policies = result.scalars().all()
    
    is_admin = current_user.role == UserRole.ADMIN
    return _ok([_serialize_policy(p, include_farmer=is_admin) for p in policies])


@router.post("/policies", status_code=201)
async def create_policy(
    policy_in: PolicyCreate, 
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not idempotency_key:
        return _error("VALIDATION_ERROR", "Idempotency-Key header is required")

    try:
        farm_uuid = policy_in.farm_id if isinstance(policy_in.farm_id, uuid.UUID) else uuid.UUID(str(policy_in.farm_id))
    except (ValueError, TypeError, AttributeError):
        return _error("VALIDATION_ERROR", "Invalid Farm UUID")
        
    farm = await db.get(Farm, farm_uuid)
    if not farm or (current_user.role != UserRole.ADMIN and farm.user_id != current_user.id):
        return _error("FARM_NOT_FOUND", "Farm not found or not owned by user")
    
    policy = InsurancePolicy(
        user_id=current_user.id,
        farm_id=farm.id,
        premium=policy_in.premium_amount,
        sum_insured=policy_in.coverage_amount,
        status=PolicyStatus.ACTIVE
    )
    farm.status = FarmStatus.VERIFIED
    
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    
    payload = {
        "policy_id": str(policy.id),
        "user_id": str(policy.user_id),
        "farm_id": str(policy.farm_id),
        "premium": policy.premium,
        "coverage": policy.sum_insured
    }
    canonical_hash = generate_tamper_proof_hash(payload)
    
    policy.canonical_hash = canonical_hash
    policy.tx_hash = await record_hash_on_chain(canonical_hash)
    
    # Notify farmer of successful policy creation
    notif = Notification(
        user_id=policy.user_id,
        type=NotificationType.POLICY_STATUS,
        ref_id=policy.id,
        message=f"Insurance policy created successfully! Transaction on Polygon Amoy: {policy.tx_hash}"
    )
    db.add(notif)
    
    await db.commit()
    await db.refresh(policy)
    
    return _ok(_serialize_policy(policy))


@router.get("/policies/{id}")
async def get_policy(
    id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        policy_uuid = uuid.UUID(id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")
        
    policy = await db.get(InsurancePolicy, policy_uuid)
    
    if not policy:
        return _error("POLICY_NOT_FOUND", "Policy not found", 404)
        
    if current_user.role != UserRole.ADMIN and policy.user_id != current_user.id:
        return _error("FORBIDDEN", "Not allowed to view this policy", 403)
        
    is_admin = current_user.role == UserRole.ADMIN
    return _ok(_serialize_policy(policy, include_farmer=is_admin))


@router.get("/policies/{id}/verification")
async def verify_policy(
    id: str, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        policy_uuid = uuid.UUID(id)
    except ValueError:
        return _error("VALIDATION_ERROR", "Invalid UUID")
        
    policy = await db.get(InsurancePolicy, policy_uuid)
    
    if not policy:
        return _error("POLICY_NOT_FOUND", "Policy not found", 404)
    
    return _ok({
        "canonical_hash": policy.canonical_hash,
        "tx_hash": policy.tx_hash,
        "status": "VERIFIED" if policy.tx_hash else "PENDING"
    })
