"""Damage assessment endpoint — EfficientNet-B0 inference."""
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app import config

router = APIRouter()


@router.post("/")
async def assess_damage(
    images: List[UploadFile] = File(...),
    crop: str = Form(...),
    event_type: str = Form(...),
):
    """
    Assess crop damage from one or more post-disaster photos.

    - MOCK_MODE=true  → returns fixed demo values instantly.
    - MOCK_MODE=false → runs EfficientNet-B0 inference on all uploaded images
                        and aggregates the damage estimate.
    """
    if config.MOCK_MODE:
        return {
            "damage_pct":    0.28,
            "severity":      "moderate",
            "detections":    [{"label": event_type, "area_pct": 0.28, "confidence": 0.87}],
            "confidence":    0.87,
            "model_version": "mock-damage-v1",
            "low_confidence":False,
            "inference_ms":  320,
        }

    # ── Live inference ─────────────────────────────────────────────────────
    try:
        from inference.cv_pipeline import predict_damage
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Damage model not trained yet. {exc}",
        )

    if not images:
        raise HTTPException(status_code=422, detail="At least one image is required.")

    image_bytes_list = []
    for img in images:
        data = await img.read()
        if data:
            image_bytes_list.append(data)

    if not image_bytes_list:
        raise HTTPException(status_code=422, detail="All uploaded image files are empty.")

    try:
        result = predict_damage(image_bytes_list, event_type=event_type)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image format: {exc}")
    result["crop"]       = crop
    result["event_type"] = event_type
    return result
