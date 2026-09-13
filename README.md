# 🌱 AgriShield — AI-Powered Crop Intelligence & Farm-Risk Platform

[![Production Ready](https://img.shields.io/badge/Status-Production_Ready-008080?style=for-the-badge)](https://github.com/ankitkumarojha-29/Agrishield)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel_%28React_18_%2B_Vite_%2B_TS%29-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Render_%28FastAPI_%2B_PostGIS%29-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Supabase_%2B_PostGIS_3.3.7-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![AI Microservice](https://img.shields.io/badge/AI_Engine-FastAPI_%2B_PyTorch_%2B_ML-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **AgriShield** is a modern agronomic intelligence, satellite monitoring, and farm-risk platform built for smallholder farmers, agronomists, and agricultural administrators. It bridges field reality with satellite earth observation (Copernicus Sentinel-2), hyper-local weather intelligence, AI-driven soil card parsing (EasyOCR), real-time Agmarknet Mandi market pricing, and deep learning crop disease diagnostics.

---

## 📑 Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Feature Modules & Screen Deep-Dives](#3-feature-modules--screen-deep-dives)
4. [AI & Computer Vision Intelligence Tier](#4-ai--computer-vision-intelligence-tier)
5. [Bilingual Crop & Soil Catalog Engine](#5-bilingual-crop--soil-catalog-engine)
6. [Complete Repository Structure & File Tree](#6-complete-repository-structure--file-tree)
7. [REST API Contract & Endpoints Reference](#7-rest-api-contract--endpoints-reference)
8. [Local Development Runbook](#8-local-development-runbook)
9. [Production Cloud Deployment Guide](#9-production-cloud-deployment-guide)
10. [Security & Zero-Leak Secrets Policy](#10-security--zero-leak-secrets-policy)

---

## 1. Executive Summary & Problem Statement

Smallholder farmers in emerging agricultural economies face high operational uncertainties due to erratic climate patterns, pest outbreaks, volatile market prices, and soil degradation:

1. **Information Asymmetry**: Farmers often do not know current market arrivals or spot rates across nearby Mandis, leading to distress selling to local middlemen.
2. **Delayed Disease Diagnostics**: Crop diseases and pest infestations spread rapidly before agricultural extension officers can inspect fields in person.
3. **Imbalanced Fertilizer Applications**: Physical Soil Health Cards are difficult to decipher, leading to excessive urea application, depleted soil organic carbon, and high input costs.
4. **Lack of Parcel-Level Satellite Monitoring**: Traditional agricultural management relies on broad district averages rather than field-specific vegetation indices (NDVI/NDWI).

### The AgriShield Solution

AgriShield transforms farm management into a multi-tenant web application:
- **Interactive GIS Farm Parcel Boundary Registry**: Farmers trace parcel boundaries using satellite maps; area is authoritatively calculated server-side in hectares and acres using PostGIS and geodesic ellipsoids.
- **Dynamic 47+ Mandi Crop & 21+ Soil Variety Engine**: Replaces static dropdowns with a comprehensive, searchable catalog supporting bilingual names (English & Hindi Devanagari) across Cereals, Pulses, Oilseeds, Commercial crops, Vegetables, Spices, and Fruits.
- **Real-Time Agmarknet Mandi Market Analytics**: Direct live connection to official `data.gov.in` Mandi rates across Indian districts with bilingual search (e.g., search `Wheat` or `गेहूं`).
- **AI Soil Health Card Parser & Fertilizer Prescriptions**: Optical Character Recognition (OCR) extracts N, P, K, and pH levels from physical cards and computes tailored fertilizer prescriptions (Urea, DAP, MOP).
- **Satellite Macro Health Observation**: Ingests Copernicus Sentinel-2 multispectral imagery computing NDVI vegetation vigor and NDWI moisture indices.
- **Micro-Climate Weather & Irrigation Forecasting**: Hyper-local temperature, rainfall volume, humidity, and agronomic irrigation recommendations.
- **Admin Review & Risk Telemetry**: Centralized dashboard for farm verification, risk distribution, and broadcast agricultural alerts.

---

## 2. End-to-End System Architecture

```
[Farmer / Agronomist / Insurer]
               │
               ▼
    [Frontend Client (Vercel)]
    React 18 + TypeScript + Vite Single-Page Application
    Tailwind/Vanilla CSS Design System • Lucide Icons • Leaflet GIS Maps
               │
               │ HTTPS + Bearer JWT + Envelope Standard
               ▼
    [Integration Backend (Render)]
    FastAPI (Port 8000) • Python 3.11
    SQLAlchemy 2.0 Async • GeoAlchemy2 • Pydantic v2
       │                         │
       │ asyncpg Connection Pool │ HTTP Proxy / ngrok Tunnel
       │ (pool_pre_ping=True)    │ (with local Mock fallback)
       ▼                         ▼
[Cloud Database (Supabase)]   [AI Inference Microservice]
 PostgreSQL + PostGIS 3.3.7    FastAPI (Port 8001) • PyTorch
 AWS Mumbai (ap-south-1)       YOLO • EfficientNet-B0 • EasyOCR
```

---

## 3. Feature Modules & Screen Deep-Dives

### 1. Interactive Farms Map (`/farms` & `/farms-map`)
- **GIS Visualization**: Renders all registered farm boundaries on interactive OpenStreetMap / Satellite tile layers using Leaflet.
- **Visual Health Indicators**: Parcel polygons are color-coded by satellite NDVI vegetation vigor (Green = Healthy, Yellow = Moderate, Red = Stressed).
- **Parcel Quick-Inspect**: Clicking any boundary reveals the farmer's name, sown crop, computed area in acres/hectares, sowing date, and verification status.

### 2. Add Farm Parcel Boundary Tool (`/add-farm`)
- **Interactive Boundary Tracing**: Farmers or field agents draw parcel polygons directly on high-resolution satellite imagery or enter coordinates.
- **Server-Side Validation**: Backend geometry validation using Shapely and PostGIS prevents self-intersecting lines and verifies closed polygon topology.
- **Dynamic Crop & Soil Selectors**: Integrated `<CropSearchSelect>` (searchable by English or Hindi across 47+ crops) and `<SoilTypeSelect>` (21 Indian soil classifications).
- **Authoritative Area Calculation**: Rejects client-side manipulated acreage; computes exact ellipsoidal surface area in $m^2$, hectares, and acres.

### 3. Farm Parcel Detail Hub (`/farms/:id`)
- **Satellite Telemetry**: Live Copernicus Sentinel-2 multispectral bands displaying NDVI (Normalized Difference Vegetation Index), NDWI (Water Index), and NDMI (Moisture Index).
- **Crop Lifecycle Timeline**: Tracks growth stages from sowing to vegetative, flowering, and harvest readiness.
- **Historical Soil Reports**: Linked Soil Health Card records displaying NPK and pH telemetry over time.

### 4. Real-Time Mandi Spot Rates & Revenue Analytics (`/revenue`)
- **Agmarknet Live Ingestion**: Connects to the official Indian Agricultural Marketing portal (`data.gov.in`) for live Mandi prices.
- **Bilingual Commodity Badges**: Displays English names alongside emerald Hindi Devanagari badges (e.g., `Wheat` + `[गेहूं]`, `Mustard` + `[सरसों]`).
- **Live Search Filtering**: Instant bilingual search matching commodities by typing either English or Hindi text.
- **Market Price Distribution**: Displays Min, Max, and Modal prices per quintal, district-level arrivals, and price trend indicators.

### 5. Soil Health Card OCR & Fertilizer Prescription Engine (`/soil-analysis`)
- **Multimodal Upload**: Accepts physical Soil Health Card photos (`.jpg`, `.png`) or digital PDFs.
- **Automated Parameter Extraction**: Extracts Available Nitrogen (N), Phosphorus (P), Potassium (K), and pH level.
- **Interactive Dosage Tweaking**: Allows agronomists to fine-tune nutrient values and adjust target parcel acreage.
- **Tailored Fertilizer Recommendations**: Dynamically computes recommended bags of **Urea (46% N)**, **DAP (18-46-0)**, and **MOP (60% K₂O)** per acre based on specific crop requirements.

### 6. AI Crop Disease & Pest Scan (`/crop-scan`)
- **Visual Evidence Upload**: Farmers capture leaf or plant photos directly from mobile devices or web browsers.
- **Instant Disease Detection**: Computer vision model identifies pathogens (e.g., Rust, Blight, Powdery Mildew, Pest Infestations).
- **Confidence & Severity Scoring**: Returns diagnosis confidence percentage and classifies severity (Mild, Moderate, Severe).
- **Agronomic Action Plan**: Provides immediate chemical and organic treatment protocols to halt infection spread.

### 7. Weather & Irrigation Advisor (`/weather-irrigation`)
- **Hyper-Local Forecasts**: OpenWeather API integration delivering 7-day temperature trends, humidity, and rainfall predictions.
- **Evapotranspiration Estimation**: Estimates soil moisture loss to recommend optimal irrigation intervals and avoid waterlogging.

### 8. Agricultural Broadcast Alerts (`/alerts`)
- **Targeted Advisory Broadcasts**: Administrators send targeted weather warnings, pest outbreak notices, or government advisories.
- **Crop-Specific Filtering**: Filters alerts by target crop variety or administrative district.

### 9. Farmer & Community Directory (`/farmers`)
- **Comprehensive Registry**: Complete listing of registered farmers, their contact information, total landholding, and active crops.
- **Bilingual Filter**: Quick-filter farmers by specific crop using the dynamic catalog.

### 10. Admin Approvals & Analytics Reports (`/admin-approvals` & `/reports`)
- **Parcel Verification Queue**: Insurers and admins review pending land registrations, inspect satellite overlays, and verify boundaries.
- **Risk Analytics**: Aggregate charts showing crop distribution, district-level risk scores, and yield projections.

---

## 4. AI & Computer Vision Intelligence Tier

The AI microservice (`ai/`) runs a suite of specialized agronomic inference engines on FastAPI:

### Model 1: Crop Disease & Pest Diagnostics (`ai/inference/crop_health.py`)
- **Architecture**: Deep convolutional neural network (PyTorch) trained on agricultural disease datasets.
- **Input**: Plant leaf imagery, crop type, and current growth stage.
- **Output**: Disease/pest classification, confidence score (0.0–1.0), severity level (`mild`, `moderate`, `severe`), and agronomic treatments.

### Model 2: Multi-Source Yield Prediction (`ai/inference/yield_prediction.py`)
- **Architecture**: Gradient-boosted regressor aggregating satellite vegetation indices, soil nutrients, and precipitation history.
- **Input**: Sown crop, parcel area in hectares, historical rainfall, mean temperature, NPK, and Sentinel-2 NDVI.
- **Output**: Predicted harvest yield in **kg/ha** with standard deviation bounds.

### Model 3: Actuarial Farm Risk Scoring (`ai/inference/risk_scoring.py`)
- **Architecture**: Multi-factor weighted risk model evaluating historical weather anomalies, satellite drought stress, and pest susceptibility.
- **Output**: Composite risk score (0–100), risk category (`LOW`, `MODERATE`, `HIGH`, `SEVERE`), and weighted contributing factors.

### Model 4: Post-Disaster Damage Assessment (`ai/inference/damage_assessment.py`)
- **Architecture**: Computer vision segmentation assessing post-calamity crop lodging, flood inundation, or hail destruction.
- **Output**: Quantified damage percentage, affected area fraction, and loss severity.

### Model 5: Soil Health Card OCR Parser (`ai/inference/soil_ocr.py`)
- **Architecture**: EasyOCR pipeline paired with OpenCV image preprocessing (CLAHE contrast normalization, bilateral filtering).
- **Output**: Extracted Nitrogen, Phosphorus, Potassium, pH, and confidence score.

### Model 6: Agronomic Advisory Expert System (`ai/inference/advisory.py`)
- **Architecture**: Rule-based agronomic inference engine cross-referencing soil chemistry, crop stage, and weather forecasts.
- **Output**: Actionable farming recommendations, warnings, and alternative crop suggestions.

---

## 5. Bilingual Crop & Soil Catalog Engine

AgriShield includes a standardized bilingual catalog exposed via dedicated backend endpoints:

### Crops Catalog (`GET /api/v1/mandi/crops`) — 47 Varieties
- **Cereals**: Wheat (गेहूं), Paddy/Rice (धान / चावल), Maize (मक्का), Bajra (बाजरा), Jowar (ज्वार), Barley (जौ).
- **Pulses**: Gram/Chickpea (चना), Soybean (सोयाबीन), Tur/Arhar (अरहर / तुअर), Moong (मूँग), Urad (उड़द), Masoor (मसूर).
- **Oilseeds**: Mustard (सरसों / राई), Groundnut (मूंगफली), Sesame (तिल), Sunflower (सूरजमुखी), Castor Seed (अरंडी).
- **Commercial & Cash**: Cotton (कपास), Sugarcane (गन्ना), Jute (पटसन), Tobacco (तंबाकू).
- **Vegetables**: Potato (आलू), Onion (प्याज), Tomato (टमाटर), Garlic (लहसुन), Ginger (अदरक), Green Chilli (हरी मिर्च), Brinjal (बैंगन), Cabbage (पत्तागोभी), Cauliflower (फूलगोभी).
- **Spices**: Turmeric (हल्दी), Coriander (धनिया), Cumin (जीरा), Fennel (सौंफ), Fenugreek (मेथी).
- **Fruits**: Mango (आम), Banana (केला), Apple (सेब), Guava (अमरूद), Pomegranate (अनार), Papaya (पपीता), Orange (संतरा).

### Soil Classifications (`GET /api/v1/mandi/soil-types`) — 21 Varieties
Based on Indian Council of Agricultural Research (ICAR) soil taxonomy:
1. Alluvial Soil (जलोढ़ मिट्टी)
2. Black Cotton Soil / Regur (काली मिट्टी / रेगुर)
3. Red & Yellow Soil (लाल और पीली मिट्टी)
4. Laterite Soil (लैटेराइट मिट्टी)
5. Arid & Desert Soil (शुष्क व मरुस्थलीय मिट्टी)
6. Saline & Alkaline Soil (लवणीय व क्षारीय मिट्टी)
7. Peaty & Organic Soil (पीट व दलदली मिट्टी)
8. Forest & Mountain Soil (पर्वतीय व वन मिट्टी)
9. Sandy Loam (बलुई दोमट मिट्टी)
10. Clayey Loam (चिकनी दोमट मिट्टी)
11. Silty Loam (गाद दोमट मिट्टी)
12. Deep Black Soil (गहरी काली मिट्टी)
13. Medium Black Soil (मध्यम काली मिट्टी)
14. Shallow Black Soil (उथली काली मिट्टी)
15. Red Sandy Soil (लाल बलुई मिट्टी)
16. Red Loamy Soil (लाल दोमट मिट्टी)
17. Terai Soil (तराई मिट्टी)
18. Coastal Alluvial Soil (तटीय जलोढ़ मिट्टी)
19. Deltaic Alluvial Soil (डेल्टाई जलोढ़ मिट्टी)
20. Calcareous Soil (चूनेदार मिट्टी)
21. Skeletal / Gravelly Soil (कंकरीली / पथरीली मिट्टी)

---

## 6. Complete Repository Structure & File Tree

Below is the complete, file-by-file structure of the tracked AgriShield repository:

```
Agrishield/
├── .gitignore                                # Git ignore rules (protects all secrets and local test files)
├── AGENTS.md                                 # Multi-agent architecture and role specification guide
├── README.md                                 # Comprehensive platform documentation (this file)
├── openapi.yaml                              # Complete OpenAPI 3.1.0 specification
├── render.yaml                               # Turnkey Render deployment blueprint
├── start_ai_tunnel.bat                       # 1-Click Windows batch launcher for AI & tunnel
├── start_ai_tunnel.ps1                       # Automated PowerShell launcher for AI service & ngrok tunnel
│
├── web/                                      # React 18 + Vite + TypeScript Frontend Application
│   ├── index.html                            # Application HTML entry point
│   ├── package.json                          # Frontend dependencies and build scripts
│   ├── package-lock.json                     # Locked dependency tree
│   ├── tsconfig.json                         # TypeScript root configuration
│   ├── tsconfig.app.json                     # Client application TypeScript rules
│   ├── tsconfig.node.json                    # Vite/Node configuration
│   ├── vercel.json                           # Vercel SPA routing rewrite rules
│   ├── vite.config.ts                        # Vite bundler configuration
│   ├── Dockerfile                            # Optional containerized build
│   ├── nginx.conf                            # Optional Nginx reverse proxy configuration
│   ├── .dockerignore                         # Docker build exclusions
│   ├── .env.example                          # Frontend environment variable templates
│   ├── .gitignore                            # Web-specific gitignore
│   ├── .oxlintrc.json                        # Oxlint configuration
│   │
│   ├── public/                               # Static web assets
│   │   ├── favicon.svg                       # AgriShield sprout icon
│   │   ├── icons.svg                         # SVG icon sprite sheet
│   │   ├── login-bg.jpg                      # Farm landscape background for login
│   │   ├── login-bg.webp                     # Compressed webp background
│   │   ├── logo.webp                         # Full AgriShield logo
│   │   ├── logo-trimmed.webp                 # Trimmed header mark
│   │   └── crops/                            # Crop placeholder images
│   │       ├── cotton.webp
│   │       ├── maize.webp
│   │       ├── rice.webp
│   │       ├── soybean.webp
│   │       ├── unsown.webp
│   │       └── wheat.webp
│   │
│   └── src/                                  # Application source code
│       ├── main.tsx                          # React DOM mount entrypoint
│       ├── App.tsx                           # BrowserRouter route configuration
│       ├── App.css                           # Application base styles
│       ├── index.css                         # Modern CSS design system & utility classes
│       │
│       ├── api/                              # Centralized API layer
│       │   └── index.ts                      # Axios API client, interceptors, and typed envelopes
│       │
│       ├── components/                       # Shared UI Components
│       │   ├── CropSearchSelect.tsx          # Dynamic 47+ crop search & select with Hindi badges
│       │   ├── SoilTypeSelect.tsx            # Dynamic 21+ soil classification selector
│       │   ├── Layout.tsx                    # Shell layout with Sidebar and TopHeader
│       │   └── TopHeader.tsx                 # Navigation header, notification bell, user profile
│       │
│       ├── context/                          # State Management
│       │   └── RoleContext.tsx               # Farmer vs. Admin role provider and hook
│       │
│       ├── data/                             # Data Catalogs
│       │   └── agriCatalog.ts                # Crops catalog, soil varieties, API fetcher & fallback
│       │
│       └── pages/                            # Application Views
│           ├── Landing.tsx                   # Public marketing & feature landing page
│           ├── Login.tsx                     # Phone OTP & Admin email login
│           ├── Register.tsx                  # New farmer / administrator registration
│           ├── Dashboard.tsx                 # Core telemetry overview, weather card, rapid actions
│           ├── FarmsMap.tsx                  # Full-screen interactive Leaflet GIS farm map
│           ├── AddFarm.tsx                   # Farm boundary drawing and registration
│           ├── FarmDetail.tsx                # Parcel telemetry, NDVI index, soil chemistry hub
│           ├── Revenue.tsx                   # Live Agmarknet Mandi rates with bilingual search
│           ├── SoilAnalysis.tsx              # Soil Health Card OCR parser & fertilizer prescriptions
│           ├── CropScan.tsx                  # AI crop disease and pest identification
│           ├── WeatherIrrigation.tsx         # 7-day precipitation, temperature & irrigation advice
│           ├── Alerts.tsx                    # Broadcast weather warnings & crop advisory alerts
│           ├── Farmers.tsx                   # Searchable community directory of farmers
│           ├── AdminApprovals.tsx            # Parcel verification and boundary approval queue
│           ├── Reports.tsx                   # Risk score reports and yield analytics
│           └── Profile.tsx                   # User identity, phone, role, and language settings
│
├── backend/                                  # FastAPI Integration Backend
│   ├── Dockerfile                            # Backend container definition
│   ├── docker-compose.yaml                   # Multi-container orchestration definition
│   ├── alembic.ini                           # Database migration configuration
│   ├── requirements.txt                      # Python dependencies (FastAPI, SQLAlchemy, PostGIS)
│   ├── seed_db.py                            # Database seeder for demo farmers and parcels
│   ├── .dockerignore                         # Docker build exclusions
│   ├── .env.example                          # Backend environment variable template
│   │
│   ├── alembic/                              # Alembic database migrations
│   │   ├── env.py                            # Migration environment script
│   │   ├── script.py.mako                    # Migration template
│   │   └── versions/                         # Versioned migration files
│   │       ├── 03d9678fc68d_initial_postgis_schema.py
│   │       └── fb4da938e8f7_add_insurancepolicy.py
│   │
│   ├── api/                                  # API Router Modules
│   │   ├── admin.py                          # Insurer & admin approval endpoints
│   │   ├── ai.py                             # Proxy endpoints communicating with AI service
│   │   ├── auth.py                           # Phone login, email login, profile management
│   │   ├── farms.py                          # Farm parcel registration, listing, and updates
│   │   ├── files.py                          # File uploads and static asset management
│   │   ├── mandi.py                          # Agmarknet live rates, crops, and soil types
│   │   ├── notifications.py                  # User notifications and alerts
│   │   ├── satellite.py                      # Sentinel-2 multispectral index endpoints
│   │   ├── soil.py                           # Soil analysis and history endpoints
│   │   └── weather.py                        # Current weather and forecasts
│   │
│   ├── app/                                  # Server Application Entry
│   │   └── main.py                           # FastAPI instantiation, CORS, routers, background task
│   │
│   ├── core/                                 # Core Infrastructure
│   │   ├── config.py                         # Pydantic Settings reading environment variables
│   │   └── security.py                       # Passlib bcrypt hashing and JWT token creation
│   │
│   ├── db/                                   # Database Layer
│   │   ├── init_db.py                        # Schema initialization script
│   │   ├── models.py                         # SQLAlchemy ORM models (User, Farm, SoilReport, etc.)
│   │   └── session.py                        # Async engine, connection pooler resilience (pool_pre_ping)
│   │
│   ├── schemas/                              # Pydantic Request/Response Schemas
│   │   ├── contract.py                       # GeoPolygon, Validation results, Envelopes
│   │   ├── insurance.py                      # Policy and claim data models
│   │   └── responses.py                      # Standard envelope response schemas
│   │
│   └── services/                             # Business Logic & External Adapters
│       ├── agmarknet_client.py               # Mandi rate fetching, caching, and bilingual search
│       ├── ai_client.py                      # HTTP client for AI service with graceful fallback
│       ├── farm_monitor_service.py           # Background monitoring worker for automatic alerts
│       ├── polygon_validator.py              # Shapely & PostGIS geodesic geometry validator
│       ├── satellite_service.py              # Copernicus Sentinel-2 STAC search and NDVI calculator
│       ├── soil_ocr_service.py               # Local OCR extraction fallback engine
│       ├── storage_service.py                # Uploaded file storage handler
│       └── weather_client.py                 # OpenWeatherMap API adapter with caching
│
└── ai/                                       # AI & Machine Learning Microservice
    ├── Dockerfile                            # AI container definition
    ├── README.md                             # AI microservice documentation
    ├── context.md                            # Domain background and dataset notes
    ├── req.md                                # AI functional specifications
    ├── requirements.txt                      # PyTorch, OpenCV, EasyOCR, Scikit-learn dependencies
    ├── test_imports.py                       # Dependency and model verification script
    │
    ├── app/                                  # AI FastAPI Application
    │   ├── main.py                           # Server entrypoint on Port 8001
    │   ├── config.py                         # Microservice configuration and MOCK_MODE toggle
    │   │
    │   ├── routes/                           # API Route Handlers
    │   │   ├── advisory.py                   # POST /v1/advisory endpoint
    │   │   ├── crop_health.py                # POST /v1/crop-health endpoint
    │   │   ├── damage_assessment.py          # POST /v1/damage-assessment endpoint
    │   │   ├── health.py                     # GET /health service status
    │   │   ├── risk_score.py                 # POST /v1/risk-score endpoint
    │   │   ├── soil_ocr.py                   # POST /v1/soil-ocr endpoint
    │   │   └── yield_prediction.py           # POST /v1/yield-prediction endpoint
    │   │
    │   ├── schemas/                          # Pydantic Schemas for AI I/O
    │   │   ├── common.py                     # Confidence and version envelopes
    │   │   ├── advisory.py
    │   │   ├── crop_health.py
    │   │   ├── damage_assessment.py
    │   │   ├── risk_score.py
    │   │   ├── soil_ocr.py
    │   │   └── yield_prediction.py
    │   │
    │   └── services/                         # Inference Services
    │       ├── advisory_service.py
    │       ├── crop_health_service.py
    │       ├── damage_service.py
    │       ├── data_pipeline.py
    │       ├── risk_service.py
    │       ├── soil_ocr_service.py
    │       └── yield_service.py
    │
    ├── collection/                           # Data Harvesting Adapters
    │   ├── external/client_utils.py
    │   ├── geometry/farm_geometry.py
    │   ├── satellite/indices.py              # NDVI, NDWI, NDMI mathematical calculations
    │   ├── satellite/sentinel2.py            # Copernicus STAC API client
    │   ├── soil/soil_api.py                  # SoilHive client
    │   └── weather/weather_api.py            # OpenWeatherMap client
    │
    ├── evaluation/                           # Model Evaluation & Metrics
    │   ├── metrics.py                        # Precision, Recall, F1, RMSE calculators
    │   └── reports/                          # JSON evaluation reports
    │       ├── all_models_summary.json
    │       ├── crop_health_metrics.json
    │       ├── damage_metrics.json
    │       ├── model_stats_report.md
    │       ├── risk_metrics.json
    │       └── yield_metrics.json
    │
    ├── feature_engineering/                  # Feature Extraction Pipelines
    │   ├── crop_features.py
    │   ├── farm_features.py
    │   ├── risk_features.py
    │   ├── satellite_features.py
    │   ├── soil_features.py
    │   ├── weather_features.py
    │   └── yield_features.py
    │
    ├── inference/                            # Core Model Inference Engines
    │   ├── advisory.py                       # Agronomic recommendation rules
    │   ├── crop_health.py                    # Computer vision disease classification
    │   ├── cv_pipeline.py                    # Image augmentation & tensor normalization
    │   ├── damage_assessment.py              # Calamity loss quantification
    │   ├── risk_scoring.py                   # Multi-factor actuarial risk scoring
    │   ├── soil_ocr.py                       # EasyOCR card parser
    │   └── yield_prediction.py               # Yield estimation regressor
    │
    ├── models/                               # Serialized Model Artifacts & Labels
    │   ├── crop_health/
    │   │   ├── class_names.json              # 38 plant disease class labels
    │   │   └── model.pt                      # PyTorch weights
    │   ├── damage/
    │   │   ├── class_names.json              # Damage event classifications
    │   │   └── model.pt                      # PyTorch weights
    │   ├── risk/metadata.json                # Risk model features and coefficients
    │   └── yield/metadata.json               # Yield model features and coefficients
    │
    ├── recommendation/                       # Agronomic Rule Engines
    │   ├── disease_advice.py                 # Chemical & organic treatments per disease
    │   ├── engine.py                         # Master recommendation pipeline
    │   ├── fertilizer.py                     # NPK deficit dosage algorithms
    │   ├── irrigation.py                     # Evapotranspiration irrigation schedules
    │   └── rules.py                          # Agronomic decision trees
    │
    ├── scripts/                              # Utility Scripts
    │   └── download_ocr_models.py            # EasyOCR language model downloader
    │
    ├── tests/                                # Automated Unit & Integration Tests
    │   ├── test_advisory.py
    │   ├── test_crop_health.py
    │   ├── test_damage.py
    │   ├── test_health.py
    │   ├── test_risk.py
    │   ├── test_soil_ocr.py
    │   └── test_yield.py
    │
    └── utils/                                # Helper Utilities
        ├── confidence.py                     # Confidence scoring calibration
        ├── logging.py                        # Structured loggers
        ├── model_loader.py                   # Safe weight loader
        ├── time.py                           # ISO timestamp parsers
        └── validation.py                     # Input array validators
```

---

## 7. REST API Contract & Endpoints Reference

All Integration API responses follow the standard envelope format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "8f3b1234-5678-4321-9876-abcdef012345",
    "timestamp": "2026-09-14T02:00:00Z"
  },
  "error": null
}
```

### Key API Endpoints

| Category | Method | Path | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | Service health status check | No |
| **System** | `GET` | `/api/v1/meta` | System metadata and loaded model versions | No |
| **Auth** | `POST` | `/api/v1/auth/register-or-login` | Phone OTP authentication for farmers | No |
| **Auth** | `POST` | `/api/v1/auth/login` | Email/password login for administrators | No |
| **Auth** | `GET` | `/api/v1/auth/profile` | Retrieve authenticated user profile | Yes (Bearer) |
| **Farms** | `GET` | `/api/v1/farms` | List registered farm parcels (filtered by user) | Yes (Bearer) |
| **Farms** | `POST` | `/api/v1/farms` | Register new parcel with PostGIS polygon geometry | Yes (Bearer) |
| **Farms** | `GET` | `/api/v1/farms/{id}` | Get parcel details, telemetry, and health status | Yes (Bearer) |
| **Mandi** | `GET` | `/api/v1/mandi/crops` | Dynamic catalog of 47 standardized crops (Bilingual) | No |
| **Mandi** | `GET` | `/api/v1/mandi/soil-types` | Dynamic catalog of 21 Indian soil classifications | No |
| **Mandi** | `GET` | `/api/v1/mandi/arrivals` | Live Agmarknet Mandi rates with bilingual search | No |
| **Mandi** | `GET` | `/api/v1/mandi/price` | Spot modal price for a specific crop and district | No |
| **Soil** | `POST` | `/api/v1/farms/{id}/soil-analysis` | Upload Soil Health Card for OCR extraction | Yes (Bearer) |
| **Soil** | `GET` | `/api/v1/farms/my-soil-reports` | List historical soil analysis reports | Yes (Bearer) |
| **AI Proxy** | `POST` | `/api/v1/farms/{id}/crop-health` | Upload crop photo for disease/pest diagnosis | Yes (Bearer) |
| **Weather** | `GET` | `/api/v1/weather/current` | Current weather conditions for parcel coordinates | No |
| **Satellite**| `GET` | `/api/v1/satellite/indices` | Compute Sentinel-2 NDVI/NDWI indices | Yes (Bearer) |
| **Alerts** | `GET` | `/api/v1/notifications` | Fetch user alerts and weather notifications | Yes (Bearer) |
| **Admin** | `GET` | `/api/v1/admin/farms` | List all parcels across all farmers for review | Yes (Admin) |
| **Admin** | `POST`| `/api/v1/admin/farms/{id}/approve` | Authorize and verify a farm parcel | Yes (Admin) |

---

## 8. Local Development Runbook

### Prerequisites
- Node.js (v18+)
- Python (3.11 or 3.12)
- Supabase PostgreSQL with PostGIS extension

### 1. Launch AI Inference Microservice (Port 8001)
```bash
cd ai
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 2. Launch Backend API (Port 8000)
```bash
cd backend
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Launch Frontend Web Dashboard (Port 5173)
```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 9. Production Cloud Deployment Guide

### A. Deploy Backend on Render
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** ➔ **Web Service**.
2. Select your repository: `ankitkumarojha-29/Agrishield`.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `PYTHON_VERSION`: `3.11.9`
   - `DATABASE_URL`: `postgresql+asyncpg://postgres.[REF]:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
   - `SECRET_KEY`: *(Generate a secure 32+ character JWT secret)*
   - `AI_SERVICE_URL`: `https://<your-ngrok-tunnel>.ngrok-free.app` *(or localhost fallback)*
   - `COPERNICUS_CLIENT_ID`: `<your-copernicus-client-id>`
   - `COPERNICUS_CLIENT_SECRET`: `<your-copernicus-client-secret>`
   - `OPENWEATHER_API_KEY`: `<your-openweather-api-key>`
   - `AGMARKNET_API_KEY`: `<your-agmarknet-api-key>`
5. Click **Deploy**. Note your live Render URL: `https://<your-backend>.onrender.com`.

### B. Launch Laptop AI Tunnel
When presenting or running live deep learning models:
```powershell
.\start_ai_tunnel.ps1
```
The script will copy your public HTTPS URL to the clipboard. Paste this into Render as `AI_SERVICE_URL`.

### C. Deploy Frontend on Vercel
1. In [Vercel](https://vercel.com/new), import repository `ankitkumarojha-29/Agrishield`.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://<your-backend>.onrender.com/api/v1`
   - `VITE_DEMO_MODE`: `false`
4. Click **Deploy**. In under 60 seconds, your platform will be live worldwide with automated SSL and edge CDN caching.

---

## 10. Security & Zero-Leak Secrets Policy

- **Strict `.gitignore` Enforcement**: All `.env` files, private keys, database credentials, and internal configuration guides are excluded from Git tracking.
- **Connection Pool Resilience**: Database connections in `backend/db/session.py` utilize `pool_pre_ping=True` and `pool_recycle=300` to seamlessly recover from idle database pool disconnections without crashing.
- **CORS Protection**: Backend CORS middleware explicitly handles Vercel preview URLs (`https://*.vercel.app`) and production domains via wildcard regex.
