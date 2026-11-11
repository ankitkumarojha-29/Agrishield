from abc import ABC, abstractmethod
from typing import Dict, Any
import httpx
from core.config import settings


class AIClient(ABC):
    @abstractmethod
    async def get_crop_health(self, image_bytes: bytes, crop: str, growth_stage: str) -> Dict[str, Any]: pass

    @abstractmethod
    async def get_damage_assessment(self, image_bytes: bytes, crop: str, event_type: str) -> Dict[str, Any]: pass

    @abstractmethod
    async def get_yield_prediction(self, crop: str, area_ha: float, weather: dict, soil: dict, satellite: dict, boundary_coordinates: list = None, centroid_lat: float = None, centroid_lon: float = None, sowing_date: str = None) -> Dict[str, Any]: pass

    @abstractmethod
    async def get_risk_score(self, crop: str, area_ha: float, weather: dict, soil: dict, satellite: dict, history: dict, boundary_coordinates: list = None, centroid_lat: float = None, centroid_lon: float = None) -> Dict[str, Any]: pass

    @abstractmethod
    async def get_soil_ocr(self, file_bytes: bytes, filename: str) -> Dict[str, Any]: pass

    @abstractmethod
    async def get_advisory(self, farm_context: dict) -> Dict[str, Any]: pass


class MockAIClient(AIClient):
    async def get_crop_health(self, image_bytes, crop, growth_stage):
        return {
            "label": "Healthy", "severity": "none", "boxes": [],
            "model_version": "mock-v1", "confidence": 0.92,
            "low_confidence": False, "inference_ms": 10,
            "is_fallback": True, "ai_engine": "offline_fallback",
        }

    async def get_damage_assessment(self, image_bytes, crop, event_type):
        return {
            "damage_pct": 0.28, "severity": "moderate",
            "detections": [{"label": event_type, "area_pct": 0.28, "confidence": 0.87}],
            "model_version": "mock-v1", "confidence": 0.87,
            "low_confidence": False, "inference_ms": 12,
            "is_fallback": True, "ai_engine": "offline_fallback",
        }

    async def get_yield_prediction(self, crop, area_ha, weather, soil, satellite, boundary_coordinates=None, centroid_lat=None, centroid_lon=None, sowing_date=None):
        return {
            "yield_value": 3200.0, "unit": "kg/ha",
            "model_version": "mock-v1", "confidence": 0.82,
            "low_confidence": False, "inference_ms": 5,
            "is_fallback": True, "ai_engine": "offline_fallback",
        }

    async def get_risk_score(self, crop, area_ha, weather, soil, satellite, history, boundary_coordinates=None, centroid_lat=None, centroid_lon=None):
        return {
            "risk_score": 0.35, "risk_band": "medium", "factors": [],
            "model_version": "mock-v1", "confidence": 0.88,
            "low_confidence": False, "inference_ms": 3,
            "is_fallback": True, "ai_engine": "offline_fallback",
        }

    async def get_soil_ocr(self, file_bytes, filename):
        try:
            from services.soil_ocr_service import extract_soil_data_from_bytes
            res = extract_soil_data_from_bytes(file_bytes, filename)
            res["is_fallback"] = True
            res["ai_engine"] = "local_backend_ocr"
            return res
        except Exception as e:
            logger.warning("MockAIClient local soil OCR failed: %s", e)
            return {
                "N": 45.0, "P": 22.0, "K": 180.0, "pH": 6.8,
                "confidence": 0.80, "extracted_text": "Soil Health Card processed",
                "model_version": "mock-v1", "low_confidence": False, "inference_ms": 5,
                "is_fallback": True, "ai_engine": "offline_fallback",
            }

    async def get_advisory(self, farm_context):
        return {
            "recommendations": ["Apply balanced NPK", "Monitor crop weekly"],
            "warnings": [],
            "model_version": "mock-v1", "confidence": 0.85,
            "low_confidence": False, "inference_ms": 2,
            "is_fallback": True, "ai_engine": "offline_fallback",
        }


import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Dynamic Tunnel State (permits live microservice announcement without Render restarts)
_DYNAMIC_TUNNEL_URL: Optional[str] = None
_LAST_HEARTBEAT: float = 0.0

def set_dynamic_tunnel_url(url: str):
    global _DYNAMIC_TUNNEL_URL, _LAST_HEARTBEAT
    _DYNAMIC_TUNNEL_URL = url.rstrip("/")
    _LAST_HEARTBEAT = time.time()
    logger.info("Dynamic AI tunnel registered: %s", _DYNAMIC_TUNNEL_URL)

