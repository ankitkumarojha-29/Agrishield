"""Configuration and environment variables."""
import os
from dotenv import load_dotenv

load_dotenv()

# API Configuration
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Model paths
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "models"))
CROP_HEALTH_MODEL = os.path.join(MODEL_DIR, "crop_health", "model.pt")
DAMAGE_MODEL = os.path.join(MODEL_DIR, "damage", "model.pt")
YIELD_MODEL = os.path.join(MODEL_DIR, "yield", "yield_model.pkl")   # matches train.py output
RISK_MODEL = os.path.join(MODEL_DIR, "risk", "risk_model.pkl")     # matches train.py output

# Confidence thresholds
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.7"))

# External APIs
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
SATELLITE_API_KEY = os.getenv("SATELLITE_API_KEY")

# Storage
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "data", "uploads"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Real data collection
# Number of days back to use as the Sentinel-2 analysis window
ANALYSIS_DAYS_BACK = int(os.getenv("ANALYSIS_DAYS_BACK", "45"))
# Backend base URL (reserved for future use — AI does not call backend)
BACKEND_URL = os.getenv("BACKEND_URL", "")
