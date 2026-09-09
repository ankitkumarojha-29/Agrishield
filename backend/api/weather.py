from fastapi import APIRouter, Query
import uuid
from datetime import datetime
from schemas.contract import Envelope, EnvelopeMeta, EnvelopeError
from services.weather_client import get_current_weather

router = APIRouter()

@router.get("", response_model=Envelope)
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    weather_data = await get_current_weather(lat, lon)
    
    if weather_data:
        return Envelope(
            success=True,
            data=weather_data,
            meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
            error=None
        )
    else:
        # Graceful fallback: return UNAVAILABLE status per AGENTS.md rule
        return Envelope(
            success=False,
            data=None,
            meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
            error=EnvelopeError(
                code="SERVICE_UNAVAILABLE",
                message="Weather service is temporarily unavailable"
            )
        )
