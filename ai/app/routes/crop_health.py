"""Crop health detection endpoint — EfficientNet-B0 inference."""
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app import config

router = APIRouter()


@router.post("/")
async def detect_crop_health(
    image: UploadFile = File(...),
    crop: str = Form(...),
    growth_stage: str = Form(default="vegetative"),
):
    """
    Detect crop health / disease from an uploaded leaf or field image.

    - MOCK_MODE=true  → returns fixed demo values instantly.
    - MOCK_MODE=false → runs EfficientNet-B0 inference on the uploaded image.
    """
    if config.MOCK_MODE:
        return {
            "label":         "healthy",
            "severity":      "none",
            "confidence":    0.91,
            "boxes":         [],
            "model_version": "mock-crop-v1",
            "is_fallback":   True,
            "ai_engine":     "offline_fallback",
            "low_confidence":False,
            "inference_ms":  45,
            "crop":          crop,
            "growth_stage":  growth_stage,
        }

    # ── Live inference ─────────────────────────────────────────────────────
    try:
        from inference.cv_pipeline import predict_crop_health
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=422, detail="Uploaded image file is empty.")

        result = predict_crop_health(image_bytes)
        result["crop"] = crop
        result["growth_stage"] = growth_stage
        result["is_fallback"] = False
        result["ai_engine"] = "live_torch_model"
        return result
    except (FileNotFoundError, ModuleNotFoundError, ImportError) as err:
        return {
            "label": "healthy",
            "severity": "none",
            "confidence": 0.85,
            "boxes": [],
            "model_version": "mock-crop-v1",
            "is_fallback": True,
            "ai_engine": "offline_fallback",
            "low_confidence": True,
            "inference_ms": 10,
            "crop": crop,
            "growth_stage": growth_stage,
            "warning": f"Model inference engine fallback: {err}"
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image format: {exc}")
