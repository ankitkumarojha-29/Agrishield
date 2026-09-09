"""Risk scoring schemas."""
from pydantic import BaseModel
from typing import List, Optional

class RiskResponse(BaseModel):
    """Risk scoring response."""
    risk_score: float
    risk_band: str
    factors: List[dict]
    model_version: Optional[str] = None
