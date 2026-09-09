"""Soil OCR schemas."""
from pydantic import BaseModel
from typing import Optional

class SoilOCRResponse(BaseModel):
    """Soil data extraction response."""
    N: float
    P: float
    K: float
    pH: float
    confidence: float
    extracted_text: str
    model_version: Optional[str] = None