def get_effective_ai_service_url() -> str:
    global _DYNAMIC_TUNNEL_URL, _LAST_HEARTBEAT
    # If dynamic tunnel was updated in the last 120 seconds, prioritize it
    if _DYNAMIC_TUNNEL_URL and (time.time() - _LAST_HEARTBEAT < 120):
        return _DYNAMIC_TUNNEL_URL
    return (settings.AI_SERVICE_URL or "http://localhost:8001").rstrip("/")

# Fast-fail connection timeout (3.5s connect, 25s read) so when tunnel/laptop is offline,
# fallback triggers seamlessly in seconds without freezing the farmer's browser
AI_HTTP_TIMEOUT = httpx.Timeout(25.0, connect=3.5)


class HttpAIClient(AIClient):
    def __init__(self, base_url: Optional[str] = None):
        self._configured_url = (base_url or "").rstrip("/") if base_url else None
        self._fallback = MockAIClient()
        self._headers = {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "AgriShield-Backend/1.0"
        }

    @property
    def base_url(self) -> str:
        effective = get_effective_ai_service_url()
        return effective if effective else (self._configured_url or "http://localhost:8001")

    async def get_crop_health(self, image_bytes: bytes, crop: str, growth_stage: str):
        try:
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(
                    f"{self.base_url}/v1/crop-health/",
                    files={"image": ("image.jpg", image_bytes, "image/jpeg")},
                    data={"crop": crop, "growth_stage": growth_stage},
                )
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI get_crop_health failed: %s, using fallback", e)
            fallback_res = await self._fallback.get_crop_health(image_bytes, crop, growth_stage)
            fallback_res["is_fallback"] = True
            fallback_res["ai_engine"] = "offline_fallback"
            return fallback_res

    async def get_damage_assessment(self, image_bytes: bytes, crop: str, event_type: str):
        try:
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(
                    f"{self.base_url}/v1/damage-assessment/",
                    files={"images": ("image.jpg", image_bytes, "image/jpeg")},
                    data={"crop": crop, "event_type": event_type},
                )
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI get_damage_assessment failed: %s, using fallback", e)
            fallback_res = await self._fallback.get_damage_assessment(image_bytes, crop, event_type)
            fallback_res["is_fallback"] = True
            fallback_res["ai_engine"] = "offline_fallback"
            return fallback_res

    async def get_yield_prediction(self, crop: str, area_ha: float, weather: dict, soil: dict, satellite: dict, boundary_coordinates: list = None, centroid_lat: float = None, centroid_lon: float = None, sowing_date: str = None):
        try:
            if centroid_lat is None or centroid_lon is None:
                centroid_lat = 23.2599
                centroid_lon = 77.4126
            if not boundary_coordinates:
                boundary_coordinates = [
                    [centroid_lon - 0.005, centroid_lat - 0.005],
                    [centroid_lon + 0.005, centroid_lat - 0.005],
                    [centroid_lon + 0.005, centroid_lat + 0.005],
                    [centroid_lon - 0.005, centroid_lat + 0.005],
                    [centroid_lon - 0.005, centroid_lat - 0.005],
                ]
            if not sowing_date:
                from datetime import datetime, timezone
                sowing_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            payload = {
                "crop": (crop or "wheat").strip().lower(),
                "area_ha": area_ha,
                "sowing_date": sowing_date,
                "rainfall": weather.get("rainfall", 80),
                "rainfall_7d": weather.get("rainfall_7d", 20),
                "rainfall_30d": weather.get("rainfall_30d", 80),
                "temp_mean": weather.get("temp_mean", 25),
                "temp_max": weather.get("temp_max", 32),
                "temp_min": weather.get("temp_min", 18),
                "humidity": weather.get("humidity", 60),
                "wind_speed": weather.get("wind_speed", 10),
                "soil_ph": soil.get("pH", 6.5),
                "nitrogen": soil.get("N", 50),
                "phosphorus": soil.get("P", 25),
                "potassium": soil.get("K", 200),
                "organic_carbon": soil.get("organic_carbon", 0.5),
                "ndvi_mean": satellite.get("ndvi_mean", 0.5),
                "ndvi_min": satellite.get("ndvi_min", 0.3),
                "ndvi_max": satellite.get("ndvi_max", 0.7),
                "ndvi_std": satellite.get("ndvi_std", 0.1),
                "ndwi_mean": satellite.get("ndwi_mean", 0.0),
                "ndwi_min": satellite.get("ndwi_min", -0.2),
                "ndwi_max": satellite.get("ndwi_max", 0.2),
                "ndmi_mean": satellite.get("ndmi_mean", 0.0),
                "ndmi_min": satellite.get("ndmi_min", -0.2),
                "ndmi_max": satellite.get("ndmi_max", 0.2),
                "boundary_coordinates": boundary_coordinates,
                "centroid_lat": centroid_lat,
                "centroid_lon": centroid_lon,
            }
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(f"{self.base_url}/v1/yield-prediction/", json=payload)
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI get_yield_prediction failed: %s, using fallback", e)
            fallback_res = await self._fallback.get_yield_prediction(crop, area_ha, weather, soil, satellite, boundary_coordinates, centroid_lat, centroid_lon, sowing_date=sowing_date)
            fallback_res["is_fallback"] = True
            fallback_res["ai_engine"] = "offline_fallback"
            return fallback_res

    async def get_risk_score(self, crop: str, area_ha: float, weather: dict, soil: dict, satellite: dict, history: dict, boundary_coordinates: list = None, centroid_lat: float = None, centroid_lon: float = None):
        try:
            if centroid_lat is None or centroid_lon is None:
                centroid_lat = 23.2599
                centroid_lon = 77.4126
            if not boundary_coordinates:
                boundary_coordinates = [
                    [centroid_lon - 0.005, centroid_lat - 0.005],
                    [centroid_lon + 0.005, centroid_lat - 0.005],
                    [centroid_lon + 0.005, centroid_lat + 0.005],
                    [centroid_lon - 0.005, centroid_lat + 0.005],
                    [centroid_lon - 0.005, centroid_lat - 0.005],
                ]
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(
                    f"{self.base_url}/v1/risk-score/",
                    json={
                        "crop": (crop or "wheat").strip().lower(),
                        "area_ha": area_ha,
                        "weather": weather,
                        "soil": soil,
                        "satellite": satellite,
                        "history": history,
                        "boundary_coordinates": boundary_coordinates,
                        "centroid_lat": centroid_lat,
                        "centroid_lon": centroid_lon,
                    },
                )
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI get_risk_score failed: %s, using fallback", e)
            fallback_res = await self._fallback.get_risk_score(crop, area_ha, weather, soil, satellite, history, boundary_coordinates, centroid_lat, centroid_lon)
            fallback_res["is_fallback"] = True
            fallback_res["ai_engine"] = "offline_fallback"
            return fallback_res

    async def get_soil_ocr(self, file_bytes: bytes, filename: str):
        try:
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(
                    f"{self.base_url}/v1/soil-ocr/",
                    files={"file": (filename, file_bytes, "application/octet-stream")},
                )
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI microservice get_soil_ocr unavailable (%s), using local extraction engine", e)
            try:
                from services.soil_ocr_service import extract_soil_data_from_bytes
                res = extract_soil_data_from_bytes(file_bytes, filename)
                res["is_fallback"] = True
                res["ai_engine"] = "local_backend_ocr"
                return res
            except Exception as e2:
                logger.warning("Local soil OCR extraction fallback failed: %s", e2)
                fallback_res = await self._fallback.get_soil_ocr(file_bytes, filename)
                fallback_res["is_fallback"] = True
                fallback_res["ai_engine"] = "offline_fallback"
                return fallback_res

    async def get_advisory(self, farm_context: dict):
        try:
            async with httpx.AsyncClient(timeout=AI_HTTP_TIMEOUT, follow_redirects=True, headers=self._headers) as client:
                r = await client.post(f"{self.base_url}/v1/advisory/", json=farm_context)
                r.raise_for_status()
                res = r.json()
                res["is_fallback"] = False
                res["ai_engine"] = "live_tunnel"
                return res
        except Exception as e:
            logger.warning("AI get_advisory failed: %s, using fallback", e)
            fallback_res = await self._fallback.get_advisory(farm_context)
            fallback_res["is_fallback"] = True
            fallback_res["ai_engine"] = "offline_fallback"
            return fallback_res


def get_ai_client() -> AIClient:
    if settings.AI_MODE.lower() == "mock" or settings.MOCK_MODE:
        return MockAIClient()
    return HttpAIClient(get_effective_ai_service_url())
