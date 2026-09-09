from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from db.models import PolicyStatus

class QuoteRequest(BaseModel):
    farm_id: UUID4
    crop: str
    area_m2: float

class QuoteResponse(BaseModel):
    premium_amount: float
    coverage_amount: float

class PolicyCreate(BaseModel):
    farm_id: UUID4
    premium_amount: float
    coverage_amount: float

class PolicyResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    farm_id: UUID4
    premium_amount: float
    coverage_amount: float
    canonical_hash: Optional[str] = None
    tx_hash: Optional[str] = None
    status: PolicyStatus
    created_at: datetime

    class Config:
        from_attributes = True

class VerificationResponse(BaseModel):
    canonical_hash: Optional[str] = None
    tx_hash: Optional[str] = None
    status: str
