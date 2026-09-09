"""Common request/response schemas."""
from pydantic import BaseModel
from typing import Optional

class ModelMetadata(BaseModel):
    """Model metadata response."""
    model_version: str
    timestamp: str
    confidence: float


class ErrorResponse(BaseModel):
    """Error response schema."""
    error_code: str
    message: str
    details: Optional[dict] = None
