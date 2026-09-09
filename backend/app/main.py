from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from core.config import settings

from api import auth, farms, weather, satellite, ai, insurance, claims, notifications, admin, files

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "success" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    
    import uuid
    from datetime import datetime
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "meta": {
                "request_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat()
            },
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {}
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import uuid
    from datetime import datetime
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "meta": {
                "request_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat()
            },
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload",
                "details": {"errors": exc.errors()}
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import uuid
    from datetime import datetime
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "meta": {
                "request_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat()
            },
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "details": {}
            }
        }
    )


@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    return {"status": "OK", "service": "AgriShield Integration API"}


api_router = FastAPI()


@api_router.get("/meta")
def get_meta():
    return {
        "version": "1.0.0",
        "ai_service_url": settings.AI_SERVICE_URL,
        "ai_mode": settings.AI_MODE,
        "mock_mode": settings.MOCK_MODE,
        "features": [
            "crop-health", "yield-prediction", "risk-score",
            "soil-ocr", "advisory", "blockchain-verification",
            "weather", "insurance", "claims"
        ],
        "model_versions": {
            "yield": "yield-v1.0.0",
            "risk": "risk-v1.0.0",
            "crop_health": "mock-crop-v1",
            "damage": "mock-damage-v1",
            "soil_ocr": "easyocr-v1.0",
            "advisory": "advisory-rules-v1.0"
        }
    }


# All farm-scoped routes (including AI proxy, weather, soil) live inside farms.py
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(farms.router, prefix="/farms", tags=["farms"])
api_router.include_router(insurance.router, prefix="/insurance", tags=["insurance"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(weather.router, prefix="/weather", tags=["weather"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(files.router, prefix="/files", tags=["files"])

app.mount(settings.API_V1_STR, api_router)
