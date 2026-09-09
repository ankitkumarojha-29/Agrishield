# AgriShield AI — Session Context & Handoff

> Last updated: 2026-08-16  
> Owner: AI Developer (`ai/` folder only)

---

## Current Status: Live Pipeline Working (2 of 3 APIs green)

The AI service runs in **live mode** (not MOCK_MODE). Real satellite and weather data are
being fetched and fed into the trained ML models. Soil data falls back gracefully due to
a missing package (`openepi-client`).

### API Health at Last Test Run

| Data Source | Status | Notes |
|---|---|---|
| Sentinel-2 / Copernicus | ✅ **LIVE** | Real NDVI/NDWI/NDMI fetched for farm polygon |
| OpenWeatherMap | ✅ **LIVE** | Real temp, rainfall, humidity for centroid |
| SoilHive (via openepi-client) | ⚠️ **FALLBACK** | `openepi-client` not installed — using backend-provided N/P/K/pH |

---

## Verified Sample Responses (from `response.json` / `test_result.json`)

### GET /health

```json
{
  "status": "healthy",
  "service": "agrishield-ai",
  "version": "1.0.0"
}
```

### POST /v1/crop-health

**Request**: `multipart/form-data` — `crop=wheat`, `growth_stage=vegetative`, `image=dummy.jpg`

```json
{
  "label": "healthy",
  "severity": "none",
  "confidence": 0.91,
  "boxes": [],
  "model_version": "mock-crop-v1",
  "low_confidence": false,
  "inference_ms": 45
}
```

> Still returning mock values — real PyTorch/YOLO model not yet wired in live mode.

### POST /v1/damage-assessment

**Request**: `multipart/form-data` — `crop=wheat`, `event_type=flood`, `images=dummy.jpg`

```json
{
  "damage_pct": 0.28,
  "severity": "moderate",
  "detections": [{ "label": "flood", "area_pct": 0.28, "confidence": 0.87 }],
  "confidence": 0.87,
  "model_version": "mock-damage-v1",
  "low_confidence": false,
  "inference_ms": 320
}
```

> Still returning mock values — same as crop-health.

### POST /v1/yield-prediction ✅ LIVE MODEL

**Request** (key fields):
```json
{
  "crop": "wheat",
  "area_ha": 1.5,
  "boundary_coordinates": [
    [76.86255555555555, 23.075],
    [76.86388888888888, 23.07522222222222],
    [76.86391666666665, 23.074305555555554],
    [76.8628611111111,  23.07425],
    [76.86255555555555, 23.075]
  ],
  "centroid_lat": 23.07471395,
  "centroid_lon": 76.8633177,
  "rainfall": 80,
  "temp_mean": 25
}
```

**Response**:
```json
{
  "yield_value": 4.5,
  "unit": "kg/ha",
  "confidence": 0.926,
  "model_version": "yield-v1.0.0",
  "low_confidence": false,
  "inference_ms": 89,
  "data_sources": { "satellite": "live", "weather": "live", "soil": "fallback" },
  "centroid": { "lat": 23.07471395, "lon": 76.8633177 },
  "warnings": [
    "Soil API failed (openepi-client not installed. Run: pip install openepi-client). Using backend fallback values."
  ]
}
```

> **Note**: `yield_value: 4.5 kg/ha` looks abnormally low for wheat — expected range 2500–4500 kg/ha.
> The trained model may need re-training on a dataset with realistic yield units (verify `generate_dataset.py` target scale).

### POST /v1/risk-score ✅ LIVE MODEL

**Response**:
```json
{
  "risk_score": 1.0,
  "risk_band": "critical",
  "factors": [{ "name": "Low vegetation index", "contribution": 0.2 }],
  "confidence": 0.746,
  "model_version": "risk-v1.0.0",
  "low_confidence": false,
  "inference_ms": 88,
  "data_sources": { "satellite": "live", "weather": "live", "soil": "fallback" }
}
```

> **Note**: `risk_score: 1.0` (maximum) on a normal wheat field is suspicious — may be a feature
> scaling issue or the training data's risk labels being too aggressive. Investigate `training/risk/train.py`.

### POST /v1/soil-ocr ⚠️ FALLBACK

**Response**:
```json
{
  "N": 45.0, "P": 22.0, "K": 180.0, "pH": 6.5,
  "confidence": 0.4,
  "extracted_text": "OCR failed: No module named 'easyocr'",
  "model_version": "fallback-v1",
  "low_confidence": true,
  "inference_ms": 0
}
```

> Fix: `pip install easyocr` in the active venv.

### POST /v1/advisory ✅ WORKING (Rule-Based)

**Response**:
```json
{
  "recommendations": [
    "Apply nitrogen at tillering stage",
    "Monitor for yellow rust",
    "Irrigate at crown root initiation"
  ],
  "warnings": [],
  "model_version": "advisory-rules-v1.0",
  "confidence": 0.85,
  "low_confidence": false,
  "inference_ms": 2
}
```

