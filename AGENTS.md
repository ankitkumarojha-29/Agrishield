# AGENTS.md — AgriShield (Enterprise PMFBY AI Crop Intelligence Platform)

Single repo. All contributors branch off `main` and open PRs into it — nobody pushes to `main` directly.
This file is read by AI coding agents (Claude Code, Cursor, Antigravity, Codex, etc.) before touching this repo.
Identify your role (e.g. "I'm the Integration Owner", "I'm the AI Developer", "I'm the Website Developer") and start with this guide + `openapi.yaml`.

---

## 1. Project Overview

**AgriShield** is an AI-powered agricultural intelligence, farm-risk monitoring, and spot market platform built for the Pradhan Mantri Fasal Bima Yojana (PMFBY).
Farmers register their land boundary via GPS / map drawing, receive satellite (Sentinel-2/Copernicus NDVI), weather (OpenWeatherMap), and soil (SoilHive / OCR) health monitoring, AI-driven crop health, yield prediction, and risk scoring, live APMC Mandi market rates across 47 Indian agricultural crops and 21 soil types, and automated advisory notifications.

---

## 2. Repo Layout & Active Architecture

```
AgriShield/
  backend/                     # Integration Owner owns this folder (FastAPI + PostGIS + Supabase)
  web/                         # Website Developer owns this folder (Vite + React 18 + TS + Vanilla CSS)
  ai/                          # AI Developer owns this folder (FastAPI port 8001, PyTorch, YOLO, ML)
  openapi.yaml                 # Shared API contract — Single Source of Truth
  future feature/              # Preserved Phase-2 modules (Flutter Mobile App & Blockchain Smart Contracts)
  misc. utilities/             # Project branding & assets (logo.png)
  AGENTS.md                    # This architecture and operational guide
  README.md                    # Platform documentation
```

### Folder Isolation Rule
Stay inside your assigned folder. If a change requires touching another component (e.g. adding a new field that the backend must return, or a new AI feature):
1. Propose and document the change in `openapi.yaml` first.
2. Coordinate with the respective folder owner to pull the contract change into their branch.
3. Never silently edit another developer's core code.

---

## 3. Non-Negotiable Architecture Rules

1. **Integration API is the Single Source of Truth**:
   - `web/` (React) **ONLY** calls the Integration API in `backend/` (`http://localhost:8000/api/v1` or production URL).
   - Web clients never call `ai/` directly, and never connect to PostgreSQL directly.
2. **AI Microservice Independence**:
   - `ai/` runs independently on port `8001`. It performs compute-heavy inference and data aggregation without auth or database logic.
   - `backend/` orchestrates calls to `ai/` via `backend/services/ai_client.py` and persists model outputs.
   - `ai/` supports both live model inference and a synthetic `MOCK_MODE=true` fallback so development never blocks.
   - In cloud deployments (backend on Render), the local AI microservice connects via the secure ngrok tunnel (`start_ai_tunnel.ps1`).
3. **Farmer Identity Model**:
   - Phone number is the farmer identity (`POST /api/v1/auth/register-or-login`). Frictionless OTP confirmation (`MOCK_OTP=true` in dev/demo).
   - Admin accounts authenticate via email/password (`POST /api/v1/auth/login`) with `role='admin'`.
   - Every farmer record (`farms`, `notifications`, `scans`, `soil_reports`) is anchored to a `user_id` foreign key. Queries filter by authenticated `user_id`.
4. **Polygon Geometry Validation**:
   - Client-side pre-checks in Web (closed ring, ≥3 distinct vertices, no self-intersections).
   - Authoritative server-side validation in `backend/services/polygon_validator.py` using Shapely & PostGIS before saving.
   - Farm area in m² and hectares is **always server-computed** — never trust client-sent area.
5. **Resilient Mandi & Telemetry Ingestion**:
   - APMC spot prices and arrivals are cached daily in the PostgreSQL `mandi_rates` table via `services/agmarknet_client.py` with automatic yesterday-feed fallbacks and 47-crop bilingual catalog support.

