# AgriShield Web Portal

The enterprise web application for the **AgriShield AI-Powered Agricultural Intelligence & Farm Monitoring Platform**. Built with **React 18**, **TypeScript**, **Vite**, and an ultra-modern **Vanilla CSS Design System** featuring glassmorphism, responsive grid layouts, dynamic animations, and interactive Leaflet GIS parcel mapping.

---

## 🌾 Overview & Core Features

The AgriShield web portal provides a comprehensive interface for farmers, agricultural officers, and administrators:

1. **Public Landing Page (`/`)**: High-impact platform presentation featuring real-time telemetry, PMFBY coverage metrics, and interactive feature showcases.
2. **Role-Based Authentication (`/login`, `/register`)**: Frictionless phone OTP login for farmers and email/password authentication for administrators.
3. **Executive & Farm Dashboard (`/dashboard`)**: Unified control center displaying active farm acreage, live weather summaries, soil fertility scores, and immediate action items.
4. **Live Mandi Spot Rates (`/mandi`)**:
   - Real-time commodity arrivals and spot modal prices across Indian APMC mandis.
   - Comprehensive catalog of **47 agricultural crops** and **21 soil classifications**.
   - Bilingual search in English and Hindi (e.g., *Wheat / गेहूं*, *Soybean / सोयाबीन*, *Mustard / सरसों*).
   - Daily price trend charts, Min/Max/Modal price spreads, and official MSP benchmark comparisons.
5. **Soil Health Card OCR Scanner (`/soil-ocr`)**:
   - Multi-format document upload (PDF / PNG / JPG) for government Soil Health Cards.
   - Automated OCR extraction of Nitrogen (N), Phosphorus (P), Potassium (K), and pH levels.
   - Instant soil fertility rating and tailored organic/chemical fertilizer recommendations.
6. **AI Crop Pest & Disease Scanner (`/crop-scan`)**:
   - Neural diagnostic camera/file upload for plant foliage pathology.
   - Detection of common crop diseases (e.g., Leaf Rust, Powdery Mildew, Early Blight) with confidence scores.
   - Immediate agronomic advisory, chemical treatments, and organic remedies.
7. **Multi-Modal Yield Prediction (`/yield`)**:
   - Sowing date, farm acreage, soil characteristics, and live weather synthesis.
   - Machine learning yield prediction (in **kg/ha**) with historical benchmark comparisons.
8. **Agro-Climatic Advisory Engine (`/advisory`)**:
   - Context-aware recommendations for irrigation schedules, fertilizer application timings, and crop diversification for unsown lands.
9. **Interactive Farm Parcel GIS Map (`/farms-map`)**:
   - High-resolution satellite and OpenStreetMap layers powered by Leaflet.
   - Multi-point polygon boundary drawing tool with server-side PostGIS geometric validation.
   - Visual centroid tracking, area computation (m², ha, acres), and crop status overlays.
10. **Farmer Management Directory (`/farmers`)**:
    - Searchable directory of registered farmers, their contact information, farm count, and landholdings.
11. **Real-Time Alerts & Weather Warning Center (`/alerts`)**:
    - Live weather radar integration, heavy precipitation alerts, heatwave warnings, and pest outbreak advisories.
    - Admin broadcast messaging system to dispatch urgent notices to all farmers.
12. **Analytics & Agricultural Reports (`/reports`)**:
    - Crop acreage breakdown, yield distributions, regional soil health trends, and printable farm reports.
13. **System Telemetry & AI Model Health (`/system-health`)**:
    - Real-time monitoring of AI inference latency, backend API status, and external services (Copernicus, OpenWeatherMap, Agmarknet).
14. **Profile & Account Settings (`/profile`)**:
    - User account management, language selection, and registered farm records.

---

## 🛠️ Technology Stack

- **Framework**: React 18 with TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Vanilla CSS Design System (`index.css`) with CSS custom properties, responsive clamp sizing, and glassmorphism
- **Icons**: Lucide React (`lucide-react`)
- **Maps**: Leaflet (`leaflet`, `react-leaflet`)
- **Routing**: React Router v6 (`react-router-dom`)
- **HTTP Client**: Axios with centralized error handling and standard envelope unwrapping (`src/api/index.ts`)

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure your API connection:

```env
# Point to your local FastAPI backend (port 8000)
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Connect to live backend (set to true only for standalone offline preview)
VITE_DEMO_MODE=false
```

### 3. Run Development Server

```bash
npm run dev
```

The application will launch at `http://localhost:5173`.

---

## 📦 Production Build & Deployment

### Build Bundle

To compile the TypeScript code and generate an optimized production bundle:

```bash
npm run build
```

The output will be generated in the `dist/` directory.

### Deploy to Vercel

1. In [Vercel](https://vercel.com/new), import repository `ankitkumarojha-29/Agrishield`.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://agrishield-backend.onrender.com/api/v1`
   - `VITE_DEMO_MODE`: `false`
4. Click **Deploy**. Vercel uses `web/vercel.json` for automatic API proxy rewrites and SPA client-side routing.

---

## 🎨 Design System Principles

- **Primary Colors**: Deep Agricultural Emerald (`#1B7A3D`), Warm Harvest Amber (`#F5821F`).
- **Surface Elevation**: Dark glassmorphic panels (`rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(16px)`).
- **Typography**: Clean, high-legibility sans-serif with responsive typography tokens.
- **Explainable AI**: Every AI prediction explicitly renders its confidence percentage and model version badge.
