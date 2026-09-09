import uuid
import enum
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Enum as SQLEnum, Text, Boolean, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from db.session import Base

class UserRole(str, enum.Enum):
    FARMER = "farmer"
    ADMIN = "admin"

class FarmStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    BOUNDARY_INVALID = "BOUNDARY_INVALID"

class SoilReportSource(str, enum.Enum):
    OCR = "ocr"
    FALLBACK = "soil_health_card_fallback"

class AssessmentType(str, enum.Enum):
    CROP_HEALTH = "crop_health"
    YIELD_PREDICTION = "yield_prediction"
    RISK_SCORE = "risk_score"
    ADVISORY = "advisory"
    DAMAGE_ASSESSMENT = "damage_assessment"

class PolicyStatus(str, enum.Enum):
    QUOTED = "QUOTED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"

class ClaimEventType(str, enum.Enum):
    HAILSTORM = "hailstorm"
    DROUGHT = "drought"
    FLOOD = "flood"
    PEST = "pest"
    UNSEASONAL_RAIN = "unseasonal_rain"
    OTHER = "other"

class ClaimStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    AI_ASSESSED = "AI_ASSESSED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class NotificationType(str, enum.Enum):
    CLAIM_STATUS = "claim_status"
    POLICY_STATUS = "policy_status"
    WEATHER_ALERT = "weather_alert"
    RISK_ALERT = "risk_alert"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String, unique=True, index=True, nullable=True) # Farmer identity
    email = Column(String, unique=True, index=True, nullable=True) # Admin identity
    name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.FARMER)
    language = Column(String, default="en")
    hashed_password = Column(String, nullable=True) # For admins
    created_at = Column(DateTime, default=func.now())
    
    farms = relationship("Farm", back_populates="owner", foreign_keys="Farm.user_id")

class Farm(Base):
    __tablename__ = "farms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(String, nullable=False)
    crop = Column(String, nullable=True)
    sowing_date = Column(DateTime, nullable=True)
    boundary = Column(Geometry(geometry_type='POLYGON', srid=4326))
    area_m2 = Column(Float)
    status = Column(SQLEnum(FarmStatus), default=FarmStatus.PENDING)
    created_at = Column(DateTime, default=func.now())
    
    owner = relationship("User", back_populates="farms", foreign_keys=[user_id])
    claims = relationship("Claim", back_populates="farm", foreign_keys="Claim.farm_id")
    soil_reports = relationship("SoilReport", back_populates="farm")
    policies = relationship("InsurancePolicy", back_populates="farm", foreign_keys="InsurancePolicy.farm_id")

class SoilReport(Base):
    __tablename__ = "soil_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id"))
    source = Column(SQLEnum(SoilReportSource))
    n = Column(Float)
    p = Column(Float)
    k = Column(Float)
    ph = Column(Float)
    confidence = Column(Float)
    raw_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    farm = relationship("Farm", back_populates="soil_reports")

class AIAssessment(Base):
    __tablename__ = "ai_assessments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id"))
    type = Column(SQLEnum(AssessmentType))
    payload = Column(JSONB)
    model_version = Column(String)
    confidence = Column(Float)
    low_confidence = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

class InsurancePolicy(Base):
    __tablename__ = "policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    premium = Column(Float)
    sum_insured = Column(Float)
    risk_score_id = Column(UUID(as_uuid=True), ForeignKey("ai_assessments.id"), nullable=True)
    status = Column(SQLEnum(PolicyStatus), default=PolicyStatus.QUOTED)
    canonical_hash = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    farm = relationship("Farm", back_populates="policies", foreign_keys=[farm_id])

class Claim(Base):
    __tablename__ = "claims"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=True)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    event_type = Column(SQLEnum(ClaimEventType))
    description = Column(Text)
    evidence_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    damage_pct = Column(Float, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    status = Column(SQLEnum(ClaimStatus), default=ClaimStatus.SUBMITTED)
    canonical_hash = Column(String, nullable=True)
    tx_hash = Column(String, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    farm = relationship("Farm", back_populates="claims", foreign_keys=[farm_id])
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    type = Column(SQLEnum(NotificationType))
    ref_id = Column(UUID(as_uuid=True), nullable=True)
    message = Column(Text)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])

class FileRecord(Base):
    __tablename__ = "files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data = Column(LargeBinary, nullable=False)
    mime_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
