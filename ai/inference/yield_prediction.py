"""Yield prediction inference — loads trained RandomForest pipeline."""
import os, json, time
import joblib
import numpy as np
import pandas as pd
from app import config

_pipeline = None
_metadata = None


def _generate_fallback_metadata(model_path: str, pipeline) -> dict:
    """Auto-generate metadata.json from the loaded pipeline if file is missing."""
    meta = {
        "model": "yield_prediction",
        "version": "yield-v1.0.0",
        "algorithm": "RandomForestRegressor",
        "target": "yield",
        "features": list(pipeline.feature_names_in_) if hasattr(pipeline, "feature_names_in_") else [
            "crop", "area_ha", "rainfall", "temp_mean", "humidity",
            "soil_ph", "nitrogen", "phosphorus", "potassium",
            "ndvi_mean", "ndwi_mean", "ndmi_mean",
        ],
    }
    meta_path = os.path.join(os.path.dirname(model_path), "metadata.json")
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=4)
    except Exception:
        pass  # not critical — we still have the in-memory dict
    return meta


def _load():
    global _pipeline, _metadata
    if _pipeline is None:
        _pipeline = joblib.load(config.YIELD_MODEL)
        meta_path = os.path.join(os.path.dirname(config.YIELD_MODEL), "metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, encoding="utf-8") as f:
                _metadata = json.load(f)
        else:
            _metadata = _generate_fallback_metadata(config.YIELD_MODEL, _pipeline)


def predict_yield(features: dict) -> dict:
    """
    Predict crop yield from a feature dict.
    Any missing column defaults to 0 so partial inputs still work.
    Returns: {yield_value, unit, confidence, model_version, low_confidence, inference_ms}
    """
    _load()
    all_cols = _metadata["features"]
    row = {col: features.get(col, 0) for col in all_cols}
    df = pd.DataFrame([row])

    t0 = time.time()
    prediction = float(_pipeline.predict(df)[0]) * 1000.0  # Convert tons/ha to kg/ha
    elapsed_ms = int((time.time() - t0) * 1000)

    # Confidence from inter-tree variance (lower CV = higher confidence)
    preprocessor = _pipeline.named_steps["preprocessor"]
    X_transformed = preprocessor.transform(df)
    estimators = _pipeline.named_steps["model"].estimators_
    tree_preds = np.array([e.predict(X_transformed)[0] for e in estimators])
    cv = tree_preds.std() / (tree_preds.mean() + 1e-9)
    confidence = float(max(0.0, min(1.0, 1.0 - cv)))

    return {
        "yield_value": round(prediction, 2),
        "unit": "kg/ha",
        "confidence": round(confidence, 3),
        "model_version": _metadata["version"],
        "low_confidence": confidence < config.MIN_CONFIDENCE,
        "inference_ms": elapsed_ms,
    }
