# AgriShield AI Service

AI-powered inference service for PMFBY crop insurance — crop health detection, damage assessment, yield prediction, risk scoring, soil OCR, and agricultural advisory.

> **Hackathon**: Smart VIT 2026 — PS SVH26007  
> **Role**: AI Developer — owns `ai/` only. Never calls `backend/` directly.

---

## Features

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service status + model versions |
| `/v1/crop-health` | POST | Disease / health label from image |
| `/v1/damage-assessment` | POST | Damage % from weather event images |
| `/v1/yield-prediction` | POST | RandomForest yield prediction with live satellite + weather + soil |
| `/v1/risk-score` | POST | Insurance risk score + factor breakdown |
| `/v1/soil-ocr` | POST | Extract N/P/K/pH from PDF or image |
| `/v1/advisory` | POST | Actionable crop recommendations |

---

## Architecture

```
ai/
├── app/                        # FastAPI application
│   ├── main.py                 # App entry point + CORS
│   ├── config.py               # All env-var settings
│   ├── routes/                 # One router per endpoint
│   │   ├── health.py
│   │   ├── crop_health.py
│   │   ├── damage_assessment.py
│   │   ├── yield_prediction.py # Real data pipeline + model
│   │   ├── risk_score.py
│   │   ├── soil_ocr.py
│   │   └── advisory.py
│   ├── schemas/                # Pydantic request/response models
│   └── services/
│       └── data_pipeline.py    # Orchestrates satellite/weather/soil collection
│
├── collection/                 # External data clients
│   ├── satellite/
│   │   ├── sentinel2.py        # Copernicus/Sentinel-2 STAC + download
│   │   └── indices.py          # NDVI / NDWI / NDMI computation
│   ├── weather/
│   │   └── weather_api.py      # OpenWeatherMap current + history
│   ├── soil/
│   │   └── soil_api.py         # SoilHive API — N/P/K/pH/OC
│   ├── geometry/               # Centroid + area utilities
│   └── external/               # Shared HTTP helpers
│
├── feature_engineering/        # Raw API responses → model features
├── inference/                  # Model prediction wrappers
│   ├── yield_prediction.py     # Loads RandomForest .pkl, returns confidence
│   ├── risk_scoring.py
│   ├── crop_health.py
│   ├── damage_assessment.py
│   ├── soil_ocr.py
│   └── advisory.py
├── models/                     # Trained model files + metadata.json
│   ├── yield/
│   │   ├── yield_model.pkl
│   │   └── metadata.json
│   └── risk/
│       ├── risk_model.pkl
│       └── metadata.json
├── training/                   # Training pipelines
│   ├── generate_dataset.py     # Synthetic dataset generator
│   ├── yield/train.py
│   ├── risk/train.py
│   ├── crop_health/train.py
│   └── damage/train.py
├── recommendation/             # Advisory rule engine
├── evaluation/                 # Model metrics + reports
├── utils/                      # Confidence, logging, model loader, validation
├── tests/                      # Test suite
├── data/                       # uploads/ + raw data
├── Dockerfile
├── requirements.txt
└── .env                        # Never commit — see Environment Variables below
```

---

## Quick Start

### 1 — Clone + create virtual environment

```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS
python -m venv venv
source venv/bin/activate
```

### 2 — Install dependencies

```bash
pip install -r requirements.txt
```

### 3 — Configure environment

Copy the example and fill in your API keys:

```bash
cp .env.example .env
# then edit .env
```

Minimum for MOCK_MODE (no real API calls needed):

```env
MOCK_MODE=true
DEBUG=true
```

### 4 — Train models (skip if `.pkl` files already exist in `models/`)

```bash
# Generate synthetic training data + train all models
python training/generate_dataset.py
python training/yield/train.py
python training/risk/train.py
```

### 5 — Run the service

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

| URL | Purpose |
|---|---|
| `http://localhost:8000` | API root |
| `http://localhost:8000/docs` | Swagger UI |
| `http://localhost:8000/redoc` | ReDoc |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MOCK_MODE` | `false` | Return hardcoded demo data — no real models or APIs called |
| `DEBUG` | `false` | Enable FastAPI debug mode |
| `MIN_CONFIDENCE` | `0.7` | Threshold below which `low_confidence: true` is set |
| `MODEL_DIR` | `./models` | Path to trained `.pkl` / `.pt` model files |
| `UPLOAD_DIR` | `./data/uploads` | Temporary storage for uploaded images/PDFs |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `ANALYSIS_DAYS_BACK` | `45` | Sentinel-2 look-back window in days |
| `OPENWEATHER_API_KEY` | — | OpenWeatherMap API key |
| `COPERNICUS_CLIENT_ID` | — | Copernicus OAuth client ID |
| `COPERNICUS_CLIENT_SECRET` | — | Copernicus OAuth client secret |
| `SOILHIVE_CLIENT_ID` | — | SoilHive OAuth client ID |
| `SOILHIVE_CLIENT_SECRET` | — | SoilHive OAuth client secret |

> **Security**: Never commit `.env` or any API keys. All secrets must be in environment variables only — see `AGENTS.md`.

---

## API Reference & curl Examples

### Health

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "ok",
  "mock_mode": false,
  "models": { "yield": "yield-v1.0.0", "risk": "risk-v1.0.0" }
}
```

---

### POST /v1/yield-prediction

Requires farm boundary coordinates for live satellite/weather/soil collection.

```bash
curl -X POST http://localhost:8000/v1/yield-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "wheat",
    "area_ha": 1.5,
    "sowing_date": "2026-06-01",
    "boundary_coordinates": [
      [76.8601, 23.0748],
      [76.8712, 23.0748],
      [76.8712, 23.0831],
      [76.8601, 23.0831],
      [76.8601, 23.0748]
    ],
    "centroid_lat": 23.0789,
    "centroid_lon": 76.8656
  }'
```

