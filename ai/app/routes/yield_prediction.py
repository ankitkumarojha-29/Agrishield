"""Yield prediction endpoint — calls trained RandomForest model with real data pipeline."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Body, HTTPException
from app import config
from inference.yield_prediction import predict_yield

router = APIRouter()


@router.post("/")
async def predict_yield_endpoint(
    # ── COMPULSORY geometry (lat/lon REQUIRED for real data) ─────────────────
    boundary_coordinates: List[List[float]] = Body(
        ...,
        description=(
            "Farm boundary ring as [[lon, lat], ...] — GeoJSON order. "
            "MUST contain at least 3 unique points. Closing point optional."
        ),
    ),
    centroid_lat: float = Body(
        ...,
        description="Farm centroid latitude (degrees). Computed by backend from boundary.",
    ),
    centroid_lon: float = Body(
        ...,
        description="Farm centroid longitude (degrees). Computed by backend from boundary.",
    ),
    # ── Farm context ─────────────────────────────────────────────────────────
    crop: str = Body(...),
    area_ha: float = Body(...),
    sowing_date: str = Body(default="2026-06-01"),
    # ── Backend fallback values (used if live collection fails) ───────────────
    rainfall: float = Body(default=80.0),
    rainfall_7d: float = Body(default=20.0),
    rainfall_30d: float = Body(default=80.0),
    temp_mean: float = Body(default=25.0),
    temp_max: float = Body(default=32.0),
    temp_min: float = Body(default=18.0),
    humidity: float = Body(default=60.0),
    wind_speed: float = Body(default=10.0),
    soil_ph: float = Body(default=6.5),
    nitrogen: float = Body(default=50.0),
    phosphorus: float = Body(default=25.0),
    potassium: float = Body(default=200.0),
    organic_carbon: float = Body(default=0.5),
    ndvi_mean: float = Body(default=0.5),
    ndvi_min: float = Body(default=0.3),
    ndvi_max: float = Body(default=0.7),
    ndvi_std: float = Body(default=0.1),
    ndwi_mean: float = Body(default=0.0),
    ndwi_min: float = Body(default=-0.2),
    ndwi_max: float = Body(default=0.2),
    ndmi_mean: float = Body(default=0.0),
    ndmi_min: float = Body(default=-0.2),
    ndmi_max: float = Body(default=0.2),
    growth_stage: float = Body(default=0.5),
    sowing_delay_days: float = Body(default=0.0),
    heat_stress_days: float = Body(default=0.0),
    excessive_rainfall_index: float = Body(default=0.0),
    disease_probability: float = Body(default=0.1),
    historical_loss: float = Body(default=0.1),
):
    """
    Predict crop yield.

    In MOCK_MODE returns fixed demo values.
    In live mode:
      1. Fetches real Sentinel-2 satellite data for the farm polygon.
      2. Fetches real OpenWeather data for the centroid.
      3. Fetches real SoilHive soil data for the centroid.
      4. Falls back to backend-provided values if any API call fails.
      5. Runs the trained RandomForest model on real features.
    """
    if config.MOCK_MODE:
        return {
            "yield_value": 3200.0, "unit": "kg/ha",
            "confidence": 0.82, "model_version": "mock-v1",
            "low_confidence": False, "inference_ms": 5,
            "data_sources": {"satellite": "mock", "weather": "mock", "soil": "mock"},
        }

    # ── Live mode: collect real data with fallback ────────────────────────────
    from app.services.data_pipeline import collect

    fallback_weather = {
        "rainfall": rainfall, "rainfall_7d": rainfall_7d, "rainfall_30d": rainfall_30d,
        "temp_mean": temp_mean, "temp_max": temp_max, "temp_min": temp_min,
        "humidity": humidity, "wind_speed": wind_speed,
    }
    fallback_soil = {
        "pH": soil_ph, "N": nitrogen, "P": phosphorus,
        "K": potassium, "organic_carbon": organic_carbon,
    }
    fallback_satellite = {
        "ndvi_mean": ndvi_mean, "ndvi_min": ndvi_min, "ndvi_max": ndvi_max, "ndvi_std": ndvi_std,
        "ndwi_mean": ndwi_mean, "ndwi_min": ndwi_min, "ndwi_max": ndwi_max,
        "ndmi_mean": ndmi_mean, "ndmi_min": ndmi_min, "ndmi_max": ndmi_max,
    }

    pipeline_result = await collect(
        boundary_coordinates=boundary_coordinates,
        centroid_lat=centroid_lat,
        centroid_lon=centroid_lon,
        fallback_weather=fallback_weather,
        fallback_soil=fallback_soil,
        fallback_satellite=fallback_satellite,
        analysis_days_back=config.ANALYSIS_DAYS_BACK,
    )

    w = pipeline_result["weather"]
    s = pipeline_result["soil"]
    sat = pipeline_result["satellite"]

    # Build feature dict for the model
    features = {
        "crop": crop,
        "area_ha": area_ha,
        "rainfall":    w.get("rainfall",    rainfall),
        "temp_mean":   w.get("temp_mean",   temp_mean),
        "humidity":    w.get("humidity",    humidity),
        "soil_ph":     s.get("soil_ph",     soil_ph),
        "nitrogen":    s.get("nitrogen",    nitrogen),
        "phosphorus":  s.get("phosphorus",  phosphorus),
        "potassium":   s.get("potassium",   potassium),
        "ndvi_mean":   sat.get("ndvi_mean", ndvi_mean),
        "ndwi_mean":   sat.get("ndwi_mean", ndwi_mean),
        "ndmi_mean":   sat.get("ndmi_mean", ndmi_mean),
        # Extra fields (model uses what it was trained on)
        "rainfall_7d": w.get("rainfall_7d", rainfall_7d),
        "rainfall_30d":w.get("rainfall_30d",rainfall_30d),
        "temp_max":    w.get("temp_max",    temp_max),
        "temp_min":    w.get("temp_min",    temp_min),
        "wind_speed":  w.get("wind_speed",  wind_speed),
        "organic_carbon": s.get("organic_carbon", organic_carbon),
        "ndvi_min":    sat.get("ndvi_min",  ndvi_min),
        "ndvi_max":    sat.get("ndvi_max",  ndvi_max),
        "ndvi_std":    sat.get("ndvi_std",  ndvi_std),
        "ndwi_min":    sat.get("ndwi_min",  ndwi_min),
        "ndwi_max":    sat.get("ndwi_max",  ndwi_max),
        "ndmi_min":    sat.get("ndmi_min",  ndmi_min),
        "ndmi_max":    sat.get("ndmi_max",  ndmi_max),
        "growth_stage": growth_stage,
        "sowing_delay_days": sowing_delay_days,
        "heat_stress_days": heat_stress_days,
        "excessive_rainfall_index": excessive_rainfall_index,
        "disease_probability": disease_probability,
        "historical_loss": historical_loss,
    }

    result = predict_yield(features)

    # Compute total farm yield based on surveyed area
    yield_val = float(result.get("yield_value", 0.0))
    total_yield_kg = round(yield_val * area_ha, 2)
    total_yield_quintals = round(total_yield_kg / 100.0, 2)
    result["area_ha"] = round(area_ha, 2)
    result["total_yield_kg"] = total_yield_kg
    result["total_yield_quintals"] = total_yield_quintals

    # Enrich response with data source metadata
    result["data_sources"] = pipeline_result["data_sources"]
    result["centroid"] = {
        "lat": pipeline_result.get("geometry", {}).get("centroid_lat", centroid_lat),
        "lon": pipeline_result.get("geometry", {}).get("centroid_lon", centroid_lon),
    }
    if pipeline_result["warnings"]:
        result["warnings"] = pipeline_result["warnings"]

    return result
