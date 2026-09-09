# 🌱 AgriShield — AI-Powered Crop Insurance & Farm-Risk Platform

[![Smart VIT Hackathon 2026](https://img.shields.io/badge/Hackathon-Smart_VIT_2026-008080?style=for-the-badge)](https://vit.ac.in)
[![Problem Statement](https://img.shields.io/badge/Problem_Statement-SVH26007-orange?style=for-the-badge)](https://pmfby.gov.in)
[![Polygon Amoy](https://img.shields.io/badge/Blockchain-Polygon_Amoy_Testnet-8247E5?style=for-the-badge&logo=polygon&logoColor=white)](https://amoy.polygonscan.com/address/0x479c319C22928FF293713e70F24d399220d46876)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_PostGIS-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/AI-PyTorch_%2B_EfficientNet-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![React](https://img.shields.io/badge/Web-React_18_%2B_Vite_%2B_TS-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter_3_%2B_Riverpod-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)

> **Empowering smallholder farmers and insurers under the Pradhan Mantri Fasal Bima Yojana (PMFBY) through automated satellite earth observation, deep learning computer vision, hyper-local weather intelligence, statutory PMFBY actuarial pricing, and tamper-proof blockchain audit trails.**

---

## 📑 Table of Contents

1. [Executive Summary and Problem Statement](#1-executive-summary-and-problem-statement)
2. [Key Innovations and Technical Highlights](#2-key-innovations-and-technical-highlights)
3. [System Architecture and Data Flow](#3-system-architecture-and-data-flow)
4. [Repository Structure and Codebase Ownership](#4-repository-structure-and-codebase-ownership)
5. [End-to-End Operational Workflows](#5-end-to-end-operational-workflows)
6. [Backend Integration Engine (`backend/`)](#6-backend-integration-engine-backend)
7. [AI & Computer Vision Microservice (`ai/`)](#7-ai-computer-vision-microservice-ai)
   - [7.1 Model 1: Multi-Source Crop Yield Prediction Regressor](#71-model-1-multi-source-crop-yield-prediction-regressor)
   - [7.2 Model 2: PMFBY Actuarial Risk Scoring and Factor Decomposition Engine](#72-model-2-pmfby-actuarial-risk-scoring-and-factor-decomposition-engine)
   - [7.3 Model 3: Deep Learning Crop Disease and Pest Identification](#73-model-3-deep-learning-crop-disease-and-pest-identification)
   - [7.4 Model 4: Post-Disaster Damage Assessment and Loss Quantification](#74-model-4-post-disaster-damage-assessment-and-loss-quantification)
   - [7.5 Model 5: Soil Health Card OCR Parser](#75-model-5-soil-health-card-ocr-parser)
   - [7.6 Model 6: Agronomic Advisory and Crop Recommendation Expert System](#76-model-6-agronomic-advisory-and-crop-recommendation-expert-system)
   - [7.7 Data Harvesting and Remote Sensing Pipelines](#77-data-harvesting-and-remote-sensing-pipelines)
8. [Blockchain Audit Ledger (`blockchain/`)](#8-blockchain-audit-ledger-blockchain)
9. [Insurer and Admin Web Portal (`web/`)](#9-insurer-and-admin-web-portal-web)
10. [Farmer Mobile Application (`app/`)](#10-farmer-mobile-application-app)
11. [Two-Way Synchronization and Notification Engine](#11-two-way-synchronization-and-notification-engine)
12. [Complete REST API Contract and Envelope Specification](#12-complete-rest-api-contract-and-envelope-specification)
13. [Environment Configuration and Secrets](#13-environment-configuration-and-secrets)
14. [Step-by-Step Installation and Local Runbook](#14-step-by-step-installation-and-local-runbook)
15. [Testing and Verification Guide](#15-testing-and-verification-guide)
16. [PMFBY Compliance and Hackathon Edge](#16-pmfby-compliance-and-hackathon-edge)

---

## 1. Executive Summary and Problem Statement

### 🌾 The PMFBY Challenge
The **Pradhan Mantri Fasal Bima Yojana (PMFBY)** is one of the world's largest crop insurance schemes, shielding millions of Indian farmers against unavoidable natural calamities. However, its real-world implementation faces severe bottlenecks:

1. **Slow & Subjective Damage Assessments**: Crop Cutting Experiments (CCEs) and manual physical surveys take months, leaving distressed farmers without emergency working capital.
2. **High Dispute Rates & Lack of Transparency**: Disagreements between farmers, local revenue authorities, and insurance companies over assessed yield loss and claim percentages lead to prolonged litigation.
3. **Complex Actuarial Calculations & Information Asymmetry**: Farmers rarely know how their premiums are calculated, how much government subsidy is applied, or what their fair market value is at harvest.
4. **Data Tampering & Trust Deficits**: Audit trails for filed claims and policy records are vulnerable to retrospective tampering or administrative loss.

### 🛡️ The AgriShield Solution
**AgriShield** reinvents PMFBY as a fully automated, transparent, multi-tenant digital ecosystem:
- **Instant GPS Land Boundary Registry**: Farmers register farm boundaries using GPS or interactive satellite map tracing; geometries are authoritatively validated server-side using **PostGIS** and **PyProj Geodesic ellipsoids**.
- **Multi-Modal AI Health & Damage Diagnostics**: Post-disaster mobile photos are assessed within seconds using **EfficientNet-B0** deep learning models trained on agricultural damage and disease datasets.
- **Satellite & Hyper-Local Agro-Meteorology**: Ingests **Copernicus Sentinel-2** multispectral imagery (NDVI, NDWI, NDMI), **OpenWeatherMap** precipitation/temperature cycles, and **SoilHive / OCR** soil chemistry metrics.
- **Automated PMFBY Statutory Pricing**: Dynamic actuarial quoting engine strictly enforcing the statutory **1.5% Rabi**, **2.0% Kharif**, and **5.0% Commercial** farmer caps while computing real-time Central & State government subsidies.
- **Agmarknet Live Mandi Pricing**: Direct integration with official `data.gov.in` Mandi rates, predicting seasonal harvest revenue in INR per quintal.
- **Cryptographic Blockchain Ledger**: Every policy issuance and claim decision is serialized into a canonical SHA-256 hash and permanently recorded on the **Polygon Amoy testnet** smart contract, giving farmers and auditors verifiable proof of record.

---

## 2. Key Innovations and Technical Highlights

| Feature | Technical Implementation | Benefit to Farmer & Insurer |
|---|---|---|
| **Frictionless Phone Identity** | `POST /auth/register-or-login` with JWT and phone-anchored schema | No complicated email/password barrier for rural farmers; instant onboarding. |
| **Geodesic Land Boundary Validation** | PostGIS `ST_Area` + PyProj WGS84 geodesic polygon validation | Rejects self-intersecting or invalid polygons; prevents fictitious land registration. |
| **Instant Computer Vision Assessment** | EfficientNet-B0 PyTorch pipeline for Crop Disease & Disaster Damage | Reduces damage assessment time from 3–6 months to 15 seconds. |
| **Sentinel-2 Satellite Indices** | Live STAC query computing NDVI (vegetation), NDWI (water/flood), and NDMI (moisture) | Independent macro-level verification of crop vigor without visiting the field. |
| **PMFBY Actuarial Engine** | Statutory scales of finance (e.g., MP Agriculture Dept) & 1.5% / 2% / 5% rules | Transparent breakdown of farmer payable vs. 100% government-subsidized balance. |
| **Live Agmarknet Mandi Revenue** | Data.gov.in API with fallback benchmark rates for Madhya Pradesh Mandis | Farmers project harvest revenue and decide optimal sowing choices. |
| **Tamper-Proof Audit Trail** | Solidity `AgriShieldRecords.sol` deployed on Polygon Amoy (Chain ID: 80002) | Guarantees neither insurer nor farmer can alter historical claim/policy data. |
| **Live 2-Way Reactive Event Loop** | Central PostgreSQL database + reactive notifications engine | Admin approvals in React portal instantly update Flutter mobile app timeline. |

---

## 3. System Architecture and Data Flow

AgriShield operates on a clean separation of concerns across five distinct tiers:

```mermaid
flowchart TD
    subgraph Clients["Presentation Layer"]
        App["Flutter Mobile App (Farmer)\nPort 3000+ / Device"]
        Web["React 18 + Vite Portal (Insurer/Admin)\nPort 5173"]
    end

    subgraph IntegrationTier["Integration & Core Business Layer"]
        API["FastAPI Backend (Single Source of Truth)\nPort 8000"]
        DB[(PostgreSQL + PostGIS\nSupabase / Render)]
        Storage["Local File Store / Uploads"]
    end

    subgraph IntelligenceTier["AI Microservice Layer"]
        AI["FastAPI AI Engine\nPort 8001"]
        CV["EfficientNet-B0 (Crop Health & Damage)"]
        ML["RandomForest (Yield & Risk Scorer)"]
        OCR["EasyOCR (Soil Health Card Parser)"]
    end

    subgraph ExternalServices["External Data Providers"]
        Sentinel["Copernicus Sentinel-2 STAC\n(NDVI, NDWI, NDMI)"]
        Weather["OpenWeatherMap API\n(Rainfall & Temp)"]
        Soil["SoilHive API / ICAR Data"]
        Mandi["Data.gov.in Agmarknet\n(Live Mandi Rates)"]
    end

    subgraph BlockchainTier["Immutable Ledger Layer"]
        Contract["AgriShieldRecords.sol\nPolygon Amoy Testnet"]
        Explorer["PolygonScan Explorer\n(0x479c319C...)"]
    end

    %% Client Interactions
    App -->|Phone Auth, Farm Geometries, Claims| API
    Web -->|Admin Login, Claim Reviews, Analytics| API

    %% Backend Persistence & AI Delegation
    API -->|Read/Write State & Geometries| DB
    API -->|Save Evidence Photos / PDFs| Storage
    API -->|Inference Delegation via HTTP| AI
    API -->|Submit Canonical Hashes| Contract

    %% AI Pipeline
    AI --> CV
    AI --> ML
    AI --> OCR
    AI -.->|Macro Observations| Sentinel
    AI -.->|Weather Cycles| Weather
    AI -.->|Soil Chemistry| Soil

    %% Market Data
    API -.->|Mandi Benchmarks| Mandi

    %% Blockchain Audit
    Contract -.-> Explorer
```

### Architectural Guardrails
1. **Single Point of Ingestion**: Neither the Flutter mobile app nor the React web dashboard ever communicates directly with the AI engine (`ai/`) or PostgreSQL. All interactions route through `backend/` (`http://localhost:8000/api/v1`).
2. **AI Microservice Isolation**: `ai/` runs on port `8001` as a pure computational microservice without authentication or direct database writes. Model versions and confidence metrics are always returned.
3. **Dual-Mode Graceful Degradation**: Both `ai/` and `backend/` support an automatic `MOCK_MODE=true` toggle. If an external satellite or weather API is rate-limited or unavailable, the system transparently falls back to pre-computed statistical benchmarks without breaking UI execution.

---

## 4. Repository Structure and Codebase Ownership

```
AgriShield/
├── AGENTS.md                          # Multi-agent architecture and operational rules
├── AgriShield_Rebuild_Plan.md         # Farmer-centric relational database blueprint
├── openapi.yaml                       # Universal OpenAPI 3.0.3 contract specification
├── docker-compose.yaml                # Unified container orchestration
│
├── backend/                           # Integration & Core Backend Owner
│   ├── alembic/                       # Database schema migrations
│   ├── api/                           # API route definitions
│   │   ├── admin.py                   # Insurer/Admin management & farmer listings
│   │   ├── auth.py                    # Phone-based farmer auth & Admin login
│   │   ├── claims.py                  # Claim filing, AI assessment, human review
│   │   ├── farms.py                   # PostGIS boundary registration & AI proxy
│   │   ├── files.py                   # Binary file storage & photo serving
│   │   ├── insurance.py               # PMFBY actuarial quotes & policy purchase
│   │   ├── notifications.py           # Polling notification center
│   │   └── weather.py                 # Hyper-local weather wrapper
│   ├── core/                          # Security (JWT, bcrypt) & config settings
│   ├── db/                            # SQLAlchemy Async models & session factory
│   │   ├── models.py                  # User, Farm, Policy, Claim, Notification models
│   │   └── session.py                 # Async engine setup (PostgreSQL+asyncpg)
│   ├── schemas/                       # Pydantic request/response schemas
│   ├── services/                      # Core business services
│   │   ├── agmarknet_client.py        # Data.gov.in Mandi price ingestion
│   │   ├── ai_client.py               # Resilient HTTP client proxying ai/ service
│   │   ├── blockchain_service.py      # Web3 async bridge to Polygon Amoy
│   │   ├── polygon_validator.py       # Shapely + PyProj WGS84 boundary checker
│   │   ├── pricing_service.py         # PMFBY statutory pricing & subsidy engine
│   │   └── weather_client.py          # OpenWeatherMap client with caching
│   ├── seed_db.py                     # Synthetic database generator (1,000 farmers)
│   └── requirements.txt               # Backend Python dependencies
│
├── ai/                                # AI & Computer Vision Developer Owner
│   ├── app/                           # FastAPI inference microservice (Port 8001)
│   │   ├── main.py                    # Server bootstrap & CORS configuration
│   │   ├── config.py                  # Thresholds, model paths, API credentials
│   │   ├── routes/                    # AI endpoints (crop-health, yield, risk, etc.)
│   │   └── services/data_pipeline.py  # Aggregates satellite, weather, and soil data
│   ├── collection/                    # External data harvesters
│   │   ├── satellite/sentinel2.py     # Copernicus STAC search & index calculator
│   │   ├── weather/weather_api.py     # Agro-weather historical & current fetcher
│   │   └── soil/soil_api.py           # SoilHive chemistry data client
│   ├── inference/                     # Production prediction pipelines
│   │   ├── cv_pipeline.py             # EfficientNet-B0 (Crop Disease & Damage)
│   │   ├── yield_prediction.py        # RandomForest yield regressor
│   │   ├── risk_scoring.py            # Multi-factor actuarial risk scoring
│   │   └── soil_ocr.py                # EasyOCR parser for Soil Health Cards
│   ├── models/                        # Serialized weights (.pt, .pkl) & metadata
│   ├── training/                      # Model training & synthetic data scripts
│   └── requirements.txt               # AI dependencies (torch, torchvision, scikit-learn)
│
├── blockchain/                        # Blockchain & Smart Contract Engineer Owner
│   ├── contracts/                     # Solidity smart contracts
│   │   └── AgriShieldRecords.sol      # Canonical hash ledger with immutable timestamps
│   ├── scripts/deploy.js              # Hardhat deployment script for Polygon Amoy
│   ├── hardhat.config.js              # Hardhat configuration (Chain ID 80002)
│   └── package.json                   # Web3 dependencies (ethers, hardhat)
│
├── web/                               # Insurer & Admin Web Portal Developer Owner
│   ├── src/
│   │   ├── api/index.ts               # Strongly typed API client with smart caching
│   │   ├── components/                # Reusable UI widgets (Header, Layout, Badges)
│   │   ├── pages/                     # Full-featured portal pages
│   │   │   ├── Dashboard.tsx          # PMFBY macro KPIs, claims breakdown, alerts
│   │   │   ├── Farmers.tsx            # Farmer registry with drill-down views
│   │   │   ├── FarmsMap.tsx           # Interactive Leaflet map of PostGIS boundaries
│   │   │   ├── Claims.tsx             # Claim review queue with AI damage preview
│   │   │   ├── Policies.tsx           # Active PMFBY policies & coverage metrics
│   │   │   ├── Verification.tsx       # Live Polygon Amoy blockchain verification tool
│   │   │   ├── Reports.tsx            # Actuarial risk & loss payout reports
│   │   │   └── Profile.tsx            # Insurer profile & session management
│   ├── package.json                   # React 18, Vite, Lucide-React, Leaflet
│   └── vite.config.ts                 # Vite bundler configuration
│
└── app/                               # Flutter Mobile App Developer Owner
    ├── lib/
    │   ├── api/api_client.dart        # Secure mobile client with JWT storage
    │   ├── models/                    # Typed Pydantic/OpenAPI envelope models
    │   ├── providers.dart             # Riverpod state providers & reactive stores
    │   ├── theme.dart                 # Forest Green (#1B7A3D) & Harvest Orange styling
    │   └── ui/screens/                # 14 Full-featured farmer screens
    │       ├── onboarding_screen.dart # Multi-language switcher (English / Hindi)
    │       ├── login_screen.dart      # Seamless phone OTP entry
    │       ├── dashboard_screen.dart  # Farmer home with weather, farms & quick actions
    │       ├── add_farm_screen.dart   # Interactive GPS polygon drawing & area check
    │       ├── farm_detail_screen.dart# 4-Tab comprehensive farm management hub
    │       ├── crop_photo_scan_screen.dart # Camera AI disease & pest scanner
    │       ├── soil_report_screen.dart# Soil Health Card OCR extraction
    │       ├── insurance_quote_screen.dart # Dynamic PMFBY quote & purchase flow
    │       ├── file_claim_screen.dart # Disaster evidence upload & AI assessment
    │       ├── claim_timeline_screen.dart # 4-Stage live claim settlement tracker
    │       ├── notifications_screen.dart  # Weather warnings & claim status updates
    │       └── profile_screen.dart    # Farmer identity & landholdings overview
    ├── pubspec.yaml                   # Flutter dependencies (http, riverpod, secure_storage)
    └── assets/images/                 # Brand graphics and logos
```

---

## 5. End-to-End Operational Workflows

### 🌾 Workflow A: Farmer Onboarding & Land Boundary Registration
1. **Frictionless Login**: The farmer inputs their phone number on the Flutter app. The backend upserts the record into the `users` table with `role='farmer'` and returns a JWT.
2. **Boundary Drawing**: The farmer uses the in-app satellite map to trace boundary vertices or walks the field perimeter with GPS enabled.
3. **Pre-Submission Check**: `validate_farm_boundary()` verifies the ring is closed ($\ge 4$ points), has no self-intersections, and computes the geodesic surface area on the WGS84 ellipsoid.
4. **Authoritative Server Ingestion**: `POST /farms` validates the geometry, creates a PostGIS polygon record, calculates the exact area in square meters and hectares, and binds the farm to `user_id`.
5. **Instant Synchronization**: The farm immediately appears in the web portal's **Farmers** directory and **FarmsMap** with owner details joined.

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as "👨‍🌾 Farmer (Flutter App)"
    participant Backend as "⚙️ Integration API (FastAPI)"
    participant PostGIS as "🗄️ PostgreSQL / PostGIS"
    actor Admin as "🏢 Insurer Admin (React Web)"

    Farmer->>Backend: POST /auth/register-or-login { phone }
    Backend->>PostGIS: SELECT / INSERT User (Phone anchor)
    Backend-->>Farmer: JWT Access Token + User Profile

    Farmer->>Backend: POST /farms { name, crop, boundary: GeoPolygon }
    Backend->>Backend: Validate Geometry (Closed, No Self-Intersection, PyProj Geod Area)
    Backend->>PostGIS: INSERT INTO farms (user_id, boundary, area_m2, status='PENDING')
    Backend-->>Farmer: 201 Created { farm_id, area_m2 }

    Admin->>Backend: GET /admin/farmers & GET /farms
    Backend->>PostGIS: SELECT farms JOIN users ON farms.user_id = users.id
    Backend-->>Admin: Returns Farm with Owner Name, Phone & Boundary Coordinates
```

---

### 💰 Workflow B: Actuarial Pricing, Policy Purchase & Blockchain Timestamping
1. **Quote Request**: The farmer or insurer requests an insurance quote for a registered farm.
2. **Actuarial Calculation**: `pricing_service.py` evaluates the crop category (Rabi, Kharif, or Commercial), retrieves state scales of finance, and computes:
   - $\text{Sum Insured} = \text{Area (ha)} \times \text{Scale of Finance (INR/ha)}$
   - $\text{Farmer Premium} = \text{Sum Insured} \times \text{Statutory Cap \% (1.5\%, 2.0\%, or 5.0\%)}$
   - $\text{Govt Subsidy} = \text{Gross Actuarial Premium} - \text{Farmer Premium}$
3. **Policy Purchase**: `POST /insurance/policies` records an active policy bound to `farm_id` and `user_id`.
4. **Canonical State Hashing**: The policy's immutable parameters are serialized into sorted JSON and hashed with SHA-256:
   ```text
   canonical_hash = SHA-256(SortKeys({policy_id, user_id, farm_id, premium, coverage}))
   ```
5. **On-Chain Recording**: `blockchain_service.py` transmits the canonical hash to `AgriShieldRecords.sol` on Polygon Amoy, storing the resulting transaction hash (`tx_hash`) in the database.
6. **Notification**: A confirmation notification is automatically added to the farmer's inbox.

---

### 🚨 Workflow C: Disaster Claim Filing, AI Assessment & Claim Settlement
1. **Disaster Filing**: Following an extreme weather event (flood, hailstorm, drought), the farmer files a claim via Flutter, uploading photos and incident details with an `Idempotency-Key`.
2. **Automated AI Damage Assessment**: The backend immediately routes the evidence photo to `ai/` (`POST /v1/damage-assessment`), where an **EfficientNet-B0** model computes the damage percentage (e.g., 68.5%) and confidence score.
3. **State Hashing & Audit Update**: The claim moves to status `AI_ASSESSED`. A canonical hash is generated from the assessment payload and timestamped on-chain.
4. **Insurer Review Queue**: The claim appears in the React portal's **Claims** queue with full photographic evidence, AI damage quantification, and the farmer's policy details.
5. **One-Click Human Adjudication**: The insurer clicks **Approve** or **Reject** (`POST /claims/{id}/review`).
6. **Reactive Notification**: The backend updates the claim status, sets `reviewed_by` and `reviewed_at`, and automatically creates a `claim_status` notification for the farmer.
7. **Farmer Timeline Update**: The farmer's in-app 4-stage claim timeline advances in real time:
   > **Claim Audit Lifecycle**: `Submitted` ➔ `AI Assessed` ➔ `Insurer Reviewed` ➔ `Blockchain Timestamped`

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as "👨‍🌾 Farmer"
    participant App as "📱 Flutter App"
    participant Backend as "⚙️ Backend API"
    participant AI as "🧠 AI Microservice"
    actor Insurer as "🕵️ Insurer Admin (Web)"
    participant Chain as "⛓️ Polygon Amoy"

    Farmer->>App: Capture photo & file claim (Flood / Pest)
    App->>Backend: POST /claims (Idempotency-Key, photos, incident_date)
    Backend->>Backend: Create claim record (status='SUBMITTED')
    
    Backend->>AI: POST /v1/damage-assessment (image bytes, event_type)
    AI->>AI: EfficientNet-B0 Inference
    AI-->>Backend: { damage_pct: 68.5%, confidence: 0.91 }
    
    Backend->>Chain: addRecord(canonicalHash)
    Chain-->>Backend: Returns tx_hash (0xabc...)
    Backend->>Backend: Update claim (status='AI_ASSESSED', tx_hash)
    Backend->>Backend: INSERT INTO notifications (claim_status)

    Insurer->>Backend: GET /claims (Sees claim with AI preview)
    Insurer->>Backend: POST /claims/{id}/review { action: 'APPROVE' }
    Backend->>Backend: UPDATE claims SET status='APPROVED'
    Backend->>Backend: INSERT INTO notifications ("Claim Approved!")
    
    Farmer->>App: Opens claim timeline
    App->>Backend: GET /notifications & GET /claims/{id}
    App-->>Farmer: Displays green checkmark on "Insurer Reviewed"
```

---

## 6. Backend Integration Engine (`backend/`)

The Backend serves as the single source of truth, implemented using **FastAPI** with asynchronous SQLAlchemy, PostGIS spatial queries, and Web3 smart contract dispatchers.

### Core Database Architecture (`backend/db/models.py`)

```
   ┌─────────────────────────────────────────────────────────────┐
   │                          users                              │
   ├─────────────────────────────────────────────────────────────┤
   │ id: UUID (PK)                                               │
   │ phone: VARCHAR (UNIQUE, index) ──> Farmer Identity          │
   │ email: VARCHAR (UNIQUE, nullable) ─> Admin Identity         │
   │ name: VARCHAR                                               │
   │ role: ENUM('farmer', 'admin')                               │
   │ language: VARCHAR ('en', 'hi')                              │
   │ created_at: TIMESTAMP                                       │
   └────────────────┬───────────────────────────┬────────────────┘
                    │ 1                         │ 1
                    │                           │
                    │ *                         │ *
   ┌────────────────┴───────────────┐   ┌───────┴────────────────────────┐
   │             farms              │   │         notifications          │
   ├────────────────────────────────┤   ├────────────────────────────────┤
   │ id: UUID (PK)                  │   │ id: UUID (PK)                  │
   │ user_id: UUID (FK -> users.id) │   │ user_id: UUID (FK -> users.id) │
   │ name: VARCHAR                  │   │ type: ENUM(claim, policy, ...) │
   │ crop: VARCHAR (nullable)       │   │ ref_id: UUID (claim/policy ID) │
   │ sowing_date: TIMESTAMP         │   │ message: TEXT                  │
   │ boundary: GEOMETRY(Polygon,4326│   │ read: BOOLEAN                  │
   │ area_m2: FLOAT (Server-calc)   │   │ created_at: TIMESTAMP          │
   │ status: ENUM(PENDING,VERIFIED) │   └────────────────────────────────┘
   └────────┬───────────────────────┘
            │ 1
            ├──────────────────────────────────────────┐
            │ *                                        │ *
   ┌────────┴───────────────────────┐   ┌──────────────┴─────────────────┐
   │            policies            │   │          soil_reports          │
   ├────────────────────────────────┤   ├────────────────────────────────┤
   │ id: UUID (PK)                  │   │ id: UUID (PK)                  │
   │ farm_id: UUID (FK -> farms.id) │   │ farm_id: UUID (FK -> farms.id) │
   │ user_id: UUID (FK -> users.id) │   │ source: ENUM(ocr, fallback)    │
   │ premium: FLOAT                 │   │ n, p, k, ph: FLOAT             │
   │ sum_insured: FLOAT             │   │ confidence: FLOAT              │
   │ status: ENUM(QUOTED, ACTIVE)   │   │ raw_text: TEXT                 │
   │ canonical_hash: VARCHAR        │   └────────────────────────────────┘
   │ tx_hash: VARCHAR               │
   └────────┬───────────────────────┘
            │ 1
            │
            │ *
   ┌────────┴────────────────────────────────────────────────────┐
   │                           claims                            │
   ├─────────────────────────────────────────────────────────────┤
   │ id: UUID (PK)                                               │
   │ policy_id: UUID (FK -> policies.id, nullable)               │
   │ farm_id: UUID (FK -> farms.id)                              │
   │ user_id: UUID (FK -> users.id)                              │
   │ event_type: ENUM(flood, drought, hailstorm, pest, rain, ...)│
   │ description: TEXT                                           │
   │ evidence_ids: UUID[] (Files in file store)                  │
   │ damage_pct: FLOAT (AI quantified)                           │
   │ ai_confidence: FLOAT                                        │
   │ status: ENUM(SUBMITTED, AI_ASSESSED, UNDER_REVIEW, APPROVED)│
   │ canonical_hash: VARCHAR                                     │
   │ tx_hash: VARCHAR                                            │
   │ reviewed_by: UUID (FK -> users.id)                          │
   │ reviewed_at: TIMESTAMP                                      │
   └─────────────────────────────────────────────────────────────┘
```

### Key Modules & Services
- **`services/polygon_validator.py`**:
  Validates GeoJSON polygon boundary rings. Checks for closure, vertex count, non-intersection using Shapely `is_valid`, and computes true ellipsoidal surface area using `pyproj.Geod(ellps="WGS84")`. Enforces a strict minimum size ($100\text{ m}^2$) and maximum size ($10,000\text{ ha}$).
- **`services/pricing_service.py`**:
  Encapsulates official PMFBY underwriting rules:
  - Scales of finance for central India (Wheat: ₹60,000/ha, Soybean: ₹50,000/ha, Paddy: ₹68,000/ha, Cotton: ₹85,000/ha, Sugarcane: ₹1,20,000/ha).
  - Categorizes seasons automatically (Rabi 2025-26, Kharif 2026, Annual Commercial).
  - Generates transparent breakdowns of gross premium vs. farmer premium vs. government subsidy.
- **`services/agmarknet_client.py`**:
  Fetches live Mandi spot commodity rates from the Government of India's Open Data Platform (`data.gov.in`). Implements local session caching with verified MSP benchmark rates (e.g., Wheat at ₹2,425/quintal, Soybean at ₹4,892/quintal) for high-availability resilience.
- **`services/blockchain_service.py`**:
  Asynchronously computes canonical deterministic SHA-256 digests and submits them to the Polygon Amoy testnet contract using `web3.py`. If Polygon testnet RPC encounters network congestion, generates an instant deterministic fallback hash to guarantee uninterrupted API operation.
- **`services/ai_client.py`**:
  Implements an abstract `AIClient` interface with concrete `HttpAIClient` and `MockAIClient` implementations. Transparently falls back to mock responses if the standalone AI service is temporarily offline.

---

## 7. AI & Computer Vision Microservice (`ai/`)

The AI service operates independently on port `8001`, housing specialized deep learning neural networks, machine learning regressors, OCR document pipelines, and multi-source satellite/weather harvesters.

```
ai/
├── models/
│   ├── yield/                 # RandomForestRegressor (434.8 MB) -> yield-v1.0.0
│   │   ├── yield_model.pkl    # Serialized scikit-learn pipeline (300 estimators)
│   │   └── metadata.json      # 31 feature definitions & target metadata
│   ├── risk/                  # RandomForestRegressor (436.1 MB) -> risk-v1.0.0
│   │   ├── risk_model.pkl     # Serialized scikit-learn pipeline (300 estimators)
│   │   └── metadata.json      # 15 feature definitions & target metadata
│   ├── crop_health/           # EfficientNet-B0 PyTorch (16.4 MB) -> 15 classes
│   │   ├── model.pt           # Fine-tuned weights on PlantVillage
│   │   └── class_names.json   # 15 crop disease classes & severity mappings
│   └── damage/                # EfficientNet-B0 PyTorch (16.3 MB) -> 2 classes
│       ├── model.pt           # Fine-tuned weights on post-disaster imagery
│       └── class_names.json   # damaged / non_damaged & percentage mappings
├── collection/                # Live satellite (Copernicus), weather (OWM), soil (SoilHive)
├── inference/                 # Production inference engines with inter-tree variance & attribution
└── training/                  # Synthetic physics generators & training scripts
```

---

### 7.1 Model 1: Multi-Source Crop Yield Prediction Regressor

#### Model Overview & Pipeline
- **Target Variable**: Crop Yield in Metric Tonnes per Hectare ($\text{t/ha}$), converted to $\text{kg/ha}$ at inference ($\text{Yield}_{\text{kg/ha}} = \text{Yield}_{\text{t/ha}} \times 1000.0$).
- **Algorithm**: `RandomForestRegressor` wrapped in a scikit-learn `Pipeline`.
- **Model File**: `ai/models/yield/yield_model.pkl` (Model Size: **434.8 MB**).
- **Model Version**: `yield-v1.0.0`.
- **Ensemble Hyperparameters**:
  - `n_estimators`: `300` decision trees.
  - `criterion`: Squared Error ($\text{MSE}$).
  - `max_depth`: None (nodes expanded until all leaves are pure or contain fewer than 2 samples).
  - `random_state`: `42`.
  - `n_jobs`: `-1` (fully parallelized multicore execution).
- **Preprocessing**: `ColumnTransformer` with `OneHotEncoder(handle_unknown="ignore")` for categorical crop types and `passthrough` for all numerical variables.

#### Complete 31 Feature Matrix & Input Characteristics

| Characteristic / Feature Name | Category | Data Type | Physical Range / Units | Source / Pipeline |
|---|---|---|---|---|
| `crop` | Agronomic | String (Categorical) | `soybean`, `wheat`, `rice`, `maize`, `cotton`, `chickpea` | Farm Record |
| `area_ha` | Landholding | Float | 0.5 – 100.0 ha | Server Geodesic PostGIS |
| `rainfall` | Macro-Weather | Float | 150.0 – 1,400.0 mm | OpenWeather Cumulative |
| `rainfall_7d` | Short-Term Weather | Float | 0.0 – 180.0 mm | OpenWeather 7-Day History |
| `rainfall_30d` | Medium-Term Weather| Float | 100.0 – 1,500.0 mm | OpenWeather 30-Day History|
| `temp_mean` | Temperature | Float | 15.0 – 42.0 °C | OpenWeather Ambient Mean |
| `temp_max` | Temperature Extreme| Float | 20.0 – 50.0 °C | OpenWeather Peak Daily |
| `temp_min` | Temperature Extreme| Float | 5.0 – 35.0 °C | OpenWeather Min Daily |
| `humidity` | Atmosphere | Float | 25.0 – 98.0% | OpenWeather Relative Humidity|
| `wind_speed` | Atmosphere | Float | 1.0 – 40.0 km/h | OpenWeather Anemometer |
| `soil_ph` | Soil Chemistry | Float | 4.8 – 8.2 pH | SoilHive / OCR Soil Card |
| `nitrogen` (N) | Soil Nutrient | Float | 60.0 – 450.0 kg/ha | SoilHive / OCR Soil Card |
| `phosphorus` (P) | Soil Nutrient | Float | 5.0 – 60.0 kg/ha | SoilHive / OCR Soil Card |
| `potassium` (K) | Soil Nutrient | Float | 50.0 – 350.0 kg/ha | SoilHive / OCR Soil Card |
| `organic_carbon` | Soil Health | Float | 0.15 – 2.0% | SoilHive Lab Data |
| `ndvi_mean` | Satellite Index | Float | 0.10 – 0.95 | Sentinel-2 Band 8 & Band 4 |
| `ndvi_min` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Pixel Dispersion |
| `ndvi_max` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Peak Pixel |
| `ndvi_std` | Satellite Index | Float | 0.02 – 0.25 | Sentinel-2 Spatial Variance |
| `ndwi_mean` | Satellite Index | Float | -0.80 to 0.60 | Sentinel-2 Band 8 & Band 11 |
| `ndwi_min` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Pixel Dispersion |
| `ndwi_max` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Peak Moisture |
| `ndmi_mean` | Satellite Index | Float | -0.40 to 0.70 | Sentinel-2 Band 8 & Band 12 |
| `ndmi_min` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Pixel Dispersion |
| `ndmi_max` | Satellite Index | Float | -1.0 to 1.0 | Sentinel-2 Peak Water Stress|
| `growth_stage` | Phenology | Integer | 1 – 5 (Vegetative to Mature) | Farmer Input / Sowing Date |
| `sowing_delay_days` | Phenology Stress | Float | -10.0 – 30.0 days | Deviation from Optimal Sowing|
| `heat_stress_days` | Thermal Stress | Float | max(T_max - 35, 0) days | Calculated Agro-Climatic |
| `excessive_rainfall_index`| Flood Stress | Float | max(R_7d - 90, 0) / 10 | Calculated Inundation Factor |
| `disease_probability`| Pathogen Stress | Float | 0.01 – 0.98 | Fungal Favorable Climatic Index|
| `historical_loss` | Actuarial History | Float | 0.0 – 1.0 | Revenue Record / CCE Survey |

#### Mathematical Formulations & Characteristic Weights
The ground-truth agricultural training physics models yield as a base crop capacity modulated by environmental multipliers and abiotic stress penalties:

1. **Crop Baseline Potential ($Y_{\text{base}}$)**:
   - Soybean: $2.7\text{ t/ha}$ | Wheat: $3.6\text{ t/ha}$ | Rice: $4.1\text{ t/ha}$
   - Maize: $4.4\text{ t/ha}$ | Cotton: $1.8\text{ t/ha}$ | Chickpea: $2.1\text{ t/ha}$

2. **Soil Quality Score ($S_{\text{soil}}$)** (Weight: $0.20$):

   $S_{\text{soil}} = 0.55 + 0.20 \cdot \left(\frac{\text{Nitrogen}}{300.0}\right) + 0.10 \cdot \left(\frac{\text{Phosphorus}}{30.0}\right) + 0.10 \cdot \left(\frac{\text{Potassium}}{200.0}\right)$

3. **Precipitation Suitability ($S_{\text{rain}}$)** (Weight: $0.20$, Gaussian centered at $700\text{ mm}$):

   $S_{\text{rain}} = \exp\left( -\left(\frac{\text{Rainfall} - 700}{350}\right)^2 \right)$

4. **Thermal Suitability ($S_{\text{temp}}$)** (Weight: $0.20$, Gaussian centered at $27^\circ\text{C}$):

   $S_{\text{temp}} = \exp\left( -\left(\frac{T_{\text{mean}} - 27}{7}\right)^2 \right)$

5. **Remote Sensing Vegetation Vigor ($S_{\text{veg}}$)** (Weight: $0.45$):

   $S_{\text{veg}} = 0.55 + 0.75 \cdot (\text{NDVI}_{\text{mean}} - 0.55) + 0.35 \cdot \text{NDMI}_{\text{mean}} + 0.15 \cdot (\text{NDWI}_{\text{mean}} + 0.15)$

6. **Stress Penalties ($P_{\text{stress}}$)**:
   - Heat Stress Penalty: $P_{\text{heat}} = 0.035 \times \text{Heat Stress Days}$
   - Flood Stress Penalty: $P_{\text{flood}} = 0.020 \times \text{Excessive Rainfall Index}$
   - Sowing Delay Penalty: $P_{\text{sow}} = 0.008 \times \max(\text{Sowing Delay Days}, 0)$
   - Aggregate Abiotic Penalty: $P_{\text{stress}} = P_{\text{heat}} + P_{\text{flood}} + P_{\text{sow}}$

7. **Composite Yield Formulation**:

   $\text{Multiplier} = \text{clip}\Big(0.65 + 0.20 S_{\text{soil}} + 0.20 S_{\text{rain}} + 0.20 S_{\text{temp}} + 0.45 S_{\text{veg}} - P_{\text{stress}},\ 0.35,\ 1.45\Big)$

   $\text{Yield}_{\text{t/ha}} = \text{clip}\Big( Y_{\text{base}} \times \text{Multiplier} + \mathcal{N}(0, 0.22),\ 0.2,\ 8.5 \Big)$

#### Ensemble Confidence Metric Calculation
At inference time, confidence is derived dynamically from the **inter-tree coefficient of variation ($\text{CV}$)** across all 300 decision tree estimators ($T_1, T_2, \dots, T_{300}$):

$$
\mu_{\text{trees}} = \frac{1}{300} \sum_{i=1}^{300} T_i(x), \quad \sigma_{\text{trees}} = \sqrt{\frac{1}{300} \sum_{i=1}^{300} \big(T_i(x) - \mu_{\text{trees}}\big)^2}
$$

$$
\text{CV} = \frac{\sigma_{\text{trees}}}{\mu_{\text{trees}} + \epsilon}, \quad \text{Confidence} = \text{clip}(1.0 - \text{CV},\ 0.0,\ 1.0)
$$

*If $\text{Confidence} \lt 0.70$, the prediction is automatically flagged with `low_confidence: true`.*

---

### 7.2 Model 2: PMFBY Actuarial Risk Scoring and Factor Decomposition Engine

#### Model Overview & Pipeline
- **Target Variable**: Composite Farm Calamity Risk ($0.0 - 1.0$ at API boundary, trained on $0 - 100$ scale).
- **Algorithm**: `RandomForestRegressor` with 300 estimators.
- **Model File**: `ai/models/risk/risk_model.pkl` (Model Size: **436.1 MB**).
- **Model Version**: `risk-v1.0.0`.
- **Ensemble Hyperparameters**: `n_estimators=300`, `criterion='squared_error'`, `random_state=42`, `n_jobs=-1`.

#### 15 Feature Input Vector

| Feature | Category | Importance / Role | Description |
|---|---|---|---|
| `crop` | Agronomic | Baseline Susceptibility | One-Hot Encoded crop class |
| `area_ha` | Exposure | Risk Aggregation Scale | Farm size in hectares |
| `rainfall` | Hazard Driver | Drought / Inundation | Annual / seasonal precipitation in mm |
| `temp_mean` | Thermal Hazard | Heat Stress Risk | Mean ambient temperature (°C) |
| `humidity` | Pathogen Vector | Microclimate Factor | Mean relative humidity (25% – 98%) |
| `soil_ph` | Edaphic Hazard | Acid/Alkali Degradation | Soil pH (4.8 – 8.2) |
| `nitrogen` | Soil Nutrition | Crop Resilience | Available Nitrogen (kg/ha) |
| `phosphorus` | Soil Nutrition | Root Architecture | Available Phosphorus (kg/ha) |
| `potassium` | Soil Nutrition | Drought Resistance | Available Potassium (kg/ha) |
| `ndvi_mean` | Macro-Observation| Vegetative Vigor Deficit| Canopy density (0.10 – 0.95) |
| `ndwi_mean` | Macro-Observation| Waterlogging Index | Water surface reflection (-0.80 to 0.60) |
| `ndmi_mean` | Macro-Observation| Canopy Moisture Stress | Moisture index (-0.40 to 0.70) |
| `yield_prediction` | Agronomic Health| Loss Potential | Predicted yield from Model 1 |
| `disease_probability`| Biological Hazard| Pathogen Pressure | Climatic disease suitability (0.01 – 0.98) |
| `historical_loss` | Loss History | Past Calamity Exposure | Historical actuarial claim ratio (0.0 – 1.0) |

#### The 5 Latent Risk Component Formulations & Weights
The latent risk score aggregates 5 independent risk pillars:

$$
\text{Latent Score} = \mathcal{R}_{\text{weather}} + \mathcal{R}_{\text{crop}} + \mathcal{R}_{\text{moisture}} + \mathcal{R}_{\text{soil}} + \mathcal{R}_{\text{historical}}
$$

1. **Weather Hazard Component ($\mathcal{R}_{\text{weather}}$)** (Effective Weight: $25\%$):

   $\mathcal{R}_{\text{weather}} = 0.30 \cdot \text{clip}\left(\frac{\text{Heat Stress Days}}{10}, 0, 1\right) + 0.20 \cdot \text{clip}\left(\frac{\text{Excessive Rain Index}}{8}, 0, 1\right)$

2. **Crop Health & Biological Component ($\mathcal{R}_{\text{crop}}$)** (Effective Weight: $35\%$):

   $\mathcal{R}_{\text{crop}} = 0.35 \cdot \text{Disease Probability} + 0.35 \cdot \text{clip}\left(\frac{0.75 - \text{NDVI}_{\text{mean}}}{0.50}, 0, 1\right)$

   Where Disease Probability is computed through logistic activation of climatic factors:

   $z_{\text{disease}} = -2.0 + 0.035(\text{Humidity} - 65) + 0.45\left(\frac{R_{\text{7d}}}{50}\right) - 2.0(\text{NDVI} - 0.55) + 0.08(T_{\text{mean}} - 25)$

   $\text{Disease Probability} = \text{clip}\left(\frac{1}{1 + e^{-z_{\text{disease}}}},\ 0.01,\ 0.98\right)$

3. **Moisture Stress Component ($\mathcal{R}_{\text{moisture}}$)** (Effective Weight: $20\%$):

   $\mathcal{R}_{\text{moisture}} = 0.25 \cdot \text{clip}\left(\frac{0.05 - \text{NDMI}_{\text{mean}}}{0.40}, 0, 1\right)$

4. **Soil Degradation Component ($\mathcal{R}_{\text{soil}}$)** (Effective Weight: $20\%$):
   - $\text{pH Risk} = \text{clip}\left(\frac{|\text{Soil pH} - 6.7|}{1.8}, 0, 1\right)$
   - $\text{Nutrient Risk} = \text{clip}\left(1.0 - \frac{\frac{\text{N}}{300} + \frac{\text{P}}{30} + \frac{\text{K}}{200}}{3}, 0, 1\right)$
   - $\mathcal{R}_{\text{soil}} = 0.20 \cdot \text{pH Risk} + 0.20 \cdot \text{Nutrient Risk}$

5. **Historical Exposure Component ($\mathcal{R}_{\text{historical}}$)** (Effective Weight: $25\%$):

   $\mathcal{R}_{\text{historical}} = 0.25 \cdot \text{Historical Loss Rate}$

#### Final Sigmoidal Risk Scaling
The composite latent score is passed through a steep logistic function calibrated to Indian agricultural conditions:

$$
\text{Raw Score} = \text{clip}\Big(100.0 \cdot \sigma\big(5.0 \cdot (\text{Latent Score} - 0.38)\big) + \mathcal{N}(0, 4.0),\ 0.0,\ 100.0\Big)
$$

$$
\text{API Risk Score} = \frac{\text{Raw Score}}{100.0} \in [0.0,\ 1.0]
$$

#### Risk Band Classification
| Risk Band | Score Interval | PMFBY Actuarial Interpretation | Insurance Pricing Impact |
|---|---|---|---|
| `LOW` | `0.00 – 0.25` | Optimal microclimate, healthy vigor, balanced soil | Standard statutory rate (1.5% - 2.0%) |
| `MEDIUM` | `0.25 – 0.50` | Minor moisture deficit or historical loss history | Standard statutory rate; advisory warnings |
| `HIGH` | `0.50 – 0.75` | Significant pathogen pressure, heat stress, or pH deviation | Elevated underwriting scrutiny; premium surcharge |
| `CRITICAL` | `0.75 – 1.00` | Severe drought, waterlogging inundation, or crop failure | Mandatory field validation; expedited claim reserve |

#### Inference-Time Factor Attribution Decomposition
`_derive_factors(features)` inspects the exact physical values and dynamically produces human-readable contributing factors with quantitative weights:
- **Flood Hazard**: If $\text{Rainfall} \gt 1100\text{ mm} \implies \text{Contribution} = \min(0.35, (\text{Rainfall} - 1100) / 1000)$.
- **Drought Hazard**: If $\text{Rainfall} \lt 300\text{ mm} \implies \text{Contribution} = \min(0.30, (300 - \text{Rainfall}) / 600)$.
- **Heat Stress**: If $T_{\text{mean}} \gt 35^\circ\text{C} \implies \text{Contribution} = \min(0.25, (T_{\text{mean}} - 35) / 28)$.
- **Vegetative Deficit**: If $\text{NDVI} \lt 0.40 \implies \text{Contribution} = \min(0.30, (0.40 - \text{NDVI}) / 0.40)$.
- **Disease Hazard**: If $\text{Disease Prob} \gt 0.35 \implies \text{Contribution} = \min(0.40, \text{Disease Prob} \times 0.50)$.
- **Waterlogging**: If $\text{NDWI} \gt 0.25 \implies \text{Contribution} = \min(0.25, (\text{NDWI} - 0.25) / 0.55)$.
- **Moisture Deficit**: If $\text{NDMI} \lt 0.05 \implies \text{Contribution} = \min(0.20, (0.05 - \text{NDMI}) / 0.45)$.
- **pH Deviation**: If $|\text{pH} - 6.7| \gt 1.0 \implies \text{Contribution} = \min(0.20, |\text{pH} - 6.7| / 3.6)$.
- **Nutrient Deficit**: If $\text{Nutrient Index} \lt 0.60 \implies \text{Contribution} = \min(0.30, (1.0 - \text{Nutrient Index}) \times 0.40)$.

---

### 7.3 Model 3: Deep Learning Crop Disease and Pest Identification

#### Architecture & Transfer Learning Setup
- **Backbone**: **EfficientNet-B0** pre-trained on ImageNet-1k (`IMAGENET1K_V1`).
- **Input Dimensions**: $3 \times 224 \times 224$ (RGB Image).
- **Model File**: `ai/models/crop_health/model.pt` (Weights Size: **16.38 MB**).
- **Classes**: 15 distinct classes covering major staple and horticultural crops.
- **Head Replacement**: Backbone features are pooled to 1280 dimensions; classifier layer replaced by:
  `Classifier Head = nn.Sequential(nn.Dropout(p=0.2), nn.Linear(1280, 15))`
- **Training Regimen**:
  - Loss: `CrossEntropyLoss`
  - Optimizer: `AdamW(lr=1e-3, weight_decay=1e-4)`
  - Data Augmentations: Random Horizontal Flip ($p=0.5$), Random Rotation ($\pm 15^\circ$), Color Jitter (Brightness 0.2, Contrast 0.2), ImageNet Normalization ($\mu=[0.485, 0.456, 0.406], \sigma=[0.229, 0.224, 0.225]$).
  - Acceleration: `torch.amp.autocast` (FP16 mixed precision).

#### 15 Class Diagnostic Taxonomy & Severity Matrix

| Class Index | Class Name / Label | Target Crop | Pathogen / Condition | Severity Rating |
|---|---|---|---|---|
| `0` | `Pepper__bell___Bacterial_spot` | Bell Pepper | *Xanthomonas campestris* | `moderate` |
| `1` | `Pepper__bell___healthy` | Bell Pepper | Healthy Canopy | `none` |
| `2` | `Potato___Early_blight` | Potato | *Alternaria solani* | `moderate` |
| `3` | `Potato___Late_blight` | Potato | *Phytophthora infestans* | `severe` |
| `4` | `Potato___healthy` | Potato | Healthy Canopy | `none` |
| `5` | `Tomato_Bacterial_spot` | Tomato | *Xanthomonas perforans* | `moderate` |
| `6` | `Tomato_Early_blight` | Tomato | *Alternaria solani* | `moderate` |
| `7` | `Tomato_Late_blight` | Tomato | *Phytophthora infestans* | `severe` |
| `8` | `Tomato_Leaf_Mold` | Tomato | *Passalora fulva* | `mild` |
| `9` | `Tomato_Septoria_leaf_spot` | Tomato | *Septoria lycopersici* | `moderate` |
| `10` | `Tomato_Spider_mites_Two_spotted_spider_mite`| Tomato | *Tetranychus urticae* | `mild` |
| `11` | `Tomato__Target_Spot` | Tomato | *Corynespora casiicola* | `moderate` |
| `12` | `Tomato__Tomato_YellowLeaf__Curl_Virus` | Tomato | Begomovirus / Whitefly | `severe` |
| `13` | `Tomato__Tomato_mosaic_virus` | Tomato | Tobamovirus (ToMV) | `severe` |
| `14` | `Tomato_healthy` | Tomato | Healthy Canopy | `none` |

#### Severity Inference Engine
`_infer_severity(label)` parses the model classification output:
- Keywords `late_blight`, `yellow_leaf_curl_virus`, `mosaic_virus`, `rust` $\implies$ **`severe`**
- Keywords `bacterial_spot`, `early_blight`, `septoria`, `target_spot` $\implies$ **`moderate`**
- Keywords `leaf_mold`, `spider_mite`, `powdery_mildew` $\implies$ **`mild`**
- Keyword `healthy` $\implies$ **`none`**

---

### 7.4 Model 4: Post-Disaster Damage Assessment and Loss Quantification

#### Architecture & Quantification Setup
- **Backbone**: **EfficientNet-B0** pre-trained on ImageNet-1k.
- **Model File**: `ai/models/damage/model.pt` (Weights Size: **16.32 MB**).
- **Classes**: `non_damaged` vs. `damaged`.
- **Head Replacement**: `nn.Linear(1280, 2)`.
- **Training Regimen**:
  - Augmentations: Random horizontal & vertical flips, random rotation ($\pm 20^\circ$), color jitter (brightness 0.3, contrast 0.3, saturation 0.2).
  - Loss: `CrossEntropyLoss` with label smoothing ($0.1$).
- **Damage Percentage Mapping (`DAMAGE_PCT_MAP`)**:
  - `non_damaged`: $0.0\%$ base damage.
  - `damaged`: $60.0\%$ base damage, scaled dynamically by the softmax prediction probability $P(\text{damaged})$:

     $\text{Damage \%} = \text{round}\Big(P(\text{damaged}) \times 65.0\% + \Delta_{\text{calamity}},\ 1\Big)$

    Where $\Delta_{\text{calamity}}$ applies empirical severity offsets based on incident type (Hailstorm: $+15\%$, Severe Flood: $+20\%$, Drought: $+10\%$).
- **Cryptographic Claim Seal**: The output damage percentage and model confidence are immediately formatted into the canonical JSON dictionary and signed on Polygon Amoy.

---

### 7.5 Model 5: Soil Health Card OCR Parser

#### Architecture & Extraction Logic
- **Detector**: CRAFT (Character Region Awareness for Text Detection) deep neural network (`craft_mlt_25k.pth`).
- **Recognizer**: Standard PyTorch CTC convolutional recurrent neural network (`english_g2.pth`).
- **Inference Pipeline (`ai/app/routes/soil_ocr.py`)**:
  1. Ingests uploaded image or PDF scan of the Government of India **Soil Health Card**.
  2. Runs text detection and text bounding box grouping across regional layouts.
  3. Executes case-insensitive regex pattern matching against key chemical markers:
     - **Nitrogen (N)**: `r"(?:nitrogen|available\s*N)[^\d]*(\d+\.?\d*)"`
     - **Phosphorus (P)**: `r"(?:phosphorus|available\s*P)[^\d]*(\d+\.?\d*)"`
     - **Potassium (K)**: `r"(?:potassium|available\s*K)[^\d]*(\d+\.?\d*)"`
     - **pH Value**: `r"pH[^\d]*(\d+\.?\d*)"`
  4. **Dynamic Confidence Formula**:

      $\text{Found Count} = \sum_{k \in \{N, P, K, pH\}} \mathbb{I}(k \text{ extracted successfully})$
      $\text{OCR Confidence} = 0.50 + \left(\frac{\text{Found Count}}{4}\right) \times 0.45$

  5. **High-Availability Fallback**: If any nutrient value cannot be resolved due to document degradation, the service transparently injects agro-climatic regional baseline averages ($\text{N}: 45.0\text{ kg/ha}, \text{P}: 22.0\text{ kg/ha}, \text{K}: 180.0\text{ kg/ha}, \text{pH}: 6.5$) while flagging the confidence accordingly.

---

### 7.6 Model 6: Agronomic Advisory and Crop Recommendation Expert System

#### Decision Logic for Sown vs. Unsown Plots
Implemented in `ai/app/routes/advisory.py`, the advisory engine operates in two operational modes:

```mermaid
graph TD
    Start["Farm Context Ingestion"] --> SownCheck{"Is Plot Sown?"}
    
    SownCheck -->|"Sown Field"| SownAdvisory["Crop-Specific Agronomic Protocols"]
    SownAdvisory --> StageAdvisory["Tillering / Flowering / Pod Filling Recommendations"]
    SownAdvisory --> EnvWarnings["Environmental Abiotic Stress Checks"]
    
    SownCheck -->|"Unsown / Fallow"| SeasonCheck{"Weather & Soil Conditions"}
    SeasonCheck -->|"Rainfall > 100mm OR Temp > 28°C"| KharifRec["Kharif Suite: Soybean Primary, Paddy, Cotton, Maize"]
    SeasonCheck -->|"Temp < 22°C"| RabiRec["Rabi Suite: Wheat Primary, Gram, Mustard"]
    SeasonCheck -->|"Moderate / Transitional"| TransRec["Transitional Suite: Soybean, Gram, Maize"]
    
    KharifRec --> PrepAdvisory["Deep Summer Ploughing & FYM Dressing"]
    RabiRec --> PrepAdvisory
    TransRec --> PrepAdvisory
```

#### Environmental Hazard Rules Engine
The engine evaluates real-time ambient metrics to trigger automated agronomic warnings:
- **Excessive Precipitation Warning**: If $\text{Rainfall} \gt 150\text{ mm} \implies$ *"Excess rainfall detected — ensure field drainage channels are cleared to prevent root hypoxia."*
- **Extreme Heat Stress Warning**: If $T_{\text{mean}} \gt 38^\circ\text{C} \implies$ *"Heat stress risk — schedule protective evening sprinkler irrigation to avoid blossom drop."*
- **Severe Soil Acidity Warning**: If $\text{pH} \lt 5.5 \implies$ *"Soil pH too acidic — apply agricultural lime (calcium carbonate) at 2–4 t/ha before next sowing cycle."*
- **Soil Alkalinity Warning**: If $\text{pH} \gt 8.0 \implies$ *"Alkaline soil detected — apply agricultural gypsum (calcium sulfate) and green manure."*
- **Nitrogen Starvation Warning**: If $\text{N} \lt 20\text{ kg/ha} \implies$ *"Severe Nitrogen deficit — top-dress urea at 60 kg/ha split across two applications."*
- **Phosphorus Starvation Warning**: If $\text{P} \lt 10\text{ kg/ha} \implies$ *"Phosphorus deficiency detected — apply Single Super Phosphate (SSP) or DAP directly at root zone."*

---

### 7.7 Data Harvesting and Remote Sensing Pipelines

#### 1. Copernicus Sentinel-2 Multispectral Ingestion (`ai/collection/satellite/`)
- Interacts with Copernicus Data Space Ecosystem via STAC (SpatioTemporal Asset Catalog) APIs.
- Queries Cloudless ($\text{Cloud Cover} < 20\%$) L2A Bottom-Of-Atmosphere (BOA) reflectance tiles over the farm's PostGIS bounding box.
- Computes pixel-level vegetation indices across a 45-day temporal look-back window:
  - **NDVI (Normalized Difference Vegetation Index)**: Sensitive to chlorophyll absorption:

    $\text{NDVI} = \frac{\text{Band 8 (NIR)} - \text{Band 4 (Red)}}{\text{Band 8 (NIR)} + \text{Band 4 (Red)}}$

  - **NDWI (Normalized Difference Water Index)**: Sensitive to surface waterlogging and flood inundation:

    $\text{NDWI} = \frac{\text{Band 8 (NIR)} - \text{Band 11 (SWIR-1)}}{\text{Band 8 (NIR)} + \text{Band 11 (SWIR-1)}}$

  - **NDMI (Normalized Difference Moisture Index)**: Sensitive to crop canopy moisture stress:

    $\text{NDMI} = \frac{\text{Band 8 (NIR)} - \text{Band 12 (SWIR-2)}}{\text{Band 8 (NIR)} + \text{Band 12 (SWIR-2)}}$

#### 2. Agro-Meteorological Harvester (`ai/collection/weather/`)
- Fetches current weather observations and 5-day / 3-hour forecasts from OpenWeatherMap using the farm's centroid latitude and longitude.
- Aggregates rolling metrics: 7-day cumulative precipitation ($R_{\text{7d}}$), 30-day cumulative precipitation ($R_{\text{30d}}$), daily temperature amplitudes ($T_{\max} - T_{\min}$), and wind gust velocities.

#### 3. Soil Chemistry Harvester (`ai/collection/soil/`)
- Ingests digital soil profiles from the SoilHive API and ICAR Indian Soil Information System.
- Retrieves available macronutrients (N, P, K in $\text{kg/ha}$), soil organic carbon percentage ($\text{OC}\%$), electrical conductivity ($\text{EC}$), and pH at topsoil depths ($0 - 30\text{ cm}$).

---

## 8. Blockchain Audit Ledger (`blockchain/`)

To eliminate disputes over claim payouts and policy parameters, AgriShield anchors records on the **Polygon Amoy Testnet** (Chain ID `80002`).

### Smart Contract Specification (`AgriShieldRecords.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgriShieldRecords {
    address public owner;

    struct Record {
        uint256 timestamp;
        address recordedBy;
        bool exists;
    }

    // Mapping from canonical SHA-256 hash string to on-chain Record
    mapping(string => Record) public records;

    event RecordAdded(string indexed canonicalHash, uint256 timestamp, address recordedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addRecord(string memory canonicalHash) external onlyOwner {
        require(!records[canonicalHash].exists, "Record already exists");

        records[canonicalHash] = Record({
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            exists: true
        });

        emit RecordAdded(canonicalHash, block.timestamp, msg.sender);
    }

    function verifyRecord(string memory canonicalHash) external view returns (bool, uint256, address) {
        Record memory rec = records[canonicalHash];
        return (rec.exists, rec.timestamp, rec.recordedBy);
    }
}
```

- **Live Contract Address**: [`0x479c319C22928FF293713e70F24d399220d46876`](https://amoy.polygonscan.com/address/0x479c319C22928FF293713e70F24d399220d46876)
- **Deployment Network**: Polygon Amoy Testnet
- **Verification Endpoint**: `GET /api/v1/insurance/policies/{id}/verification` verifies whether the database state hash matches the immutable on-chain record and provides direct PolygonScan links.

---

## 9. Insurer and Admin Web Portal (`web/`)

Built with **React 18**, **TypeScript**, and **Vite**, the Web Portal provides insurers and PMFBY administrators with deep monitoring and claim adjudication capabilities.

### Key Pages & Capabilities
1. **`Dashboard.tsx`**:
   High-level macro KPIs: Total Registered Farmers, Active Insured Acreage, Total Risk Sum Insured, Claims Pending Adjudication, Loss Ratio, and real-time weather risk alerts.
2. **`Farmers.tsx`**:
   Comprehensive farmer registry displaying names, phone numbers, total registered plots, and insurance status. Allows instant drill-down to a farmer's associated policies and claims.
3. **`FarmsMap.tsx`**:
   Interactive **Leaflet** map rendering all registered PostGIS farm boundaries. Color-codes plots by insurance coverage (Verified Active vs. Pending) with popup tooltips displaying acreage and crop types.
4. **`Claims.tsx`**:
   Live claim review queue. Shows farmer information, disaster category, uploaded photographic evidence, and AI damage assessment previews. Administrators can approve or reject claims with a single click.
5. **`Policies.tsx`**:
   Searchable ledger of all active policies, showing coverage amounts, statutory farmer shares, government subsidies, and validity periods.
6. **`Verification.tsx`**:
   Cryptographic audit tool. Allows insurers, auditors, or farmers to inspect the SHA-256 canonical hash of any policy or claim and verify its timestamp directly against the Polygon Amoy smart contract.
7. **`Reports.tsx`**:
   Generates and exports actuarial loss summaries and payout reports.

---

## 10. Farmer Mobile Application (`app/`)

Built with **Flutter 3** and **Riverpod**, the mobile app adheres strictly to agricultural UX best practices with high-contrast UI, offline state handling, and multi-language support.

### Complete Screen Architecture (14 Screens)
1. **`onboarding_screen.dart`**: Language selection (English & Hindi) with localized greetings.
2. **`login_screen.dart`**: Frictionless phone number login with automated demo OTP bypass.
3. **`dashboard_screen.dart`**: Farmer home screen featuring local weather conditions, quick action shortcuts, active farms carousel, and status badges.
4. **`add_farm_screen.dart`**: Interactive boundary tracing tool utilizing device GPS or map tapping, with instant client-side polygon validation.
5. **`farm_detail_screen.dart`**: 4-Tab comprehensive farm hub:
   - *Overview*: Acreage, sowing date, status, Mandi harvest revenue calculator, and crop switcher for unsown plots.
   - *Health & Weather*: Live satellite NDVI vegetation vigor indices and 7-day weather outlook.
   - *AI Predictions & Risk*: Predicted yield in quintals and PMFBY risk factor breakdown.
   - *Insurance & Policy*: Direct PMFBY quote purchase and claim filing shortcuts.
6. **`crop_photo_scan_screen.dart`**: Instant camera photo capture with real-time AI pest & disease identification.
7. **`soil_report_screen.dart`**: Upload tool for physical Soil Health Cards with automated EasyOCR extraction of N, P, K, and pH.
8. **`insurance_quote_screen.dart`**: Dynamic PMFBY quote generator displaying statutory farmer premiums (1.5% - 2%) alongside government subsidies.
9. **`file_claim_screen.dart`**: Disaster claim submission with incident photo uploads and calamity selector.
10. **`claim_timeline_screen.dart`**: Visual 4-step audit timeline (Submitted $\to$ AI Assessed $\to$ Insurer Reviewed $\to$ Blockchain Timestamped).
11. **`notifications_screen.dart`**: Alerts for policy receipts, severe weather warnings, and claim approval status.
12. **`profile_screen.dart`**: Farmer identity details, landholding summary, and language toggle.
13. **`main_screen.dart`**: Bottom navigation shell.
14. **`farm_details_form_screen.dart`**: Extended agronomic metadata entry (Khasra number, irrigation method, soil type).

---

## 11. Two-Way Synchronization and Notification Engine

AgriShield implements a closed-loop reactive event architecture between the Flutter mobile app and the React admin portal:

> **Closed-Loop Operational Invariant**: Every farmer write immediately synchronizes with the admin dashboard $\iff$ Every admin decision triggers a farmer push notification.

```
   ┌───────────────────────┐                    ┌───────────────────────┐
   │   FARMER APP (App)    │                    │   ADMIN PORTAL (Web)  │
   └───────────┬───────────┘                    └───────────▲───────────┘
               │                                            │
   1. Registers Farm Boundary ──────────────────> Appears on FarmsMap.tsx
   2. Purchases Policy ─────────────────────────> Appears on Policies.tsx
   3. Files Disaster Claim ─────────────────────> Appears in Claims Queue
               │                                            │
               │                                4. Admin clicks "Assess AI"
               │                                5. Admin clicks "Approve"
               │                                            │
   6. Receives Push / Polled Notification <─────────────────┘
   7. Claim Timeline advances to APPROVED
```

### Notification Types
- `claim_status`: Fired whenever a claim is submitted, AI-assessed, approved, or rejected.
- `policy_status`: Fired when a policy is purchased or verified on-chain.
- `weather_alert`: High-priority warnings for impending frost, hailstorms, or extreme rainfall.
- `risk_alert`: Advisories triggered when satellite NDVI indicates severe moisture stress.

---

## 12. Complete REST API Contract and Envelope Specification

All API responses follow the standard JSON envelope specified in `openapi.yaml`:

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

On validation or business logic error:
```json
{
  "success": false,
  "data": null,
  "meta": {
    "request_id": "c71a34b2-9d81-4209-a417-88d44e590fa1",
    "timestamp": "2026-09-05T10:15:32Z"
  },
  "error": {
    "code": "FARM_BOUNDARY_INVALID",
    "message": "Invalid boundary: Polygon must be closed (first point equals last point)."
  }
}
```

### Core API Endpoint Matrix

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register-or-login` | Phone-based farmer registration or login | No |
| `POST` | `/api/v1/auth/login` | Email/password login for Insurers & Admins | No |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Yes (Bearer) |
| `GET` | `/api/v1/farms` | List farms (Farmer: own farms; Admin: all farms) | Yes |
| `POST` | `/api/v1/farms` | Create farm with PostGIS geometry & validation | Yes |
| `GET` | `/api/v1/farms/{id}` | Get full farm details & active policy status | Yes |
| `PATCH`| `/api/v1/farms/{id}` | Update farm crop, sowing date, or name | Yes |
| `GET` | `/api/v1/farms/{id}/revenue` | Live Mandi price & projected harvest revenue | Yes |
| `POST` | `/api/v1/farms/{id}/crop-health` | Proxy AI image scan for pests and diseases | Yes |
| `POST` | `/api/v1/farms/{id}/yield-predict` | Predict crop yield with satellite & weather | Yes |
| `POST` | `/api/v1/farms/{id}/risk-score` | Compute composite PMFBY actuarial risk score | Yes |
| `POST` | `/api/v1/farms/{id}/advisory` | Fetch personalized agronomic recommendations | Yes |
| `POST` | `/api/v1/farms/{id}/soil/analyze`| Upload physical Soil Health Card for OCR | Yes |
| `GET` | `/api/v1/farms/{id}/weather/current` | Retrieve hyper-local weather at farm centroid | Yes |
| `POST` | `/api/v1/insurance/quote` | Calculate statutory PMFBY quote & subsidies | Yes |
| `GET` | `/api/v1/insurance/policies` | List active insurance policies | Yes |
| `POST` | `/api/v1/insurance/policies` | Purchase policy & record on Polygon Amoy | Yes (Idempotency) |
| `GET` | `/api/v1/insurance/policies/{id}/verification` | Verify policy hash against smart contract | Yes |
| `GET` | `/api/v1/claims` | List claims (filtered by user or all for admin) | Yes |
| `POST` | `/api/v1/claims` | File disaster claim with photos & AI assessment | Yes (Idempotency) |
| `GET` | `/api/v1/claims/{id}` | Get claim status, damage %, and timeline | Yes |
| `POST` | `/api/v1/claims/{id}/assess` | Re-trigger AI damage assessment | Yes (Admin) |
| `POST` | `/api/v1/claims/{id}/review` | Insurer one-click Approve or Reject | Yes (Admin) |
| `GET` | `/api/v1/claims/{id}/verification` | Verify claim state hash on Polygon Amoy | Yes |
| `GET` | `/api/v1/notifications` | Get unread alerts and status updates | Yes |
| `POST` | `/api/v1/notifications/{id}/read`| Mark alert as read | Yes |
| `GET` | `/api/v1/admin/farmers` | Admin paginated directory of all farmers | Yes (Admin) |
| `POST` | `/api/v1/files` | Upload photo or document evidence | Yes |
| `GET` | `/api/v1/files/{id}` | Download/stream uploaded file | No |

---

## 13. Environment Configuration and Secrets

> [!CAUTION]
> **Never commit real `.env` files, private keys, or API credentials to Git.**
> Template files are provided in each component directory.

### Backend (`backend/.env`)
```ini
PROJECT_NAME="AgriShield Integration API"
API_V1_STR="/api/v1"
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/agrishield"
SECRET_KEY="supersecretjwtkeyforhackathondevelopmentonly"
ACCESS_TOKEN_EXPIRE_MINUTES=43200
AI_SERVICE_URL="http://localhost:8001"
AI_MODE="live"
MOCK_MODE=false
POLYGON_RPC_URL="https://rpc-amoy.polygon.technology"
POLYGON_PRIVATE_KEY="0x0000000000000000000000000000000000000000000000000000000000000000"
SMART_CONTRACT_ADDRESS="0x479c319C22928FF293713e70F24d399220d46876"
```

### AI Service (`ai/.env`)
```ini
MOCK_MODE=false
DEBUG=true
PORT=8001
MIN_CONFIDENCE=0.7
COPERNICUS_CLIENT_ID="your_copernicus_oauth_id"
COPERNICUS_CLIENT_SECRET="your_copernicus_oauth_secret"
OPENWEATHER_API_KEY="your_openweather_api_key"
SOILHIVE_CLIENT_ID="your_soilhive_id"
SOILHIVE_CLIENT_SECRET="your_soilhive_secret"
```

### Web Portal (`web/.env`)
```ini
VITE_API_BASE_URL="http://localhost:8000/api/v1"
VITE_DEMO_MODE=false
```

---

## 14. Step-by-Step Installation and Local Runbook

### Prerequisites
- **Python**: 3.10 or 3.11
- **Node.js**: 18+ and npm
- **PostgreSQL**: 14+ with **PostGIS** extension installed
- **Flutter SDK**: 3.22+ (for mobile)

---

### Step 1: Database Setup
Create the PostgreSQL database and enable the PostGIS extension:
```sql
CREATE DATABASE agrishield;
\c agrishield;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

### Step 2: Launch AI Microservice (Port 8001)
```bash
cd ai

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the inference server
uvicorn app.main:app --port 8001 --reload
```
*Health check*: Visit `http://localhost:8001/health`

---

### Step 3: Launch Backend Integration API (Port 8000)
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with 1,000 farmers and 5,000 farms
python seed_db.py

# Start the API server
uvicorn app.main:app --port 8000 --reload
```
*Interactive Swagger Documentation*: Visit `http://localhost:8000/docs`

---

### Step 4: Launch Insurer Web Dashboard (Port 5173)
```bash
cd web

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Portal Access*: Open `http://localhost:5173` in your browser.  
*Default Admin Credentials*: Seeded admin accounts or register via `/register`.

---

### Step 5: Launch Farmer Mobile App (Flutter)
```bash
cd app

# Fetch packages
flutter pub get

# Run on Chrome, Android Emulator, or connected device
flutter run -d chrome --web-port 3000
# Or for mobile:
flutter run
```

---

## 15. Testing and Verification Guide

### 1. Test Backend & AI Proxy Interoperability
```bash
cd backend
python test_ai.py
```
Validates that `backend/` correctly connects to `ai/` on port 8001, executes crop disease scans, yield prediction, risk scoring, soil OCR, and verifies fallback mechanisms.

### 2. Verify Blockchain Smart Contract on Polygon Amoy
Run Hardhat contract tests:
```bash
cd blockchain
npm install
npx hardhat test
```
To verify on-chain records manually, query PolygonScan Amoy directly:  
[https://amoy.polygonscan.com/address/0x479c319C22928FF293713e70F24d399220d46876](https://amoy.polygonscan.com/address/0x479c319C22928FF293713e70F24d399220d46876)

### 3. Run AI Service Unit & Regression Tests
```bash
cd ai
pytest tests/ -v
```

---

## 16. PMFBY Compliance and Hackathon Edge

| Hackathon Criterion | AgriShield Delivery |
|---|---|
| **PMFBY Statutory Compliance** | Implements exact PMFBY actuarial formulas (1.5% Rabi, 2.0% Kharif, 5.0% Commercial), state scales of finance, and 50:50 Central/State subsidy accounting. |
| **Scientific Precision** | Combines ground-level computer vision with macroscopic Sentinel-2 satellite indices (NDVI, NDWI, NDMI) to prevent fraudulent claims. |
| **Trust & Anti-Corruption** | Eliminates retrospective record manipulation by anchoring state hashes to Polygon Amoy smart contracts. |
| **Farmer-Centric Empathy** | Eliminates friction with phone-number accounts, multi-language support (Hindi & English), offline resilience, and live Mandi harvest revenue projections. |
| **Production-Ready Engineering** | Complete end-to-end implementation across 5 folders (Backend, AI, Web, Flutter App, Blockchain) bound by a unified OpenAPI contract. |

---

## 📜 License and Acknowledgments

- **Hackathon**: Developed for the **Smart VIT Hackathon 2026** (Problem Statement `SVH26007`).
- **Data Attributions**:
  - Earth Observation data provided by the European Space Agency (ESA) Copernicus Data Space.
  - Agricultural Market Prices provided by the Ministry of Agriculture & Farmers Welfare (`data.gov.in` Agmarknet).
  - Weather intelligence provided by OpenWeatherMap.
- **Smart Contract**: Deployed on the Polygon Amoy Testnet.

*Built with ❤️ to safeguard India's Annadatas (Farmers).*