**Response**:

```json
{
  "yield_value": 3124.5,
  "unit": "kg/ha",
  "confidence": 0.847,
  "model_version": "yield-v1.0.0",
  "low_confidence": false,
  "inference_ms": 23,
  "data_sources": { "satellite": "live", "weather": "live", "soil": "live" },
  "centroid": { "lat": 23.0789, "lon": 76.8656 }
}
```

> If any external API fails, `data_sources` shows `"fallback"` for that source and backend-provided values are used. The service never crashes due to a failed external call.

---

### POST /v1/risk-score

```bash
curl -X POST http://localhost:8000/v1/risk-score \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "wheat",
    "area_ha": 1.5,
    "boundary_coordinates": [[76.8601,23.0748],[76.8712,23.0748],[76.8712,23.0831],[76.8601,23.0831],[76.8601,23.0748]],
    "centroid_lat": 23.0789,
    "centroid_lon": 76.8656,
    "weather": { "rainfall": 80, "temp_mean": 28, "humidity": 65 },
    "soil":    { "pH": 6.5, "N": 50, "P": 25, "K": 200 },
    "satellite": { "ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0 }
  }'
```

**Response**:

```json
{
  "risk_score": 0.34,
  "risk_band": "LOW",
  "factors": [
    { "name": "drought_risk", "value": 0.2, "weight": 0.3 },
    { "name": "disease_risk", "value": 0.5, "weight": 0.25 }
  ],
  "confidence": 0.81,
  "model_version": "risk-v1.0.0",
  "low_confidence": false
}
```

---

### POST /v1/crop-health (multipart)

```bash
curl -X POST http://localhost:8000/v1/crop-health \
  -F "image=@/path/to/crop.jpg" \
  -F "crop=wheat" \
  -F "growth_stage=vegetative"
```

---

### POST /v1/damage-assessment (multipart)

```bash
curl -X POST http://localhost:8000/v1/damage-assessment \
  -F "images=@before.jpg" \
  -F "images=@after.jpg" \
  -F "crop=rice" \
  -F "event_type=flood"
```

---

### POST /v1/soil-ocr (multipart)

```bash
curl -X POST http://localhost:8000/v1/soil-ocr \
  -F "file=@soil_report.pdf"
```

---

### POST /v1/advisory

```bash
curl -X POST http://localhost:8000/v1/advisory \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "wheat",
    "growth_stage": "vegetative",
    "soil": { "pH": 6.2, "N": 40, "P": 20, "K": 180 },
    "weather": { "rainfall": 60, "temp_mean": 26 }
  }'
```

---

## Response Envelope

All endpoints follow the project-wide response envelope defined in `contracts/openapi.yaml`:

```json
{
  "success": true,
  "data": {},
  "meta": { "request_id": "uuid", "timestamp": "2026-08-16T10:00:00Z" },
  "error": null
}
```

Every response includes `model_version` and `confidence` (0–1). When confidence is below `MIN_CONFIDENCE`, `low_confidence: true` is set — the response is still valid, never an invented diagnosis.

---

## Running Tests

```bash
# Full test suite
pytest tests/ -v

# Quick endpoint smoke test (service must be running on :8000)
python test_all_endpoints.py

# Import sanity check
python test_imports.py

# Inference pipeline test
python test_inference_pipeline.py
```

---

## Training Models

```bash
# 1. Generate a synthetic training dataset (saves to data/)
python training/generate_dataset.py

# 2. Train yield prediction model (RandomForest → models/yield/yield_model.pkl)
python training/yield/train.py

# 3. Train risk scoring model (→ models/risk/risk_model.pkl)
python training/risk/train.py

# 4. Crop health (PyTorch / YOLOv11 — GPU recommended)
python training/crop_health/train.py

# 5. Damage assessment
python training/damage/train.py
```

---

## MOCK_MODE

Set `MOCK_MODE=true` to return realistic hardcoded responses for every endpoint without loading any models or calling external APIs. Unblocks Backend and Web teams before real models are ready.

```env
MOCK_MODE=true
```

All mock responses match the field shapes defined in `contracts/openapi.yaml`.

---

## Data Sources

| Source | Provider | Used For |
|---|---|---|
| Satellite imagery | Copernicus / Sentinel-2 | NDVI, NDWI, NDMI indices |
| Weather | OpenWeatherMap | Rainfall, temperature, humidity, wind |
| Soil | SoilHive API | N, P, K, pH, organic carbon |

If a live source fails, the service falls back to backend-provided values and marks `"fallback"` in `data_sources`. No hard crashes.

---

## Docker

```bash
# Build
docker build -t agrishield-ai .

# Run in mock mode (no GPU, no API keys needed)
docker run -p 8000:8000 -e MOCK_MODE=true agrishield-ai

# Run in live mode
docker run -p 8000:8000 \
  -e MOCK_MODE=false \
  -e COPERNICUS_CLIENT_ID=<your-id> \
  -e COPERNICUS_CLIENT_SECRET=<your-secret> \
  -e OPENWEATHER_API_KEY=<your-key> \
  -e SOILHIVE_CLIENT_ID=<your-id> \
  -e SOILHIVE_CLIENT_SECRET=<your-secret> \
  agrishield-ai
```

---

## Contract

This service is **AI-only** — it never makes insurance decisions, never stores uploaded images, and never calls `backend/` directly.  
All endpoint shapes are defined in `contracts/openapi.yaml`. Do not add new fields without a contract PR first.

---

## License

Proprietary — AgriShield Project 2026 (Smart VIT Hackathon)
