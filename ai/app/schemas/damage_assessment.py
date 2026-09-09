"""Damage assessment schemas."""
from pydantic import BaseModel
from typing import List, Optional

class DamageResponse(BaseModel):
    """Damage assessment response."""
    damage_pct: float
    severity: str
    detections: List[dict]
    confidence: float
    model_version: Optional[str] = None
