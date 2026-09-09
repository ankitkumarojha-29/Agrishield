# AGENTS.md — AgriShield (Smart VIT Hackathon 2026, PS SVH26007)

Single repo. All contributors branch off `main` and open PRs into it — nobody pushes to `main` directly.
This file is read by AI coding agents (Claude Code, Cursor, Antigravity, Codex, etc.) before touching this repo.
Identify your role (e.g. "I'm the Integration Owner", "I'm the AI Developer", "I'm the Website Developer", "I'm the Flutter App Developer", "I'm the Blockchain Engineer") and start with this guide + `openapi.yaml`.

---

## 1. Project Overview

**AgriShield** is an AI-powered crop insurance & farm-risk platform built for the Pradhan Mantri Fasal Bima Yojana (PMFBY).
Farmers register their land boundary via GPS / map drawing, receive satellite (Sentinel-2/Copernicus), weather (OpenWeather), and soil (SoilHive / OCR) health monitoring, AI-driven crop health, yield, and risk scoring, dynamic insurance pricing with PMFBY compliance, and blockchain-audited policy and claim records timestamped on the Polygon Amoy testnet.

---

## 2. Repo Layout & Folder Ownership

```
AgriShield/
  ai/                          # AI Developer owns this folder
  backend/                     # Integration Owner owns this folder (FastAPI + PostGIS)
  web/                         # Website Developer owns this folder (Vite + React + TS)
  app/                         # Flutter App Developer owns this folder (Flutter Mobile/Web)
  blockchain/                  # Blockchain Engineer owns this folder (Hardhat + Solidity)
  contracts/ & openapi.yaml    # Shared API contract — PR & review before editing
  stitch_agrishield_farmer_app/# Design exports and UI specifications from Stitch
  misc. utilities/             # Project branding & assets (logo.png)
  AGENTS.md                    # This architecture and operational guide
```

### Folder Isolation Rule
Stay inside your assigned folder. If a change requires touching another component (e.g. adding a new field that the backend must return, or a new AI feature):
1. Propose and document the change in `openapi.yaml` first.
2. Coordinate with the respective folder owner to pull the contract change into their branch.
3. Never silently edit another developer's core code.

---

## 3. Non-Negotiable Architecture Rules

1. **Integration API is the Single Source of Truth**:
   - `app/` (Flutter) and `web/` (React) **ONLY** call the Integration API in `backend/` (`http://localhost:8000/api/v1`).
   - Neither client ever calls `ai/` directly, and neither client ever connects to PostgreSQL directly.
2. **AI Microservice Independence**:
   - `ai/` runs independently on port `8001`. It performs compute-heavy inference and data aggregation without auth or database logic.
   - `backend/` orchestrates calls to `ai/` via `backend/services/ai_client.py` and persists model outputs.
   - `ai/` supports both live model inference and a synthetic `MOCK_MODE=true` fallback so development never blocks.
3. **Farmer Identity Model**:
   - Phone number is the farmer identity (`POST /api/v1/auth/register-or-login`). No friction, quick OTP confirmation (`MOCK_OTP=true` in dev/demo).
   - Admin accounts authenticate via email/password (`POST /api/v1/auth/login`) with `role='admin'`.
   - Every farmer record (`farms`, `policies`, `claims`, `notifications`) is anchored to a `user_id` foreign key. Queries must filter by the authenticated `user_id`.
4. **Polygon Geometry Validation**:
   - Client-side pre-checks in Flutter / Web (closed ring, ≥3 distinct vertices, no self-intersections).
   - Authoritative server-side validation in `backend/services/polygon_validator.py` using Shapely & PostGIS before saving.
   - Farm area in m² and hectares is **always server-computed** — never trust client-sent area.
5. **Blockchain Auditability**:
   - Policies and claims are hashed using SHA-256 to create canonical records.
   - Hashes are recorded on-chain in `AgriShieldRecords.sol` deployed on the Polygon Amoy testnet (`0x479c319C22928FF293713e70F24d399220d46876`).
   - Verification endpoint (`GET /insurance/policies/{id}/verification`) compares DB state hash against the immutable on-chain record.

---

## 4. API Standard & Response Envelope

All Integration API responses follow the standard envelope defined in `openapi.yaml`:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "4f9b23b4-7d52-4cf0-bb4b-324d550302fa",
    "timestamp": "2026-09-05T10:15:30Z"
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

