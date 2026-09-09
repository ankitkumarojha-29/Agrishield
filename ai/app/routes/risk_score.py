"""Risk scoring endpoint — calls trained RandomForest model with real data pipeline."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Body
from app import config
from inference.risk_scoring import score_risk

router = APIRouter()


@router.post("/")
async def calculate_risk(
    # ── COMPULSORY geometry ───────────────────────────────────────────────────
    boundary_coordinates: List[List[float]] = Body(
        ...,
        description=(
            "Farm boundary ring as [[lon, lat], ...] — GeoJSON order. "
            "MUST contain at least 3 unique points."
        ),
    ),
    centroid_lat: float = Body(
        ...,
        description="Farm centroid latitude (degrees).",
    ),
    centroid_lon: float = Body(
        ...,
        description="Farm centroid longitude (degrees).",
    ),
    # ── Farm context ─────────────────────────────────────────────────────────
    crop: str = Body(...),
    area_ha: float = Body(default=1.0),
    # ── Backend fallback dicts ────────────────────────────────────────────────
    weather: dict = Body(default_factory=dict),
    soil: dict = Body(default_factory=dict),
    satellite: dict = Body(default_factory=dict),
    history: dict = Body(default_factory=dict),
):
    """
    Calculate farm risk score.

    In MOCK_MODE returns fixed demo values.
    In live mode:
      1. Fetches real Sentinel-2 + NDVI/NDWI/NDMI for the polygon.
      2. Fetches real OpenWeather data for the centroid.
      3. Fetches real SoilHive soil data.
      4. Falls back to backend-provided dicts if any API call fails.
      5. Runs the trained RandomForest risk model on real features.
    """
    if config.MOCK_MODE:
        return {
            "risk_score": 0.35, "risk_band": "medium",
            "factors": [], "confidence": 0.88,
            "model_version": "mock-v1", "low_confidence": False, "inference_ms": 3,
            "data_sources": {"satellite": "mock", "weather": "mock", "soil": "mock"},
        }

    # ── Live mode ─────────────────────────────────────────────────────────────
    from app.services.data_pipeline import collect

    pipeline_result = await collect(
        boundary_coordinates=boundary_coordinates,
        centroid_lat=centroid_lat,
        centroid_lon=centroid_lon,
        fallback_weather=weather,
        fallback_soil=soil,
        fallback_satellite=satellite,
        analysis_days_back=config.ANALYSIS_DAYS_BACK,
    )

    w   = pipeline_result["weather"]
    s   = pipeline_result["soil"]
    sat = pipeline_result["satellite"]

    # Build feature dict for the risk model
    features = {
        "crop":     crop,
        "area_ha":  area_ha,
        "rainfall":   w.get("rainfall",   weather.get("rainfall",   80.0)),
        "temp_mean":  w.get("temp_mean",  weather.get("temp_mean",  25.0)),
        "humidity":   w.get("humidity",   weather.get("humidity",   60.0)),
        "soil_ph":    s.get("soil_ph",    soil.get("pH",            6.5)),
        "nitrogen":   s.get("nitrogen",   soil.get("N",             50.0)),
        "phosphorus": s.get("phosphorus", soil.get("P",             25.0)),
        "potassium":  s.get("potassium",  soil.get("K",             200.0)),
        "ndvi_mean":  sat.get("ndvi_mean", satellite.get("ndvi_mean", 0.5)),
        "ndwi_mean":  sat.get("ndwi_mean", satellite.get("ndwi_mean", 0.0)),
        "ndmi_mean":  sat.get("ndmi_mean", satellite.get("ndmi_mean", 0.0)),
        "yield_prediction":    history.get("yield_prediction",    3000.0),
        "disease_probability": history.get("disease_probability", 0.1),
        "historical_loss":     history.get("historical_loss",     0.1),
    }

    result = score_risk(features)

    # Enrich response
    result["data_sources"] = pipeline_result["data_sources"]
    result["centroid"] = {
        "lat": pipeline_result.get("geometry", {}).get("centroid_lat", centroid_lat),
        "lon": pipeline_result.get("geometry", {}).get("centroid_lon", centroid_lon),
    }
    if pipeline_result["warnings"]:
        result["warnings"] = pipeline_result["warnings"]

    return result
