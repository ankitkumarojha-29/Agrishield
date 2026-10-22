"""
Weather Telemetry API endpoint for AgriShield.
Returns current meteorological conditions and agro-meteorological advisories.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from schemas.contract import Envelope, EnvelopeMeta, EnvelopeError
from services.weather_client import get_current_weather
from core.validators import validate_coordinates

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION: CURRENT WEATHER TELEMETRY
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=Envelope)
async def get_weather(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to +90)"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to +180)")
):
    """
    Fetches real-time weather conditions for the specified geographic coordinates.
    """
    is_valid_coords, coord_err = validate_coordinates(lat, lon)
    if not is_valid_coords:
        return Envelope(
            success=False,
            data=None,
            meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
            error=EnvelopeError(
                code="VALIDATION_ERROR",
                message=coord_err or "Invalid geographic coordinates"
            )
        )

    weather_data = await get_current_weather(lat, lon)
    
    if weather_data:
        return Envelope(
            success=True,
            data=weather_data,
            meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
            error=None
        )
    else:
        return Envelope(
            success=False,
            data=None,
            meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
            error=EnvelopeError(
                code="SERVICE_UNAVAILABLE",
                message="Weather service is temporarily unavailable"
            )
        )
