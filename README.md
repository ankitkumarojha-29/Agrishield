# 🌱 AgriShield — AI-Powered Crop Intelligence & Farm-Risk Platform

[![Production Ready](https://img.shields.io/badge/Status-Production_Ready-008080?style=for-the-badge)](https://github.com/ankitkumarojha-29/Agrishield)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel_%28React_18_%2B_Vite_%2B_TS%29-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://vercel.com)
[![Backend](https://img.shields.io/badge/Backend-Render_%28FastAPI_%2B_PostGIS%29-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Supabase_%2B_PostGIS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![AI Microservice](https://img.shields.io/badge/AI_Engine-FastAPI_%2B_PyTorch_%2B_ML-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)

> **AgriShield** is a modern agronomic intelligence, satellite monitoring, and farm-risk platform built for smallholder farmers, agronomists, and agricultural administrators. It integrates satellite earth observation (Sentinel-2), hyper-local weather intelligence, AI-driven soil card parsing, real-time Agmarknet Mandi market pricing, and automated crop disease detection.

---

## 📑 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Core Feature Modules](#-core-feature-modules)
3. [Architecture & Deployment Stack](#-architecture--deployment-stack)
4. [Bilingual Crop & Soil Catalog Engine](#-bilingual-crop--soil-catalog-engine)
5. [Repository Structure](#-repository-structure)
6. [API Contract & Envelope Specification](#-api-contract--envelope-specification)
7. [Local Quickstart Runbook](#-local-quickstart-runbook)
8. [Production Deployment Guide](#-production-deployment-guide)
9. [Security & Secrets Policy](#-security--secrets-policy)

---

## 🌾 Platform Overview

AgriShield bridges the gap between field-level agricultural reality and high-level remote sensing & data intelligence:

- **Interactive GIS Farm Parcel Boundary Registry**: Farmers trace parcel boundaries using satellite maps; area is authoritatively calculated server-side in hectares and acres using PostGIS and geodesic ellipsoids.
- **Dynamic 47+ Mandi Crop & 21+ Soil Variety Engine**: Replaces static dropdowns with a comprehensive, searchable catalog supporting bilingual names (English & Hindi Devanagari) across Cereals, Pulses, Oilseeds, Commercial crops, Vegetables, Spices, and Fruits.
- **Real-Time Agmarknet Mandi Market Analytics**: Direct live connection to official `data.gov.in` Mandi rates across Indian districts with bilingual search (e.g., search `Wheat` or `गेहूं`).
- **AI Soil Health Card Parser & Fertilizer Prescriptions**: Optical Character Recognition (OCR) extracts N, P, K, and pH levels from physical cards and computes tailored fertilizer prescriptions (Urea, DAP, MOP).
- **Satellite Macro Health Observation**: Ingests Copernicus Sentinel-2 multispectral imagery computing NDVI vegetation vigor and NDWI moisture indices.
- **Micro-Climate Weather & Irrigation Forecasting**: Hyper-local temperature, rainfall volume, humidity, and agronomic irrigation recommendations.
- **Admin Review & Risk Telemetry**: Centralized dashboard for farm verification, risk distribution, and broadcast agricultural alerts.

---

## 🚀 Core Feature Modules

| Module | Route | Key Capabilities |
| :--- | :--- | :--- |
| **Interactive Farms Map** | `/farms` & `/farms-map` | Leaflet satellite map displaying registered PostGIS parcel boundaries, crop status, and area metrics. |
| **Farm Creation & Parcel Drawing** | `/add-farm` | GPS parcel boundary drawing tool with geodesic area computation, dynamic crop search, and 21+ soil varieties. |
| **Parcel Health Details** | `/farms/:id` | Farm health telemetry, satellite NDVI index, crop advisory, and soil chemistry overview. |
| **Mandi Live Rates & Revenue** | `/revenue` | Real-time Agmarknet commodity spot rates, modal prices, district arrivals, and bilingual search. |
| **Soil Analysis & OCR** | `/soil-analysis` | Upload Soil Health Card photos/PDFs, extract NPK & pH, and receive customized fertilizer dosing. |
| **AI Crop Health Scan** | `/crop-scan` | Computer vision diagnosis for crop diseases, pests, severity levels, and treatment advisory. |
| **Weather & Irrigation Advisor** | `/weather-irrigation` | 7-day precipitation forecasts, temperature bands, and optimal irrigation windows. |
| **Broadcast Alerts** | `/alerts` | Target alerts to specific crop varieties, weather anomalies, or regional disease warnings. |
| **Farmers Directory** | `/farmers` | Filterable directory of registered farmers, their parcels, crop choices, and contact details. |
| **Admin Approvals & Reports** | `/admin-approvals` & `/reports` | One-click parcel approvals, aggregate acreage analytics, and risk scoring distribution. |

---

## 🏛️ Architecture & Deployment Stack

The platform is designed with clean decoupling between presentation, business orchestration, database storage, and AI inference:

```
[Farmer / Agronomist / Admin]
              │
              ▼
   [Frontend: Vercel]
   React 18 + TypeScript + Vite SPA
              │
              │ REST API (HTTPS + JWT)
              ▼
   [Backend: Render]
   FastAPI + SQLAlchemy 2.0 Async
      │                    │
      │ asyncpg            │ Tunnel Proxy
      ▼                    ▼
[Database: Supabase]   [AI Microservice: Laptop Tunnel]
 PostgreSQL + PostGIS   FastAPI on Port 8001
 (AWS Mumbai Pooler)    (via ngrok/Cloudflare tunnel)
```

### Production Hosting Setup

1. **Frontend**: Hosted on **Vercel** (`web/` directory). Pre-configured with `web/vercel.json` SPA rewrite rules to ensure seamless client-side routing on refreshes.
2. **Backend**: Hosted on **Render** (`backend/` directory) with Python 3.11, automated start commands, and turnkey `render.yaml` blueprint.
3. **Database**: Hosted on **Supabase** (PostgreSQL with PostGIS 3.3.7 extension), managed with connection pooling resilience (`pool_pre_ping=True`, `pool_recycle=300`).
4. **AI Inference**: High-compute ML models run on a local machine on port `8001` and connect to Render via secure HTTPS tunnel (`start_ai_tunnel.ps1`). Built-in graceful fallback ensures the backend remains 100% operational even if the tunnel is idle.

---

## 🌐 Bilingual Crop & Soil Catalog Engine

AgriShield eliminates static, hardcoded farm inputs through dedicated API endpoints:

- **`GET /api/v1/mandi/crops`**: Delivers **47 standardized Indian crops** with English name, Hindi Devanagari name, category pill, and emoji icon.
- **`GET /api/v1/mandi/soil-types`**: Delivers **21 Indian soil classifications** (based on ICAR standards) with regional context and agricultural suitability.
- **Bilingual Mandi Search**: The Agmarknet live price table supports real-time matching in both languages (e.g. typing `Wheat` or `गेहूं`, `Mustard` or `सरसों` returns instant matching arrivals).

---

## 📂 Repository Structure

```
Agrishield/
  ├── web/                        # React 18 + Vite + TypeScript Frontend
  │   ├── src/
  │   │   ├── api/index.ts        # Single source of truth API client
  │   │   ├── components/         # Reusable UI (CropSearchSelect, SoilTypeSelect, Layout, etc.)
  │   │   ├── context/            # RoleContext (Farmer / Admin role switching)
  │   │   ├── data/agriCatalog.ts # Dynamic catalog fetching & offline fallback
  │   │   └── pages/              # Platform feature views (Dashboard, Revenue, SoilAnalysis, etc.)
  │   ├── vercel.json             # Vercel SPA routing configuration
  │   └── package.json
  │
  ├── backend/                    # FastAPI Integration Backend
  │   ├── api/                    # REST endpoints (auth, farms, mandi, weather, satellite, admin)
  │   ├── app/main.py             # Server entrypoint, CORS middleware, exception handlers
  │   ├── core/                   # Configuration & JWT security
  │   ├── db/                     # SQLAlchemy models & async connection session
  │   ├── services/               # Agmarknet client, AI client, farm monitor, polygon validator
  │   └── requirements.txt
  │
  ├── ai/                         # AI & Machine Learning Microservice
  │   ├── app/                    # FastAPI routes (crop-health, yield, risk, soil-ocr, advisory)
  │   ├── models/                 # ML model artifacts (Yield & Risk regressors)
  │   ├── collection/             # Satellite & weather harvesting adapters
  │   └── requirements.txt
  │
  ├── render.yaml                 # Turnkey Render deployment blueprint
  ├── openapi.yaml                # Complete OpenAPI 3.1.0 contract
  ├── start_ai_tunnel.ps1         # Automated AI service & ngrok tunnel launcher
  ├── start_ai_tunnel.bat         # 1-Click batch launcher for Windows
  └── README.md
```

---

## 📡 API Contract & Envelope Specification

All backend responses follow a standardized JSON envelope:

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

On validation or client error:
```json
{
  "success": false,
  "data": null,
  "meta": { ... },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Polygon geometry has self-intersecting edges.",
    "details": {}
  }
}
```

---

## 💻 Local Quickstart Runbook

### Prerequisites
- Node.js (v18+)
- Python (3.11 or 3.12)
- Supabase PostgreSQL with PostGIS

### 1. Start AI Inference Service (Port 8001)
```bash
cd ai
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 2. Start Backend API (Port 8000)
```bash
cd backend
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start Frontend Web Dashboard (Port 5173)
```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🚀 Production Deployment Guide

### A. Deploy Backend to Render
1. In [Render Dashboard](https://dashboard.render.com/), create a new **Web Service** connected to your repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `pip install -r requirements.txt`.
4. Set **Start Command** to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Configure environment variables (`DATABASE_URL`, `SECRET_KEY`, `AI_SERVICE_URL`, `COPERNICUS_*`, `OPENWEATHER_API_KEY`, `AGMARKNET_API_KEY`).
6. Deploy and copy your Render URL: `https://<your-backend>.onrender.com`.

### B. Start Laptop AI Tunnel
Whenever you demo or run live model inference:
```powershell
.\start_ai_tunnel.ps1
```
Copy the generated HTTPS tunnel URL and update `AI_SERVICE_URL` in your Render environment variables.

### C. Deploy Frontend to Vercel
1. In [Vercel](https://vercel.com/new), import your repository.
2. Set **Root Directory** to `web`.
3. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://<your-backend>.onrender.com/api/v1`
   - `VITE_DEMO_MODE` = `false`
4. Click **Deploy**. Your application will be live with automatic HTTPS and global CDN caching.

---

## 🔐 Security & Secrets Policy

- **Zero Committed Secrets**: All private API keys, database credentials, and secret tokens are excluded from Git tracking via `.gitignore`.
- **Environment Isolation**: Production secrets are injected exclusively through platform environment variables on Vercel and Render.
- **Database Connection Security**: Database connections utilize asyncpg connection pooling with `pool_pre_ping=True` and automatic scheme normalization.