---

## 4. API Standard & Response Envelope

All Integration API responses follow the standard envelope defined in `openapi.yaml`:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "4f9b23b4-7d52-4cf0-bb4b-324d550302fa",
    "timestamp": "2026-09-14T10:15:30Z"
  },
  "error": null
}
```

On failure:
```json
{
  "success": false,
  "data": null,
  "meta": {
    "request_id": "...",
    "timestamp": "..."
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Polygon geometry has self-intersecting edges.",
    "details": {}
  }
}
```

Standardized error codes from `openapi.yaml#/components/schemas/ErrorCode`:
- `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `FORBIDDEN`
- `VALIDATION_ERROR`, `FARM_BOUNDARY_INVALID`, `FARM_NOT_FOUND`
- `AI_SERVICE_UNAVAILABLE`, `AI_LOW_CONFIDENCE`
- `SERVICE_UNAVAILABLE`, `RATE_LIMITED`

---

## 5. Role Specifications & Deliverables

### ROLE: Integration & Backend Owner (`backend/`)
- **Runtime**: FastAPI on port `8000` (`backend/app/main.py`).
- **Database**: PostgreSQL with PostGIS extension (Supabase), SQLAlchemy async engine (`postgresql+asyncpg://`), connection pooling with `pool_pre_ping=True`.
- **Core Modules**:
  - `api/auth.py`: Phone registration/login (`/auth/register-or-login`), email login (`/auth/login`), profile management (`/auth/profile`).
  - `api/farms.py`: Farm registration with PostGIS geometry, server-side area computation, AI farm proxy endpoints (`crop-health`, `yield-predict`, `risk-score`, `advisory`, `soil/analyze`, `revenue`).
  - `api/mandi.py`: Live APMC spot prices, multi-crop arrivals, official MSP benchmarks, regional summaries, bilingual 47-crop catalog, and 21-soil catalog.
  - `api/weather.py`: Current weather conditions and 7-day agro-meteorological forecasts.
  - `api/satellite.py`: Real-time Sentinel-2 L2A satellite indices (NDVI, NDMI, NDWI).
  - `api/admin.py`: Insurer and admin endpoints for aggregate statistics, system telemetry, farmer directory, and urgent broadcast alerts.
  - `api/notifications.py`: Farmer notifications (severe weather alerts, pest risk warnings, advisory updates).
  - `api/files.py`: Multi-format file uploads and static asset serving.
- **Services**:
  - `services/ai_client.py`: HTTP client communicating with `ai/` on port 8001 with automatic graceful mock fallback.
  - `services/agmarknet_client.py`: Government Agmarknet / Mandi sync engine with PostgreSQL caching.
  - `services/satellite_service.py`: Copernicus Sentinel-2 STAC and vegetative index calculation.
  - `services/weather_client.py`: OpenWeatherMap adapter with caching and fallback.
  - `services/farm_monitor_service.py`: Periodic background farm monitor triggering automated alerts.

### ROLE: Website Developer (`web/`)
- **Stack**: React 18, TypeScript, Vite, Vanilla CSS design system, Lucide icons, Leaflet GIS.
- **Dev Server**: Port `5173`.
- **API Client**: All requests route through `web/src/api/index.ts` using `VITE_API_BASE_URL`. Components never call `fetch`/`axios` directly.
- **Key Pages (16 Pages)**:
  - `Landing.tsx`: Public platform landing page with PMFBY overview and feature highlights.
  - `Login.tsx` & `Register.tsx`: Dual-mode authentication (Farmer phone OTP / Admin credentials).
  - `Dashboard.tsx`: High-level farm metrics, weather cards, soil status, real-time alerts.
  - `MandiPrices.tsx`: APMC mandi arrivals, bilingual search, price spread, and MSP benchmark comparisons.
  - `SoilOCR.tsx`: Soil Health Card OCR scanner with automated nutrient extraction and fertilizer recommendations.
  - `CropScan.tsx`: Foliage disease diagnostic scanner with confidence badges and treatment recommendations.
  - `YieldPrediction.tsx`: Multi-modal yield forecasting (kg/ha) using farm area, soil, and weather inputs.
  - `Advisory.tsx`: Agro-climatic advisory and crop diversification recommendations.
  - `FarmsMap.tsx`: Interactive Leaflet map with PostGIS boundary drawing and acreage calculation.
  - `Farmers.tsx`: Registered farmer directory and landholding records.
  - `Alerts.tsx`: Real-time weather warnings, pest advisories, and admin broadcast console.
  - `Reports.tsx`: Agricultural analytics, crop acreage distribution, and regional summaries.
  - `SystemHealth.tsx`: Real-time AI model latency, database health, and external API uptime telemetry.
  - `Profile.tsx`: User profile, language switcher, and account settings.

