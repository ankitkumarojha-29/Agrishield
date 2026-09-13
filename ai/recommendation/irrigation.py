"""Irrigation recommendations and crop-water balance intelligence."""
from datetime import datetime
from typing import Dict, Any, Optional

CROP_WATER_SPECS = {
    "wheat": {"name_hi": "गेहूं", "kc": 1.05, "min_moisture_pct": 28, "flood_hours": 2.5, "drip_hours": 1.5},
    "paddy": {"name_hi": "धान", "kc": 1.20, "min_moisture_pct": 50, "flood_hours": 3.5, "drip_hours": 2.0},
    "rice": {"name_hi": "धान", "kc": 1.20, "min_moisture_pct": 50, "flood_hours": 3.5, "drip_hours": 2.0},
    "soybean": {"name_hi": "सोयाबीन", "kc": 0.85, "min_moisture_pct": 24, "flood_hours": 1.5, "drip_hours": 1.0},
    "cotton": {"name_hi": "कपास", "kc": 0.90, "min_moisture_pct": 22, "flood_hours": 2.0, "drip_hours": 1.2},
    "maize": {"name_hi": "मक्का", "kc": 1.00, "min_moisture_pct": 26, "flood_hours": 2.0, "drip_hours": 1.2},
    "gram": {"name_hi": "चना", "kc": 0.70, "min_moisture_pct": 20, "flood_hours": 1.5, "drip_hours": 0.8},
    "sugarcane": {"name_hi": "गन्ना", "kc": 1.15, "min_moisture_pct": 35, "flood_hours": 3.0, "drip_hours": 2.0},
    "default": {"name_hi": "फसल", "kc": 0.95, "min_moisture_pct": 25, "flood_hours": 2.0, "drip_hours": 1.2}
}

def recommend_irrigation(
    soil_moisture: float, 
    weather_forecast: Dict[str, Any], 
    crop_type: str = "wheat",
    is_drip: bool = False
) -> Dict[str, Any]:
    """
    Recommend irrigation schedule based on soil moisture and weather forecast.
    soil_moisture: float percentage (e.g. 35.0 for 35%)
    weather_forecast: dict with 'rain_next_48h', 'rain_prob', 'temp_max', 'et0'
    """
    crop = (crop_type or "wheat").lower().strip()
    spec = CROP_WATER_SPECS.get(crop, CROP_WATER_SPECS["default"])
    min_thresh = spec["min_moisture_pct"]
    run_hours = spec["drip_hours"] if is_drip else spec["flood_hours"]

    rain_48h = weather_forecast.get("rain_next_48h", 0.0)
    rain_prob = weather_forecast.get("rain_prob", 0)
    temp_max = weather_forecast.get("temp_max", 30.0)
    et0 = weather_forecast.get("et0", 3.8)

    if rain_48h >= 4.0 or rain_prob >= 50:
        status = "hold"
        badge_hi = "✅ बारिश की संभावना - रुकें"
        title_hi = f"पानी देने की जरूरत नहीं (अगले 48 घंटे में {round(rain_48h, 1)}mm बारिश संभावित)"
        reason_hi = f"आगामी 48 घंटों में बारिश की संभावना {rain_prob}% है। प्राकृतिक वर्षा से फसल की आवश्यकता पूरी होगी।"
        urgency = "low"
    elif soil_moisture >= (min_thresh + 8):
        status = "hold"
        badge_hi = "✅ नमी पर्याप्त - पानी न दें"
        title_hi = "पानी देने की जरूरत नहीं है (अगले 48 घंटे सुरक्षित)"
        reason_hi = f"जमीन में पर्याप्त नमी ({soil_moisture}%) मौजूद है। वाष्पीकरण दर {et0} mm/दिन सामान्य है।"
        urgency = "low"
    elif soil_moisture <= min_thresh:
        status = "water"
        badge_hi = "💧 आज शाम सिंचाई आवश्यक"
        title_hi = f"आज शाम खेत में {run_hours} घंटे का पानी दें"
        reason_hi = f"जमीन में नमी घटकर {soil_moisture}% रह गई है (न्यूनतम सीमा {min_thresh}%)। जल तनाव से बचाव के लिए शाम को सिंचाई करें।"
        urgency = "high" if soil_moisture < (min_thresh - 5) else "medium"
    else:
        status = "review"
        badge_hi = "⚠️ खेत का मुआयना करें"
        title_hi = "खेत में नमी की स्थिति जांचें"
        reason_hi = f"जमीन में नमी ({soil_moisture}%) सीमांत स्तर पर है। आवश्यक होने पर ही पानी दें।"
        urgency = "medium"

    return {
        "status": status,
        "urgency": urgency,
        "badge_hi": badge_hi,
        "title_hi": title_hi,
        "reason_hi": reason_hi,
        "run_hours": run_hours,
        "crop": crop_type,
        "soil_moisture_pct": soil_moisture,
        "min_threshold_pct": min_thresh,
        "model_version": "agronomic-irrigation-v1.0"
    }
