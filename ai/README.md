# AgriShield AI Inference Microservice

AI-powered compute and inference engine for the AgriShield platform — crop foliage disease detection, post-disaster damage assessment, satellite-driven yield prediction, multi-factor risk scoring, soil health card OCR, and agronomic advisory.

> **Platform**: AgriShield Enterprise Agricultural Intelligence Architecture  
> **Role**: AI Microservice Developer — owns `ai/` independently. Operates on port `8001`. Never connects to PostgreSQL directly and never handles user auth.

---

## Features & Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service status + loaded model versions |
| `/v1/crop-health` | POST | Foliage disease / pest detection & bounding boxes from image |
| `/v1/damage-assessment` | POST | Disaster damage % and severity from pre/post event imagery |
| `/v1/yield-prediction` | POST | Multi-modal RandomForest yield prediction (kg/ha) with satellite + weather + soil |
| `/v1/risk-score` | POST | Agro-climatic risk score (0-100) + weighted factor breakdown |
| `/v1/soil-ocr` | POST | OCR extraction of N, P, K, and pH from Soil Health Card PDF/image |
| `/v1/advisory` | POST | Agronomic recommendations, warnings & crop diversification guidance |

---

## Directory Structure

```
ai/
├── app/                        # FastAPI application
│   ├── main.py                 # App entry point (port 8001) + CORS
│   ├── config.py               # Environment configuration
│   ├── routes/                 # Endpoint routers
│   │   ├── health.py
│   │   ├── crop_health.py
│   │   ├── damage_assessment.py
│   │   ├── yield_prediction.py # Real data pipeline + ML model
│   │   ├── risk_score.py
│   │   ├── soil_ocr.py
│   │   └── advisory.py
│   ├── schemas/                # Pydantic request & response schemas
│   └── services/
│       └── data_pipeline.py    # Satellite, weather & soil orchestrator
│
├── collection/                 # External data collectors
│   ├── satellite/
│   │   ├── sentinel2.py        # Copernicus/Sentinel-2 STAC + imagery
│   │   └── indices.py          # NDVI / NDWI / NDMI index computation
│   ├── weather/
│   │   └── weather_api.py      # OpenWeatherMap current & forecast
│   ├── soil/
│   │   └── soil_api.py         # SoilHive API (N, P, K, pH, Organic Carbon)
│   ├── geometry/               # Centroid, area & coordinate utilities
│   └── external/               # Shared HTTP clients
│
├── feature_engineering/        # Raw environmental telemetry → model features
├── inference/                  # Production inference wrappers
│   ├── yield_prediction.py     # RandomForest (.pkl) regression
│   ├── risk_scoring.py         # Multi-factor risk engine
│   ├── crop_health.py          # PyTorch / YOLOv8 leaf disease classifier
│   ├── damage_assessment.py    # Visual damage quantifier
│   ├── soil_ocr.py             # EasyOCR / Tesseract digit extractor
│   └── advisory.py             # Agronomic rule engine
├── models/                     # Trained models & metadata
│   ├── yield/ (yield_model.pkl, metadata.json)
│   └── risk/ (risk_model.pkl, metadata.json)
├── training/                   # Model training pipelines
│   ├── generate_dataset.py
│   ├── yield/train.py
│   ├── risk/train.py
│   ├── crop_health/train.py
│   └── damage/train.py
├── recommendation/             # Advisory rules & agronomy logic
├── tests/                      # Automated test suite
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1 — Create Virtual Environment

```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python -m venv .venv
source .venv/bin/activate
```

### 2 — Install Dependencies

```bash
pip install -r requirements.txt
```

### 3 — Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

To run with live models:
```env
PORT=8001
MOCK_MODE=false
OPENWEATHER_API_KEY=your_key
COPERNICUS_CLIENT_ID=your_id
COPERNICUS_CLIENT_SECRET=your_secret
```

Or for instant zero-dependency testing without API keys:
```env
PORT=8001
MOCK_MODE=true
```

### 4 — Start Service

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

| URL | Purpose |
|---|---|
| `http://localhost:8001` | Service root |
| `http://localhost:8001/health` | Model health & status |
| `http://localhost:8001/docs` | Interactive Swagger API docs |

---

## Cloud Deployment & ngrok Tunnel

When the AgriShield backend is deployed on Render in the cloud, the AI microservice running locally on your laptop can be securely connected via the included PowerShell tunnel script:

```powershell
# From repo root
.\start_ai_tunnel.ps1
```

This launches:
1. AI service on `http://127.0.0.1:8001`.
2. Secure ngrok HTTPS tunnel forwarding to port 8001.
3. Automatically outputs the public URL to set as `AI_SERVICE_URL` in the Render dashboard.

---

## API Reference & Examples

### Health Check

```bash
curl http://localhost:8001/health
```

Response:
```json
{
  "status": "ok",
  "mock_mode": false,
  "models": {
    "yield": "yield-v1.0.0",
    "risk": "risk-v1.0.0"
  }
}
```

### Yield Prediction

```bash
curl -X POST http://localhost:8001/v1/yield-prediction \
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

### Crop Leaf Health Diagnostic

```bash
curl -X POST http://localhost:8001/v1/crop-health \
  -F "image=@leaf_sample.jpg" \
  -F "crop=wheat" \
  -F "growth_stage=vegetative"
```

### Soil Health Card OCR

```bash
curl -X POST http://localhost:8001/v1/soil-ocr \
  -F "file=@soil_card.jpg"
```

---

## Standard Response Envelope

All endpoints return the project-wide response envelope defined in `openapi.yaml`:

```json
{
  "success": true,
  "data": {
    "model_version": "yield-v1.0.0",
    "confidence": 0.88,
    "low_confidence": false
  },
  "meta": {
    "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-14T02:00:00Z"
  },
  "error": null
}
```

Whenever model confidence falls below `MIN_CONFIDENCE` (default 0.70), `low_confidence: true` is flagged so callers can exercise caution without crashing.
