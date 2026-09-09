"""
AgriShield AI — Data Pipeline Orchestrator

Collects real satellite, weather, and soil data for a farm polygon.
Falls back to backend-provided values if any external API call fails.

Used by:
    ai/app/routes/yield_prediction.py
    ai/app/routes/risk_score.py
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)


async def collect(
    boundary_coordinates: list,
    centroid_lat: float,
    centroid_lon: float,
    fallback_weather: Optional[dict] = None,
    fallback_soil: Optional[dict] = None,
    fallback_satellite: Optional[dict] = None,
    analysis_days_back: int = 45,
) -> dict:
    """
    Orchestrate real data collection for a farm polygon.

    Priority: live API data → backend fallback values → hardcoded defaults.

    Args:
        boundary_coordinates: [[lon, lat], ...] ring from backend boundary
        centroid_lat:         Farm centroid latitude
        centroid_lon:         Farm centroid longitude
        fallback_weather:     Backend-provided weather dict (used if API fails)
        fallback_soil:        Backend-provided soil dict (used if API fails)
        fallback_satellite:   Backend-provided satellite dict (used if API fails)
        analysis_days_back:   Days back for Sentinel-2 window (default 45)

    Returns:
        {
            "weather":      {...},   # flat weather feature dict
            "soil":         {...},   # flat soil feature dict
            "satellite":    {...},   # flat satellite index dict
            "geometry":     {...},   # centroid, bbox, area_ha
            "data_sources": {
                "satellite": "live" | "fallback",
                "weather":   "live" | "fallback",
                "soil":      "live" | "fallback",
            },
            "warnings": [...]        # list of non-fatal issues
        }
    """
    fallback_weather   = fallback_weather   or {}
    fallback_soil      = fallback_soil      or {}
    fallback_satellite = fallback_satellite or {}

    data_sources: dict[str, str] = {}
    warnings: list[str] = []

    # ----------------------------------------------------------------
    # 1. Compute geometry from boundary_coordinates
    # ----------------------------------------------------------------
    geometry_data: dict = {}
    geojson_polygon: dict = {}
    bbox: dict = {}

    try:
        from collection.geometry.farm_geometry import process_geometry
        geometry_data = process_geometry(boundary_coordinates)
        geojson_polygon = geometry_data["geojson_polygon"]
        bbox = geometry_data["bbox"]
        # Override centroid from actual geometry (more accurate than what backend sent)
        centroid_lat = geometry_data["centroid_lat"]
        centroid_lon = geometry_data["centroid_lon"]
    except Exception as exc:
        warnings.append(f"Geometry computation failed: {exc}. Using provided centroid.")
        # Build a minimal bbox from just the centroid if geometry fails
        bbox = {
            "min_lat": centroid_lat - 0.01,
            "max_lat": centroid_lat + 0.01,
            "min_lon": centroid_lon - 0.01,
            "max_lon": centroid_lon + 0.01,
        }
        # Reconstruct GeoJSON from raw boundary_coordinates
        coords = [[float(c[0]), float(c[1])] for c in boundary_coordinates]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        geojson_polygon = {"type": "Polygon", "coordinates": [coords]}

    # ----------------------------------------------------------------
    # 2. Satellite: Sentinel-2 + Indices
    # ----------------------------------------------------------------
    satellite: dict = {}
    satellite_live = False

    try:
        from collection.satellite.sentinel2 import fetch_sentinel2
        from collection.satellite.indices import compute_indices

        # Date window: last N days
        to_dt   = datetime.now(timezone.utc)
        from_dt = to_dt - timedelta(days=analysis_days_back)
        from_date = from_dt.strftime("%Y-%m-%dT00:00:00Z")
        to_date   = to_dt.strftime("%Y-%m-%dT23:59:59Z")

        logger.info(
            "Fetching Sentinel-2 for centroid (%.5f, %.5f), period %s → %s",
            centroid_lat, centroid_lon, from_date, to_date,
        )

        # Run in executor so we don't block the async event loop
        loop = asyncio.get_event_loop()
        tif_bytes = await loop.run_in_executor(
            None, fetch_sentinel2, geojson_polygon, from_date, to_date
        )
        indices = await loop.run_in_executor(None, compute_indices, tif_bytes)

        satellite = {
            "ndvi_mean": indices.get("ndvi_mean") or 0.5,
            "ndvi_min":  indices.get("ndvi_min")  or 0.3,
            "ndvi_max":  indices.get("ndvi_max")  or 0.7,
            "ndvi_std":  indices.get("ndvi_std")  or 0.1,
            "ndwi_mean": indices.get("ndwi_mean") or 0.0,
            "ndwi_min":  indices.get("ndwi_min")  or -0.2,
            "ndwi_max":  indices.get("ndwi_max")  or 0.2,
            "ndmi_mean": indices.get("ndmi_mean") or 0.0,
            "ndmi_min":  indices.get("ndmi_min")  or -0.2,
            "ndmi_max":  indices.get("ndmi_max")  or 0.2,
            "valid_pixel_pct":    indices.get("valid_pixel_pct", 0.0),
            "cloud_mask_applied": True,
            "ndvi_detail": indices.get("ndvi", {}),
            "ndwi_detail": indices.get("ndwi", {}),
            "ndmi_detail": indices.get("ndmi", {}),
        }
        satellite_live = True
        data_sources["satellite"] = "live"
        logger.info("Satellite data collected (valid_pct=%.1f%%)", satellite["valid_pixel_pct"])

    except Exception as exc:
        logger.warning("Satellite collection failed, using fallback: %s", exc)
        warnings.append(f"Satellite API failed ({exc}). Using backend fallback values.")
        satellite = {
            "ndvi_mean": fallback_satellite.get("ndvi_mean", 0.5),
            "ndvi_min":  fallback_satellite.get("ndvi_min",  0.3),
            "ndvi_max":  fallback_satellite.get("ndvi_max",  0.7),
            "ndvi_std":  fallback_satellite.get("ndvi_std",  0.1),
            "ndwi_mean": fallback_satellite.get("ndwi_mean", 0.0),
            "ndwi_min":  fallback_satellite.get("ndwi_min", -0.2),
            "ndwi_max":  fallback_satellite.get("ndwi_max",  0.2),
            "ndmi_mean": fallback_satellite.get("ndmi_mean", 0.0),
            "ndmi_min":  fallback_satellite.get("ndmi_min", -0.2),
            "ndmi_max":  fallback_satellite.get("ndmi_max",  0.2),
        }
        data_sources["satellite"] = "fallback"

    # ----------------------------------------------------------------
    # 3. Weather: OpenWeather
    # ----------------------------------------------------------------
    weather: dict = {}

    try:
        from collection.weather.weather_api import fetch_weather

        logger.info("Fetching weather for (%.5f, %.5f)", centroid_lat, centroid_lon)
        loop = asyncio.get_event_loop()
        weather = await loop.run_in_executor(None, fetch_weather, centroid_lat, centroid_lon)
        data_sources["weather"] = "live"
        logger.info("Weather collected: temp=%.1f°C, rainfall=%.1fmm", weather["temp_mean"], weather["rainfall"])

    except Exception as exc:
        logger.warning("Weather collection failed, using fallback: %s", exc)
        warnings.append(f"Weather API failed ({exc}). Using backend fallback values.")
        weather = {
            "rainfall":    fallback_weather.get("rainfall",    80.0),
            "rainfall_7d": fallback_weather.get("rainfall_7d", 20.0),
            "rainfall_30d":fallback_weather.get("rainfall_30d",80.0),
            "temp_mean":   fallback_weather.get("temp_mean",   25.0),
            "temp_max":    fallback_weather.get("temp_max",    32.0),
            "temp_min":    fallback_weather.get("temp_min",    18.0),
            "humidity":    fallback_weather.get("humidity",    60.0),
            "wind_speed":  fallback_weather.get("wind_speed",  10.0),
        }
        data_sources["weather"] = "fallback"

    # ----------------------------------------------------------------
    # 4. Soil: SoilHive/OpenEPI
    # ----------------------------------------------------------------
    soil: dict = {}

    try:
        from collection.soil.soil_api import fetch_soil

        logger.info("Fetching soil for (%.5f, %.5f)", centroid_lat, centroid_lon)
        loop = asyncio.get_event_loop()
        soil = await loop.run_in_executor(None, fetch_soil, centroid_lat, centroid_lon, bbox)
        data_sources["soil"] = "live"
        logger.info("Soil collected: clay=%.1f%%, pH=%.2f", soil.get("clay", 0), soil.get("soil_ph", 0))

    except Exception as exc:
        logger.warning("Soil collection failed, using fallback: %s", exc)
        warnings.append(f"Soil API failed ({exc}). Using backend fallback values.")
        soil = {
            "soil_ph":        fallback_soil.get("pH",             6.5),
            "nitrogen":       fallback_soil.get("N",             50.0),
            "phosphorus":     fallback_soil.get("P",             25.0),
            "potassium":      fallback_soil.get("K",            200.0),
            "organic_carbon": fallback_soil.get("organic_carbon", 0.5),
        }
        data_sources["soil"] = "fallback"

    return {
        "weather":      weather,
        "soil":         soil,
        "satellite":    satellite,
        "geometry":     geometry_data,
        "data_sources": data_sources,
        "warnings":     warnings,
    }
