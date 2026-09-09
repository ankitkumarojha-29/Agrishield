"""FastAPI main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routes import health, crop_health, damage_assessment, yield_prediction, risk_score, soil_ocr, advisory

app = FastAPI(
    title="AgriShield AI Service",
    description="AI-powered crop monitoring and risk assessment service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(crop_health.router, prefix="/v1/crop-health", tags=["crop-health"])
app.include_router(damage_assessment.router, prefix="/v1/damage-assessment", tags=["damage-assessment"])
app.include_router(yield_prediction.router, prefix="/v1/yield-prediction", tags=["yield-prediction"])
app.include_router(risk_score.router, prefix="/v1/risk-score", tags=["risk-score"])
app.include_router(soil_ocr.router, prefix="/v1/soil-ocr", tags=["soil-ocr"])
app.include_router(advisory.router, prefix="/v1/advisory", tags=["advisory"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