Use standardized error codes from `openapi.yaml#/components/schemas/ErrorCode`:
- `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `FORBIDDEN`
- `VALIDATION_ERROR`, `FARM_BOUNDARY_INVALID`, `FARM_NOT_FOUND`
- `AI_SERVICE_UNAVAILABLE`, `AI_LOW_CONFIDENCE`
- `CLAIM_NOT_FOUND`, `POLICY_NOT_FOUND`, `BLOCKCHAIN_SYNC_FAILED`

---

## 5. Role Specifications & Deliverables

### ROLE: AI Developer (`ai/`)
- **Runtime**: FastAPI on port `8001` (`ai/app/main.py`).
- **Core Endpoints**:
  1. `GET /health` — Service status and loaded model versions.
  2. `POST /v1/crop-health` — Image, crop type, growth stage → disease/pest detection, confidence, bounding boxes.
  3. `POST /v1/damage-assessment` — Post-disaster photo(s), crop, event type → damage percentage, severity, detections.
  4. `POST /v1/yield-prediction` — Crop, area (ha), sowing date, history → predicted yield in **kg/ha**, confidence score.
  5. `POST /v1/risk-score` — Weather + crop + soil + historical data → risk score (0–100), risk band (LOW/MODERATE/HIGH/SEVERE), weighted factors.
  6. `POST /v1/soil-ocr` — Soil Health Card PDF/photo → N, P, K, pH values, confidence, extracted text.
  7. `POST /v1/advisory` — Farm context → agronomic recommendations, warnings, and recommended crop types for unsown farms.
- **Rules**:
  - Always return `model_version` and `confidence` (0.0 – 1.0).
  - When confidence falls below threshold, flag with `low_confidence: true` rather than inventing diagnoses.
  - Maintain `MOCK_MODE=true|false` toggle in `ai/app/config.py`.
  - Integrations: Copernicus Data Space (Sentinel-2 NDVI), OpenWeatherMap, SoilHive API.

### ROLE: Integration & Backend Owner (`backend/`)
- **Runtime**: FastAPI on port `8000` (`backend/app/main.py`).
- **Database**: PostgreSQL with PostGIS extension (Supabase), SQLAlchemy async engine (`postgresql+asyncpg://`), Alembic migrations.
- **Modules**:
  - `api/auth.py`: Phone registration/login (`/auth/register-or-login`), email login (`/auth/login`), profile management (`/auth/profile`).
  - `api/farms.py`: Farm registration with PostGIS geometry, server-side area computation, listing filtered by `user_id`.
  - `api/insurance.py`: PMFBY dynamic quotes based on AI risk scores and area, policy purchase with SHA-256 state hashing and Polygon Amoy recording, policy verification (`/insurance/policies/{id}/verification`).
  - `api/claims.py`: Claim submission with photo upload, automated AI damage assessment, blockchain claim state recording, claim timeline and audit log.
  - `api/admin.py`: Insurer/admin endpoints for reviewing claims, approving/rejecting claims, viewing all farmers and aggregate statistics.
  - `api/notifications.py`: Farmer notifications (weather alerts, policy confirmations, claim status changes).
  - `api/files.py`: File upload and static asset serving.
- **Services**:
  - `services/ai_client.py`: HTTP client communicating with `ai/` on port 8001 with automatic graceful mock fallback.
  - `services/blockchain_service.py`: Web3 integration with Polygon Amoy testnet contract (`AgriShieldRecords.sol`).
  - `services/polygon_validator.py`: Geometry validation (closed ring, ≥3 points, self-intersection rejection, area range check).
  - `services/pricing_service.py`: PMFBY premium calculations (2% Kharif, 1.5% Rabi, 5% commercial/horticultural actuarial bounds).
  - `services/weather_client.py`: Weather adapter with caching and fallback.

### ROLE: Website Developer (`web/`)
- **Stack**: React 18, TypeScript, Vite, Vanilla CSS design system, Lucide icons, Leaflet for maps.
- **Dev Server**: Port `5173`.
- **API Client**: All requests route through `web/src/api/index.ts` using `VITE_API_BASE_URL`. Components never call `fetch`/`axios` directly.
- **Key Pages**:
  - `Landing.tsx`: Public platform landing page with PMFBY overview and feature highlights.
  - `Login.tsx` & `Register.tsx`: Role-based authentication (Admin / Insurer / Farmer).
  - `Dashboard.tsx`: High-level metrics, claim status breakdown, active policies, real-time alerts.
  - `Farmers.tsx`: List and management of registered farmers, their farms, and contact details.
  - `FarmsMap.tsx`: Interactive Leaflet map displaying registered PostGIS farm boundaries, crop types, and status.
  - `Claims.tsx`: Claim review queue with AI damage assessment, confidence score, photo evidence preview, and one-click Approve / Reject.
  - `Policies.tsx`: Active insurance policies with coverage, premium, and farm links.
  - `Verification.tsx`: Direct on-chain blockchain audit tool — verifies policy/claim SHA-256 hashes against the Polygon Amoy smart contract.
  - `Reports.tsx`: Risk and payout analytics reports.
  - `Profile.tsx`: User profile and role management.
- **Rules**:
  - Always render loading, empty, error, and retry states.
  - Display AI confidence score and model version on all AI-assisted results.
  - Show "AI-assisted / Demo" badges on hackathon insurance decisions.