---

## What Is Done

1. **Real Data Pipeline** (`app/services/data_pipeline.py`)  
   Async orchestrator that collects real Sentinel-2, OpenWeather, and SoilHive data using
   the farm's `boundary_coordinates` and `centroid_lat/lon`. Fully resilient — any API failure
   causes a graceful fallback with a warning in the response; never a crash.

2. **Trained ML Models**  
   - `models/yield/yield_model.pkl` — scikit-learn RandomForest pipeline, trained by `training/yield/train.py`  
   - `models/risk/risk_model.pkl` — scikit-learn RandomForest, trained by `training/risk/train.py`  
   - Both load via `joblib` inside `inference/yield_prediction.py` and `inference/risk_scoring.py`

3. **Yield & Risk Endpoints — Live** (`/v1/yield-prediction`, `/v1/risk-score`)  
   Accept `boundary_coordinates` + `centroid_lat/lon` → collect real satellite/weather →
   build feature dict → run model → return `model_version`, `confidence`, `data_sources`, optional `warnings`.

4. **Inference Confidence**  
   Confidence is computed from inter-tree variance of the RandomForest estimators (lower CV = higher confidence).

5. **Import Safety**  
   All `collection/` modules (sentinel2, weather_api, soil_api) wrap CLI demo code in
   `if __name__ == "__main__":` to avoid execution on import by FastAPI.

6. **MOCK_MODE**  
   All 7 endpoints return valid, shape-correct hardcoded responses when `MOCK_MODE=true`.

7. **Test Suite**  
   - `test_all_endpoints.py` — smoke tests all endpoints against a running server  
   - `test_inference_pipeline.py` — tests the data pipeline without a running server  
   - `test_imports.py` — sanity checks all module imports

---

## Known Issues & Fixes Required

### 1. `easyocr` Not Installed — Soil OCR Broken
- **Symptom**: `"OCR failed: No module named 'easyocr'"`, `"confidence": 0.4`, `"low_confidence": true`
- **Fix**: `pip install easyocr` in active venv, then re-run

### 2. `openepi-client` / SoilHive Falling Back
- **Symptom**: `"soil": "fallback"` in `data_sources`, warning in response
- **Fix**: `pip install openepi-client` OR verify the SoilHive credentials in `.env` are valid and not expired
- The `SOILHIVE_API_TOKEN` in `.env` has an expiry (`"exp"` in JWT payload) — may need refresh

### 3. Yield Value Suspiciously Low (4.5 kg/ha for wheat)
- **Expected**: 2500–4500 kg/ha  
- **Likely cause**: `training/generate_dataset.py` generates yield targets in wrong scale or the model wasn't re-trained after a dataset fix
- **Fix**: Check the `yield` column in the generated dataset CSV; re-run `python training/yield/train.py`

### 4. Risk Score Always `1.0` (critical) on Normal Fields
- **Likely cause**: Feature scaling mismatch or wrong label encoding in risk training data
- **Fix**: Inspect `training/risk/train.py` — check feature ranges and label distribution

### 5. Crop Health & Damage Still on Mock
- Real PyTorch/YOLO `.pt` files need to exist in `models/crop_health/model.pt` and `models/damage/model.pt`
- Until then, both endpoints return MOCK responses even in live mode

---

## Next Steps (Prioritised)

1. **Fix yield unit scale** — inspect `generate_dataset.py` yield column, retrain `yield_model.pkl`
2. **Fix risk model calibration** — audit risk training labels, retrain `risk_model.pkl`
3. **`pip install easyocr`** — restore soil OCR to live (currently returns fallback values + `low_confidence: true`)
4. **Rotate SoilHive token** if expired — or switch to direct `SOILHIVE_CLIENT_ID`/`SECRET` OAuth flow
5. **Wire real crop-health/damage models** (`model.pt`) once training is done
6. **Clean up `sentinel2.py` indentation** at line 251 in the CLI block (cosmetic, not blocking)
7. **End-to-end test** with the Backend team sending real farm boundary from PostGIS

---

## Environment (.env keys in use)

```
COPERNICUS_CLIENT_ID      ✅ Set
COPERNICUS_CLIENT_SECRET  ✅ Set
OPENWEATHER_API_KEY       ✅ Set
SOILHIVE_CLIENT_ID        ✅ Set
SOILHIVE_CLIENT_SECRET    ✅ Set
SOILHIVE_API_TOKEN        ⚠️ May be expired (check JWT exp)
MOCK_MODE                 false (live mode)
DEBUG                     (not set — defaults to false)
MIN_CONFIDENCE            (not set — defaults to 0.7)
ANALYSIS_DAYS_BACK        (not set — defaults to 45 days)
```
