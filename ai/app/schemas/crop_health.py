"""Crop health schemas."""
from pydantic import BaseModel
from typing import List, Optional

class CropHealthResponse(BaseModel):
    """Crop health detection response."""
    label: str
    severity: int
    confidence: float
    boxes: List[dict]
    model_version: Optional[str] = None
