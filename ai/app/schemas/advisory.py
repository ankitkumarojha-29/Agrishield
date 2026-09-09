"""Advisory schemas."""
from pydantic import BaseModel
from typing import List

class AdvisoryResponse(BaseModel):
    """Advisory response."""
    recommendations: List[str]
    warnings: List[str]
