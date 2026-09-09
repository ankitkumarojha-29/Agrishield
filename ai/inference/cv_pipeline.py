"""
CV Inference Pipeline — EfficientNet-B0
=======================================
Centralised loader + predictor for both:
  - Crop Health (PlantVillage classes)
  - Damage Assessment (damaged / non_damaged)

Loaded once at startup (module-level singletons). Safe for concurrent requests
because torch inference is stateless once weights are loaded.
"""
from __future__ import annotations

import json
import time
from io import BytesIO
from pathlib import Path
from typing import List

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import models, transforms

# ── Paths (relative to this file's location: ai/inference/) ───────────────────
_BASE_DIR        = Path(__file__).resolve().parent.parent   # ai/
_CROP_MODEL_PATH = _BASE_DIR / "models" / "crop_health" / "model.pt"
_CROP_LABELS_PATH= _BASE_DIR / "models" / "crop_health" / "class_names.json"
_DMG_MODEL_PATH  = _BASE_DIR / "models" / "damage"      / "model.pt"
_DMG_LABELS_PATH = _BASE_DIR / "models" / "damage"      / "class_names.json"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Image pre-processing transform (same as val transform during training) ────
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Severity mapping (for crop health labels) ─────────────────────────────────
# Any label containing these keywords is mapped to the corresponding severity
_SEVERITY_MAP = {
    "healthy": "none",
    "bacterial_spot": "moderate",
    "early_blight": "moderate",
    "late_blight": "severe",
    "leaf_mold": "mild",
    "septoria": "moderate",
    "spider_mite": "mild",
    "target_spot": "moderate",
    "yellow_leaf_curl_virus": "severe",
    "mosaic_virus": "severe",
    "powdery_mildew": "mild",
    "rust": "severe",
}


def _infer_severity(label: str) -> str:
    label_lower = label.lower()
    for keyword, severity in _SEVERITY_MAP.items():
        if keyword in label_lower:
            return severity
    return "moderate"   # safe default


# ── Model builder (must match architecture used in training) ──────────────────
def _build_efficientnet(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


# ── Singleton model cache ─────────────────────────────────────────────────────
_crop_model: nn.Module | None = None
_crop_classes: list[str] | None = None
_dmg_model: nn.Module | None = None
_dmg_classes: list[str] | None = None
_dmg_pct_map: dict | None = None


def _load_crop_model():
    global _crop_model, _crop_classes
    if _crop_model is not None:
        return
    if not _CROP_MODEL_PATH.exists() or not _CROP_LABELS_PATH.exists():
        raise FileNotFoundError(
            f"Crop health model weights not found at {_CROP_MODEL_PATH}.\n"
            "Please run: python -m training.crop_health.train"
        )
    with open(_CROP_LABELS_PATH) as f:
        _crop_classes = json.load(f)
    _crop_model = _build_efficientnet(len(_crop_classes))
    _crop_model.load_state_dict(
        torch.load(_CROP_MODEL_PATH, map_location=DEVICE)
    )
    _crop_model.to(DEVICE).eval()
    print(f"[cv_pipeline] ✅ Crop health model loaded ({len(_crop_classes)} classes)")


def _load_damage_model():
    global _dmg_model, _dmg_classes, _dmg_pct_map
    if _dmg_model is not None:
        return
    if not _DMG_MODEL_PATH.exists() or not _DMG_LABELS_PATH.exists():
        raise FileNotFoundError(
            f"Damage model weights not found at {_DMG_MODEL_PATH}.\n"
            "Please run: python -m training.damage.train"
        )
    with open(_DMG_LABELS_PATH) as f:
        meta = json.load(f)
    _dmg_classes  = meta["classes"]
    _dmg_pct_map  = meta.get("damage_pct_map", {})
    _dmg_model = _build_efficientnet(len(_dmg_classes))
    _dmg_model.load_state_dict(
        torch.load(_DMG_MODEL_PATH, map_location=DEVICE)
    )
    _dmg_model.to(DEVICE).eval()
    print(f"[cv_pipeline] ✅ Damage model loaded ({len(_dmg_classes)} classes)")


# ── Public API ────────────────────────────────────────────────────────────────

def predict_crop_health(image_bytes: bytes) -> dict:
    """
    Run EfficientNet-B0 crop health inference on raw image bytes.

    Returns:
        label         (str)   – predicted disease/health class name
        severity      (str)   – none / mild / moderate / severe
        confidence    (float) – top-1 softmax probability (0.0–1.0)
        boxes         (list)  – empty list (classification, not detection)
        model_version (str)
        low_confidence(bool)
        inference_ms  (int)
    """
    _load_crop_model()
    t0 = time.time()

    img   = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = _TRANSFORM(img).unsqueeze(0).to(DEVICE)   # (1, 3, 224, 224)

    with torch.no_grad():
        logits = _crop_model(tensor)                    # (1, num_classes)
        probs  = torch.softmax(logits, dim=1)[0]        # (num_classes,)

    top_conf, top_idx = probs.max(0)
    confidence = float(top_conf.cpu())
    label      = _crop_classes[int(top_idx.cpu())]
    severity   = _infer_severity(label)
    elapsed_ms = int((time.time() - t0) * 1000)

    return {
        "label":         label,
        "severity":      severity,
        "confidence":    round(confidence, 4),
        "boxes":         [],   # classification model — no bounding boxes
        "model_version": "effnet-crop-v1",
        "low_confidence":confidence < 0.70,
        "inference_ms":  elapsed_ms,
    }


def predict_damage(image_bytes_list: List[bytes], event_type: str = "unknown") -> dict:
    """
    Run EfficientNet-B0 damage assessment on one or more images.

    Aggregates confidence across all images and returns the average
    damage percentage (0.0–1.0) based on the model's output class.

    Returns:
        damage_pct    (float) – estimated fraction of area damaged (0.0–1.0)
        severity      (str)   – none / mild / moderate / severe
        detections    (list)  – per-image predictions
        confidence    (float) – mean confidence across images
        model_version (str)
        low_confidence(bool)
        inference_ms  (int)
    """
    _load_damage_model()
    t0 = time.time()

    detections     = []
    confidences    = []
    damage_totals  = []

    for img_bytes in image_bytes_list:
        img    = Image.open(BytesIO(img_bytes)).convert("RGB")
        tensor = _TRANSFORM(img).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            logits = _dmg_model(tensor)
            probs  = torch.softmax(logits, dim=1)[0]

        top_conf, top_idx = probs.max(0)
        conf  = float(top_conf.cpu())
        label = _dmg_classes[int(top_idx.cpu())]

        # Look up damage percentage from saved map
        dmg_pct = _dmg_pct_map.get(label, 0.5 if label != "non_damaged" else 0.0)

        confidences.append(conf)
        damage_totals.append(dmg_pct)
        detections.append({
            "label":      label,
            "area_pct":   dmg_pct,
            "confidence": round(conf, 4),
        })

    avg_conf   = float(np.mean(confidences))
    avg_damage = float(np.mean(damage_totals))

    # Map damage fraction to severity band
    if avg_damage < 0.10:
        severity = "none"
    elif avg_damage < 0.30:
        severity = "mild"
    elif avg_damage < 0.60:
        severity = "moderate"
    else:
        severity = "severe"

    elapsed_ms = int((time.time() - t0) * 1000)

    return {
        "damage_pct":    round(avg_damage, 4),
        "severity":      severity,
        "detections":    detections,
        "confidence":    round(avg_conf, 4),
        "model_version": "effnet-damage-v1",
        "low_confidence":avg_conf < 0.70,
        "inference_ms":  elapsed_ms,
    }
