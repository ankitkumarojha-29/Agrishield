"""
Satellite Telemetry API endpoint for AgriShield.
Fetches Copernicus Sentinel-2 L2A vegetative indices (NDVI, NDMI, NDWI) for farm parcel coordinates.
"""
from fastapi import APIRouter, Query
from typing import Optional
from services.satellite_service import get_live_satellite_indices
from api.auth import _ok, _error
from core.validators import validate_coordinates

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION: SENTINEL-2 SATELLITE INDICES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/indices")
async def get_satellite_indices(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to +90)"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to +180)"),
    crop: Optional[str] = Query(default="wheat", max_length=50, description="Crop type")
):
    """
    Fetch real-time Sentinel-2 L2A & agro-meteorological satellite indices (NDVI, NDMI, NDWI)
    for exact GPS coordinates.
    """
    is_valid_coords, coord_err = validate_coordinates(lat, lon)
    if not is_valid_coords:
        return _error("VALIDATION_ERROR", coord_err or "Invalid coordinates", 400)

    clean_crop = (crop or "wheat").strip()[:50]
    try:
        indices = await get_live_satellite_indices(centroid_lat=lat, centroid_lon=lon, crop=clean_crop)
        return _ok(indices)
    except Exception as e:
        return _error("SATELLITE_SERVICE_ERROR", str(e), 500)
