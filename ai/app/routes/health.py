"""Health check endpoint."""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "agrishield-ai",
        "version": "1.0.0"
    }