### ROLE: AI Developer (`ai/`)
- **Runtime**: FastAPI on port `8001` (`ai/app/main.py`).
- **Core Endpoints**:
  1. `GET /health` — Service status and loaded model versions.
  2. `POST /v1/crop-health` — Image, crop type, growth stage → disease/pest detection, confidence, bounding boxes.
  3. `POST /v1/damage-assessment` — Post-disaster photo(s), crop, event type → damage percentage, severity.
  4. `POST /v1/yield-prediction` — Crop, area (ha), sowing date, history → predicted yield in **kg/ha**, confidence score.
  5. `POST /v1/risk-score` — Weather + crop + soil + historical data → risk score (0–100), risk band, weighted factors.
  6. `POST /v1/soil-ocr` — Soil Health Card PDF/photo → N, P, K, pH values, confidence, extracted text.
  7. `POST /v1/advisory` — Farm context → agronomic recommendations, warnings, and recommended crop types.
- **Rules**:
  - Always return `model_version` and `confidence` (0.0 – 1.0).
  - When confidence falls below threshold, flag with `low_confidence: true`.
  - Maintain `MOCK_MODE=true|false` toggle in `ai/app/config.py`.

---

## 6. Secrets & Environment Configuration

> [!CAUTION]
> **NEVER commit `.env` files, API keys, private keys, or passwords to Git.**
> GitGuardian continuously audits this repository. All template files must use generic placeholders (`your_key_here`, `[YOUR_PASSWORD]`).

### Reference Template Files
Each folder provides a clean `.env.example` file:
- `backend/.env.example`: `DATABASE_URL`, `SECRET_KEY`, `AI_SERVICE_URL`, `COPERNICUS_*`, `OPENWEATHER_API_KEY`, `AGMARKNET_API_KEY`, `PORT`.
- `ai/.env.example`: `PORT=8001`, `MOCK_MODE`, `COPERNICUS_*`, `OPENWEATHER_API_KEY`, `SOILHIVE_*`, `MIN_CONFIDENCE`.
- `web/.env.example`: `VITE_API_BASE_URL`, `VITE_DEMO_MODE=false`.

---

## 7. Local Run Instructions

### 1. AI Inference Service (Port 8001)
```bash
cd ai
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

### 2. Integration Backend API (Port 8000)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On Linux: source venv/bin/activate
pip install -r requirements.txt
# Run migrations & seed data (if fresh DB)
python -m db.init_db
python seed_db.py
# Start API server
uvicorn app.main:app --port 8000 --reload
```

### 3. Website Dashboard (Port 5173)
```bash
cd web
npm install
npm run dev
```

---

## 8. Definition of Done (DoD)

Before opening a PR or merging into `main`:
1. **Contract Compliant**: All responses strictly match `openapi.yaml` and use the standard envelope.
2. **Local Verification**: Happy path and at least one invalid-input error case tested.
3. **No Leaked Secrets**: No `.env` files or credentials committed.
4. **Resilient UI**: Every UI screen handles loading, empty, and error states gracefully.
5. **Clean Build**: `npm run build` in `web/` completes with 0 errors.
