from pathlib import Path
from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parents[1] / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriShield API"
    API_V1_STR: str = "/api/v1"

    # Database — loaded from .env
    DATABASE_URL: str = ""

    # JWT Auth — loaded from .env
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # AI Service
    AI_SERVICE_URL: str = "http://localhost:8001"
    AI_MODE: str = "live"   # live | mock
    MOCK_MODE: bool = False

    # Blockchain — loaded from .env
    POLYGON_RPC_URL: str = ""
    POLYGON_PRIVATE_KEY: str = ""
    SMART_CONTRACT_ADDRESS: str = ""

    # Satellite, Weather & Mandi APIs
    COPERNICUS_CLIENT_ID: str = ""
    COPERNICUS_CLIENT_SECRET: str = ""
    OPENWEATHER_API_KEY: str = ""
    AGMARKNET_API_KEY: str = ""

    model_config = {"env_file": str(_env_path), "extra": "ignore"}

settings = Settings()
