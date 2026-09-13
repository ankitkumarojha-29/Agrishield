from fastapi import APIRouter, Query
from typing import Optional
from services.satellite_service import get_live_satellite_indices
from api.auth import _ok, _error

router = APIRouter()

@router.get("/indices")
async def get_satellite_indices(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    crop: Optional[str] = Query(default="wheat", description="Crop type")
):
    """
    Fetch real-time Sentinel-2 L2A & agro-meteorological satellite indices (NDVI, NDMI, NDWI)
    for exact GPS coordinates.
    """
    try:
        indices = await get_live_satellite_indices(centroid_lat=lat, centroid_lon=lon, crop=crop)
        return _ok(indices)
    except Exception as e:
        return _error("SATELLITE_SERVICE_ERROR", str(e), 500)
