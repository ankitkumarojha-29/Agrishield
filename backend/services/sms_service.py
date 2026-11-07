"""
SMS Service Provider Abstraction for AgriShield.
Handles OTP dispatch cleanly separating free development mode from real production SMS gateways.

- Development Mode (Default): Returns OTP code in API response for direct on-screen display
  and autofill with zero SMS costs.
- Production Mode: Transmits OTP via configured carrier SMS gateway (e.g. Twilio, Fast2SMS, MSG91)
  and strictly suppresses the OTP code from client API responses and logs.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from core.config import settings

logger = logging.getLogger(__name__)


class BaseSMSProvider(ABC):
    """Abstract Base Class for SMS delivery providers."""

    @abstractmethod
    async def send_otp(self, phone: str, otp_code: str) -> Dict[str, Any]:
        """
        Dispatches a 6-digit OTP to the normalized phone number.
        Returns provider dispatch result dict.
        """
        pass


class DevelopmentSMSProvider(BaseSMSProvider):
    """
    Zero-cost Development SMS provider.
    Maintains the free on-screen OTP display and autofill experience for farmers
    and testing environments without requiring a paid SMS gateway.
    """

    async def send_otp(self, phone: str, otp_code: str) -> Dict[str, Any]:
        logger.info(f"[DEV_OTP] Zero-cost OTP generated for {phone}: {otp_code} (Valid for 5 min)")
        return {
            "success": True,
            "mode": "development",
            "provider": "on_screen_autofill",
            "phone": phone,
            "otp_code": otp_code,
            "message": f"सत्यापन कोड (OTP): {otp_code} स्क्रीन पर प्रदर्शित है (SMS शुल्क शून्य)।",
            "is_development": True
        }


class ProductionSMSProvider(BaseSMSProvider):
    """
    Production Carrier SMS Provider.
    Dispatches OTPs via external telecom SMS gateway.
    STRICT SECURITY RULE: Never exposes otp_code in API responses or public logs.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.SMS_PROVIDER_API_KEY

    async def send_otp(self, phone: str, otp_code: str) -> Dict[str, Any]:
        if not self.api_key:
            logger.error("[PROD_OTP] Production SMS gateway API key is missing!")
            return {
                "success": False,
                "mode": "production",
                "provider": "carrier_sms",
                "phone": phone,
                "otp_code": None,  # NEVER exposed in production
                "error": "SMS Gateway configuration missing. Please configure SMS_PROVIDER_API_KEY.",
                "is_development": False
            }

        # Real SMS Gateway dispatch logic (Fast2SMS / Telecom Gateway)
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://www.fast2sms.com/dev/bulkV2",
                    headers={"authorization": self.api_key},
                    data={
                        "variables_values": otp_code,
                        "route": "otp",
                        "numbers": phone,
                    }
                )
                if resp.status_code == 200 and resp.json().get("return"):
                    logger.info(f"[PROD_OTP] Real SMS dispatched to {phone[-4:]} via carrier gateway.")
                    return {
                        "success": True,
                        "mode": "production",
                        "provider": "fast2sms",
                        "phone": phone,
                        "otp_code": None,  # STRICT: Hidden in production
                        "message": f"6-अंकों का ओटीपी आपके मोबाइल {phone} पर SMS द्वारा भेजा गया है।",
                        "is_development": False
                    }
                else:
                    logger.warning("[PROD_OTP] Carrier SMS dispatch response: %s", resp.text)
                    return {
                        "success": False,
                        "mode": "production",
                        "provider": "carrier_sms",
                        "phone": phone,
                        "otp_code": None,
                        "error": "SMS gateway transmission failed. Please verify API key and credit balance.",
                        "is_development": False
                    }
        except Exception as e:
            logger.error("[PROD_OTP] SMS dispatch exception: %s", e)
            return {
                "success": False,
                "mode": "production",
                "provider": "carrier_sms",
                "phone": phone,
                "otp_code": None,
                "error": f"Failed to dispatch SMS: {str(e)}",
                "is_development": False
            }


def get_sms_provider() -> BaseSMSProvider:
    """
    Factory function returning the active SMS provider based on settings.OTP_MODE.
    Defaults safely to DevelopmentSMSProvider when no paid gateway is configured.
    """
    mode = (settings.OTP_MODE or "development").strip().lower()
    if mode == "production":
        return ProductionSMSProvider()
    return DevelopmentSMSProvider()
