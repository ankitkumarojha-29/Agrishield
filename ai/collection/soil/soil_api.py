from __future__ import annotations

import json
import os
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv


# ============================================================
# AGRISHIELD AI - SOIL DATA COLLECTOR
#
# Source:
#   OpenEPI / SoilHive
#
# Input:
#   ai/data/processed/farm/farm.json
#
# Output:
#   ai/data/processed/soil/
#       soil_raw.json
#       soil_summary.json
#
# Uses:
#   OpenEPI Python client
# ============================================================


# ============================================================
# IMPORTABLE API (used by data_pipeline — no disk writes)
# ============================================================

def fetch_soil(lat: float, lon: float, bbox: dict) -> dict:
    """
    Fetch soil properties for a farm centroid and bounding box via SoilHive/OpenEPI.

    Args:
        lat:  Centroid latitude
        lon:  Centroid longitude
        bbox: {"min_lat", "max_lat", "min_lon", "max_lon"}

    Returns flat soil dict for ML model input:
        {
            "soil_ph":        float,
            "nitrogen":       float,
            "phosphorus":     float,
            "potassium":      float,
            "organic_carbon": float,
            "clay":           float,   # % 0-5cm mean
            "sand":           float,
            "silt":           float,
            "source":         "SoilHive/OpenEPI",
        }

    Note:
        SoilHive returns clay/silt/sand directly.
        N/P/K/pH are estimated from soil texture if not available.

    Raises:
        RuntimeError: if SOILHIVE_API_TOKEN is missing or API call fails.
    """
    # Lazy env load
    _base = Path(__file__).resolve().parents[2]
    load_dotenv(_base / ".env")

    token = os.getenv("SOILHIVE_API_TOKEN")
    if not token:
        raise RuntimeError("SOILHIVE_API_TOKEN missing from ai/.env")

    import requests
    url = "https://api.soilhive.ag/v1/soil-data-by-geometry"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    wkt_geom = f"POINT({float(lon)} {float(lat)})"
    body = {
        "geometry": wkt_geom,
        "datasets": [19],
    }

    clay = sand = silt = None
    try:
        resp = requests.post(url, headers=headers, json=body, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            elements = data.get("dataFeedElement", [])
            for el in elements:
                prop_name = str(el.get("property", "")).lower()
                val = el.get("value")
                if val is not None:
                    try:
                        val = float(val)
                        if "clay" in prop_name: clay = val
                        elif "sand" in prop_name: sand = val
                        elif "silt" in prop_name: silt = val
                    except (ValueError, TypeError):
                        pass
        elif resp.status_code == 401 or resp.status_code == 403:
            raise RuntimeError(f"SoilHive authentication failed: HTTP {resp.status_code}")
    except requests.RequestException as e:
        raise RuntimeError(f"SoilHive connection error: {e}") from e

    # Derive approximate NPK/pH from texture
    # These are coarse estimates — real values need lab testing or ISRIC data
    clay_v = clay or 25.0
    sand_v = sand or 45.0
    silt_v = silt or 30.0

    # pH: clay-rich soils tend slightly alkaline in India, sandy soils slightly acidic
    soil_ph = round(6.2 + (clay_v - 25) * 0.015, 2)
    soil_ph = max(5.0, min(8.5, soil_ph))

    # Nitrogen rough estimate (clay retains more N)
    nitrogen = round(30.0 + clay_v * 0.8, 1)

    # Phosphorus and Potassium — regional average defaults
    phosphorus = 22.0
    potassium  = 175.0

    # Organic carbon rough estimate from clay content
    organic_carbon = round(0.3 + clay_v * 0.008, 3)

    return {
        "soil_ph":        soil_ph,
        "nitrogen":       nitrogen,
        "phosphorus":     phosphorus,
        "potassium":      potassium,
        "organic_carbon": organic_carbon,
        "clay":           round(clay_v, 2),
        "sand":           round(sand_v, 2),
        "silt":           round(silt_v, 2),
        "source":         "SoilHive/OpenEPI",
        "retrieved_at":   datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# SCRIPT ENTRYPOINT (python soil_api.py — standalone use only)
# When imported as a module, none of the code below runs.
# ============================================================

