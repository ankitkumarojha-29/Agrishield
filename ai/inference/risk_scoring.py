"""Risk scoring inference — loads trained RandomForest pipeline."""
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
        "model": "risk_score",
        "version": "risk-v1.0.0",
        "algorithm": "RandomForestRegressor",
        "target": "risk_score",
        "features": list(pipeline.feature_names_in_) if hasattr(pipeline, "feature_names_in_") else [
            "crop", "area_ha", "rainfall", "temp_mean", "humidity",
            "soil_ph", "nitrogen", "phosphorus", "potassium",
            "ndvi_mean", "ndwi_mean", "ndmi_mean",
            "yield_prediction", "disease_probability", "historical_loss",
        ],
    }
    meta_path = os.path.join(os.path.dirname(model_path), "metadata.json")
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=4)
    except Exception:
        pass
    return meta


def _load():
    global _pipeline, _metadata
    if _pipeline is None:
        _pipeline = joblib.load(config.RISK_MODEL)
        meta_path = os.path.join(os.path.dirname(config.RISK_MODEL), "metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, encoding="utf-8") as f:
                _metadata = json.load(f)
        else:
            _metadata = _generate_fallback_metadata(config.RISK_MODEL, _pipeline)


def _risk_band(score: float) -> str:
    # score is now correctly in [0, 1]
    if score < 0.25:
        return "low"
    if score < 0.50:
        return "medium"
    if score < 0.75:
        return "high"
    return "critical"


def _derive_factors(features: dict) -> list:
    """
    Return contributing risk factors that mirror the 5 training risk components:
      weather_risk      — rainfall extremes + heat stress
      crop_health_risk  — NDVI (vegetation vigour) + disease pressure
      moisture_risk     — NDWI / NDMI (water stress / moisture deficit)
      soil_risk         — pH deviation + nutrient deficit (N/P/K)
      historical_risk   — historical loss rate

    Thresholds derived from generate_dataset.py risk formula.
    """
    factors = []

    # ── Weather risk ─────────────────────────────────────────────────────────
    rainfall = features.get("rainfall", 650)
    temp_mean = features.get("temp_mean", 27)

    if rainfall > 1100:
        factors.append({
            "name": "Excessive rainfall (flood risk)",
            "contribution": round(min(0.35, (rainfall - 1100) / 1000), 3),
        })
    elif rainfall < 300:
        factors.append({
            "name": "Severe drought (low rainfall)",
            "contribution": round(min(0.30, (300 - rainfall) / 600), 3),
        })

    if temp_mean > 35:
        factors.append({
            "name": "Heat stress",
            "contribution": round(min(0.25, (temp_mean - 35) / 28), 3),
        })

    # ── Crop health risk ─────────────────────────────────────────────────────
    ndvi = features.get("ndvi_mean", 0.5)
    disease_prob = features.get("disease_probability", 0.0)

    if ndvi < 0.40:
        factors.append({
            "name": "Low vegetation index (poor crop vigour)",
            "contribution": round(min(0.30, (0.40 - ndvi) / 0.40), 3),
        })
    if disease_prob > 0.35:
        factors.append({
            "name": "High disease pressure",
            "contribution": round(min(0.40, disease_prob * 0.50), 3),
        })

    # ── Moisture risk ─────────────────────────────────────────────────────────
    ndwi = features.get("ndwi_mean", -0.12)
    ndmi = features.get("ndmi_mean", 0.25)

    if ndwi > 0.25:
        factors.append({
            "name": "Waterlogging (high NDWI)",
            "contribution": round(min(0.25, (ndwi - 0.25) / 0.55), 3),
        })
    elif ndmi < 0.05:
        factors.append({
            "name": "Moisture deficit (low NDMI)",
            "contribution": round(min(0.20, (0.05 - ndmi) / 0.45), 3),
        })

    # ── Soil risk ─────────────────────────────────────────────────────────────
    soil_ph = features.get("soil_ph", 6.7)
    nitrogen = features.get("nitrogen", 240)
    phosphorus = features.get("phosphorus", 24)
    potassium = features.get("potassium", 180)

    ph_deviation = abs(soil_ph - 6.7)
    if ph_deviation > 1.0:
        factors.append({
            "name": f"Soil pH deviation (pH={soil_ph:.1f}, optimal=6.7)",
            "contribution": round(min(0.20, ph_deviation / 3.6), 3),
        })

    # Nutrient deficit: (N/300 + P/30 + K/200) / 3 should be >= 1 for optimal
    nutrient_index = ((nitrogen / 300) + (phosphorus / 30) + (potassium / 200)) / 3
    if nutrient_index < 0.60:
        factors.append({
            "name": "Low soil nutrients (N/P/K deficit)",
            "contribution": round(min(0.30, (1.0 - nutrient_index) * 0.40), 3),
        })

    # ── Historical risk ───────────────────────────────────────────────────────
    hist_loss = features.get("historical_loss", 0.0)
    if hist_loss > 0.25:
        factors.append({
            "name": "High historical loss rate",
            "contribution": round(min(0.25, hist_loss * 0.35), 3),
        })

    return factors


def score_risk(features: dict) -> dict:
    """
    Score farm risk from a feature dict.
    Any missing column defaults to 0.
    Returns: {risk_score, risk_band, factors, confidence, model_version, low_confidence, inference_ms}

    NOTE: The training data uses risk_score on a 0-100 scale.
    We divide the raw model output by 100 to normalise to [0, 1].
    """
    _load()
    all_cols = _metadata["features"]
    row = {col: features.get(col, 0) for col in all_cols}
    df = pd.DataFrame([row])

    t0 = time.time()
    raw_score = float(_pipeline.predict(df)[0])
    elapsed_ms = int((time.time() - t0) * 1000)

    # ── FIX: training target is 0–100; normalise to [0, 1] ───────────────────
    score = max(0.0, min(1.0, raw_score / 100.0))

    # Confidence from inter-tree variance (lower CV = higher confidence)
    preprocessor = _pipeline.named_steps["preprocessor"]
    X_transformed = preprocessor.transform(df)
    estimators = _pipeline.named_steps["model"].estimators_
    tree_preds = np.array([e.predict(X_transformed)[0] for e in estimators])
    # Normalise tree predictions to [0,1] before computing CV
    tree_preds_norm = tree_preds / 100.0
    cv = tree_preds_norm.std() / (tree_preds_norm.mean() + 1e-9)
    confidence = float(max(0.0, min(1.0, 1.0 - cv)))

    return {
        "risk_score":    round(score, 3),
        "risk_band":     _risk_band(score),
        "factors":       _derive_factors(features),
        "confidence":    round(confidence, 3),
        "model_version": _metadata["version"],
        "low_confidence": confidence < config.MIN_CONFIDENCE,
        "inference_ms":  elapsed_ms,
    }
