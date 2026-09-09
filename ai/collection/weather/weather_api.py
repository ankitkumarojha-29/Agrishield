from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv


# ============================================================
# AGRISHIELD AI - OPENWEATHER WEATHER COLLECTOR
#
# Input:
#   ai/data/processed/farm/farm.json
#
# Source:
#   OpenWeather
#
# Collects:
#   1. Current weather
#   2. 5-day / 3-hour forecast
#
# Output:
#   ai/data/processed/weather/
#       current_weather.json
#       forecast_weather.json
#       weather_summary.json
# ============================================================


# ============================================================
# IMPORTABLE API (used by data_pipeline — no disk writes)
# ============================================================

_CURRENT_URL  = "https://api.openweathermap.org/data/2.5/weather"
_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


def fetch_weather(lat: float, lon: float) -> dict:
    """
    Fetch current weather + 5-day forecast for a centroid coordinate.

    Returns a flat dict with all keys the ML models need:
        rainfall, rainfall_7d, rainfall_30d,
        temp_mean, temp_max, temp_min,
        humidity, wind_speed

    Raises:
        RuntimeError: if OPENWEATHER_API_KEY is missing or API call fails.
    """
    # Lazy env load — safe to call from FastAPI worker
    _base = Path(__file__).resolve().parents[2]
    load_dotenv(_base / ".env")

    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENWEATHER_API_KEY missing from ai/.env")

    params = {"lat": lat, "lon": lon, "appid": api_key, "units": "metric"}

    # --- Current weather ---
    cur_resp = requests.get(_CURRENT_URL, params=params, timeout=8)
    cur_resp.raise_for_status()
    cur = cur_resp.json()

    main   = cur.get("main", {})
    wind   = cur.get("wind", {})
    rain   = cur.get("rain", {})

    temp_mean = main.get("temp", 25.0)
    temp_max  = main.get("temp_max", temp_mean + 3)
    temp_min  = main.get("temp_min", temp_mean - 3)
    humidity  = main.get("humidity", 60.0)
    wind_speed = wind.get("speed", 10.0)
    rain_1h   = rain.get("1h", 0.0) or 0.0

    # --- Forecast (5 day / 3 hour) ---
    fcast_resp = requests.get(_FORECAST_URL, params=params, timeout=8)
    fcast_resp.raise_for_status()
    fcast = fcast_resp.json()

    rain_3h_list = []
    for item in fcast.get("list", []):
        rain_3h_list.append((item.get("rain") or {}).get("3h", 0.0) or 0.0)

    # 5-day total rainfall (mm) — sum of all 3-hour slots
    rainfall_total = sum(rain_3h_list)
    # Approximate 7-day and 30-day from the 5-day window
    rainfall_7d  = rainfall_total                    # 5-day is best we have
    rainfall_30d = rainfall_total * 4.0              # rough monthly estimate

    return {
        "rainfall":    round(rainfall_total, 2),
        "rainfall_7d": round(rainfall_7d, 2),
        "rainfall_30d": round(rainfall_30d, 2),
        "temp_mean":   round(temp_mean, 2),
        "temp_max":    round(temp_max, 2),
        "temp_min":    round(temp_min, 2),
        "humidity":    round(humidity, 2),
        "wind_speed":  round(wind_speed, 2),
        "rain_1h_mm":  round(rain_1h, 2),
        "source":      "OpenWeather",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# SCRIPT ENTRYPOINT (python weather_api.py — standalone use only)
# When imported as a module, none of the code below runs.
# ============================================================

