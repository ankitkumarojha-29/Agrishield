# AgriShield Admin Web Portal

This is the front-end application for the AgriShield project (Smart VIT Hackathon 2026, PS SVH26007).
It is a React application built with Vite, TypeScript, and TailwindCSS v4.

## Features Built
- **Public Landing Page & Login**: Entry points for the application.
- **Admin Dashboard**: Core metrics and visual overview of the insurance platform.
- **Farms Map**: Leaflet map displaying real-time geographical tracking of insured properties.
- **Farmers & Policies Directory**: Interfaces for managing active users and PMFBY policies.
- **Claims Dashboard**: Review AI-assessed claims, complete with confidence scores and action buttons.
- **Blockchain Verification**: UI component connecting to the blockchain verification endpoint.
- **API Client Layer**: Fully typed Axios client built according to `contracts/openapi.yaml`.

## Setup & Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   By default, `VITE_DEMO_MODE=true` is set. This means the frontend will use internal mock data and will **not** attempt to connect to the backend. This is useful for UI development and testing when the backend is offline.

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Navigate to the URL provided in your terminal (usually `http://localhost:5173`).

4. **Connect to Live Backend**
   Once the Integration Owner finishes the backend endpoints, open `.env` and change:
   ```env
   VITE_DEMO_MODE=false
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

## Production Build

To verify the app builds correctly for production:
```bash
npm run build
```

## UI/UX Guidelines Followed
- **Color Palette**: Deep green (`#1B7A3D`) primary, warm orange (`#F5821F`) accent, off-white background.
- **Typography**: Responsive font definitions set strictly in Tailwind.
- **AI Guidelines**: Every AI result screen shows confidence `%` and hackathon-only decisions feature the "Demo / AI-assisted" label.
- **Responsive**: Tailwind's `md:` and `lg:` prefixes have been utilized to ensure the dashboard works across desktops and tablets.
