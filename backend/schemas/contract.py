from pydantic import BaseModel, Field, UUID4
from typing import List, Optional, Any
from datetime import date, datetime
from enum import Enum

class ErrorCode(str, Enum):
    AUTH_REQUIRED = "AUTH_REQUIRED"
    FORBIDDEN = "FORBIDDEN"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    FARM_NOT_FOUND = "FARM_NOT_FOUND"
    FARM_BOUNDARY_INVALID = "FARM_BOUNDARY_INVALID"
    AI_UNAVAILABLE = "AI_UNAVAILABLE"
    AI_LOW_CONFIDENCE = "AI_LOW_CONFIDENCE"
    FILE_INVALID = "FILE_INVALID"
    CLAIM_NOT_FOUND = "CLAIM_NOT_FOUND"
    POLICY_NOT_FOUND = "POLICY_NOT_FOUND"
    RATE_LIMITED = "RATE_LIMITED"
    BLOCKCHAIN_PENDING = "BLOCKCHAIN_PENDING"
    BLOCKCHAIN_FAILED = "BLOCKCHAIN_FAILED"

class EnvelopeMeta(BaseModel):
    request_id: UUID4
    timestamp: datetime

class EnvelopeError(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None

class Envelope(BaseModel):
    success: bool
    data: Any
    meta: EnvelopeMeta
    error: Optional[EnvelopeError] = None

class GeoPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]

class PolygonValidationResultReason(str, Enum):
    NOT_CLOSED = "NOT_CLOSED"
    TOO_FEW_VERTICES = "TOO_FEW_VERTICES"
    SELF_INTERSECTING = "SELF_INTERSECTING"
    AREA_TOO_SMALL = "AREA_TOO_SMALL"
    AREA_TOO_LARGE = "AREA_TOO_LARGE"

class PolygonValidationResult(BaseModel):
    valid: bool
    reason: Optional[PolygonValidationResultReason] = None
    area_m2: float

class FarmCentroid(BaseModel):
    lat: float
    lon: float

class Farm(BaseModel):
    id: UUID4
    user_id: UUID4
    name: str
    crop: Optional[str] = None
    sowing_date: Optional[date] = None
    area_m2: float
    boundary: GeoPolygon
    centroid: FarmCentroid
    status: str

class AIPredictionBase(BaseModel):
    model_version: str
    confidence: float = Field(ge=0, le=1)
    low_confidence: bool
    inference_ms: int

class Claim(BaseModel):
    id: UUID4
    policy_id: UUID4
    incident_date: date
    event_type: str
    description: str
    evidence_ids: List[UUID4]
    status: str
    damage_pct: Optional[float] = None
    ai_confidence: Optional[float] = None
    canonical_hash: Optional[str] = None
    tx_hash: Optional[str] = None