### ROLE: Flutter App Developer (`app/`)
- **Stack**: Flutter 3 (Android, iOS, Web, Desktop), Riverpod state management, typed `ApiClient`.
- **Design System**: Strict adherence to Stitch exports in `stitch_agrishield_farmer_app/`.
  - Primary: Deep Forest Green (`#1B7A3D`)
  - Accent: Warm Harvest Orange (`#F5821F`)
  - Neutral: Off-white background, clean elevated cards, modern typography.
- **Screens (13 Screens)**:
  1. `onboarding_screen.dart`: Multi-language selection (English, Hindi, regional languages).
  2. `login_screen.dart`: Phone number entry, quick OTP, JWT session storage.
  3. `dashboard_screen.dart`: Farmer home overview, active farms, active policies, weather cards, rapid actions.
  4. `add_farm_screen.dart`: Interactive GPS / map boundary tool with client-side polygon validation and area display.
  5. `farm_detail_screen.dart`: Farm health, satellite NDVI index, crop advisory, soil health summaries.
  6. `crop_photo_scan_screen.dart`: Camera/gallery photo capture with instant AI pest & disease detection.
  7. `soil_report_screen.dart`: Soil Health Card upload, OCR extraction of N, P, K, pH, and crop recommendation.
  8. `insurance_quote_screen.dart`: Dynamic PMFBY quote calculation based on farm area and AI risk score, one-click purchase with idempotency key.
  9. `file_claim_screen.dart`: Post-disaster claim filing with photo evidence, disaster type selector, instant AI damage assessment.
  10. `claim_timeline_screen.dart`: 4-step audit timeline (Filed → AI Assessed → Insurer Reviewed → Blockchain Timestamped).
  11. `notifications_screen.dart`: Critical weather warnings, policy receipts, and claim payout updates.
  12. `profile_screen.dart`: Farmer identity details, language switcher, farm summary.
  13. `main_screen.dart`: Bottom navigation container.
- **Rules**:
  - Client-side polygon pre-check before submission (closed ring, ≥3 points, no self-intersections).
  - Never store access tokens in plaintext files; use secure storage.
  - Support offline UX with clean error messaging.

### ROLE: Blockchain Engineer (`blockchain/`)
- **Stack**: Solidity `^0.8.20`, Hardhat, Ethers.js, Polygon Amoy Testnet.
- **Contract**: `blockchain/contracts/AgriShieldRecords.sol`:
  - `recordPolicy(bytes32 policyId, bytes32 stateHash)`: Records immutable policy state hash with timestamp.
  - `recordClaim(bytes32 claimId, bytes32 stateHash)`: Records immutable claim state hash with timestamp.
  - `verifyPolicy(bytes32 policyId)`: View function returning timestamp, recorded hash, and recorder address.
  - `verifyClaim(bytes32 claimId)`: View function returning timestamp, recorded hash, and recorder address.
- **Deployment**:
  - Network: Polygon Amoy Testnet (Chain ID `80002`).
  - Contract Address: `0x479c319C22928FF293713e70F24d399220d46876`.
  - Explorer: [PolygonScan Amoy Explorer](https://amoy.polygonscan.com/address/0x479c319C22928FF293713e70F24d399220d46876).

---

## 6. Secrets & Environment Configuration

> [!CAUTION]
> **NEVER commit `.env` files, API keys, private keys, or credentials to Git.**
> All real secrets are kept in the untracked private configuration guide `LOCAL_SECRETS_SETUP.md` (ignored by `.gitignore`).

### Template Reference Files
Each folder provides an `.env.example` file showing the required variables:
- `backend/.env.example`: `DATABASE_URL`, `SECRET_KEY`, `AI_SERVICE_URL`, `POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `SMART_CONTRACT_ADDRESS`.
- `ai/.env.example`: `MOCK_MODE`, `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`, `OPENWEATHER_API_KEY`, `SOILHIVE_*`.
- `web/.env.example`: `VITE_API_BASE_URL`, `VITE_DEMO_MODE`.
- `blockchain/.env.example`: `POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`.

---

## 7. Local Run Instructions

### 1. AI Inference Service (Port 8001)
```bash
cd ai
# Activate virtual environment
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

### 2. Integration Backend API (Port 8000)
```bash
cd backend
# Activate virtual environment
source venv/bin/activate     # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Run database setup and seeds (if setting up fresh DB)
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

### 4. Flutter Farmer App
```bash
cd app
flutter pub get
# Run in Chrome, Emulator, or connected device
flutter run
```

---

## 8. Definition of Done (DoD)

Before opening a PR or merging into `main`:
1. **Contract Compliant**: All responses strictly match `openapi.yaml` and use the standard envelope.
2. **Local Verification**: Happy path and at least one invalid-input error case tested.
3. **No Leaked Secrets**: No `.env`, private keys, or credentials committed.
4. **Resilient UI**: Every UI screen handles loading, empty, and error states gracefully.
5. **Clean Checkout**: Project builds from a fresh checkout following the instructions above.
