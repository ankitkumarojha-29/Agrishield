import httpx
from typing import Dict, Any, Optional

async def get_current_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time weather data using the free Open-Meteo API.
    Does not require an API key, perfect for the hackathon.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": True,
        "timezone": "auto"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # The current_weather object contains temperature, windspeed, weathercode
            if "current_weather" in data:
                cw = data["current_weather"]
                
                # Simple weather code mapping based on WMO standards
                code = cw.get("weathercode", 0)
                condition = "Clear"
                if code in [1, 2, 3]: condition = "Cloudy"
                elif code in [45, 48]: condition = "Foggy"
                elif code in [51, 53, 55, 56, 57]: condition = "Drizzle"
                elif code in [61, 63, 65, 66, 67]: condition = "Rain"
                elif code in [71, 73, 75, 77]: condition = "Snow"
                elif code in [80, 81, 82]: condition = "Showers"
                elif code in [95, 96, 99]: condition = "Thunderstorm"
                
                temp_val = cw.get("temperature", 26.0)
                return {
                    "temp": temp_val,
                    "temperature_celsius": temp_val,
                    "wind_speed_kmh": cw.get("windspeed", 12.0),
                    "condition": condition,
                    "humidity": 65,
                    "timestamp": cw.get("time")
                }
                
    except Exception as e:
        print(f"Weather API error: {e}")
        
    # Graceful fallback per AGENTS.md
    return {
        "temp": 26.5,
        "temperature_celsius": 26.5,
        "wind_speed_kmh": 12.0,
        "condition": "Partly Cloudy",
        "humidity": 65,
        "timestamp": "now"
    }
