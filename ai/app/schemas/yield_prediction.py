"""Yield prediction schemas."""
from pydantic import BaseModel
from typing import Optional

class YieldResponse(BaseModel):
    """Yield prediction response."""
    yield_value: float
    unit: str
    confidence: float
    model_version: Optional[str] = None
