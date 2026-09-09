# AgriShield Google Cloud Run Deployment Guide (100% Free Tier)

This guide walks you through deploying AgriShield to **Google Cloud Run** using the free tier resources. Once deployed, the entire platform runs 24/7 with automatic HTTPS, allowing you to disconnect USB debugging, install the standalone APK on any phone, and access the web dashboard worldwide.

---

## 1. Why Google Cloud Run?

| Feature | Google Cloud Run Free Tier Allowance | AgriShield Usage |
| :--- | :--- | :--- |
| **Monthly Requests** | **2,000,000 requests/month** free | Well within free tier |
| **Compute Memory** | **360,000 GB-seconds/month** free | 2 GB RAM for AI + 512 MB for Backend |
| **vCPU** | **180,000 vCPU-seconds/month** free | Scales to 0 when idle, $0 idle cost |
| **SSL / Domains** | Free managed HTTPS (`*.a.run.app`) | Zero certificate management |
| **Deployment** | Direct GitHub Continuous Deployment | Auto-rebuilds on push to `main` |

---

## 2. Pre-requisites Checklist

1. [Google Cloud Console](https://console.cloud.google.com/) account (Free tier / free trial active).
2. Existing **Supabase PostgreSQL** database with PostGIS enabled.
3. Polygon Amoy testnet wallet private key & RPC URL.

---

## 3. Step-by-Step Deployment

### Step 1: Set Up Google Cloud Project & Enable APIs
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one (e.g. `agrishield-prod`).
3. Search for and **Enable** the following two APIs (takes 30 seconds):
   - **Cloud Run Admin API**
   - **Cloud Build API**

---

### Step 2: Deploy AI Inference Microservice (`agrishield-ai`)

1. In Cloud Console, navigate to **Cloud Run** and click **Create Service**.
2. Select **Continuously deploy from a repository** -> Click **Set Up Cloud Build**.
3. Select **GitHub** as provider -> Authenticate and choose repository `mayankanand-dev/AgriShield`.
4. Configure Branch & Build:
   - **Branch**: `^main$`
   - **Build Type**: `Dockerfile`
   - **Source location**: `/ai/Dockerfile`
5. Configure Service Settings:
   - **Service name**: `agrishield-ai`
   - **Region**: `asia-south1` (Mumbai) or `us-central1` (Iowa)
   - **Authentication**: Select **Allow unauthenticated invocations**
6. Expand **Container, Volumes, Networking, Security**:
   - **Memory**: Select **2 GiB** (ensures PyTorch, YOLO, and EasyOCR run smoothly)
   - **CPU**: **1** or **2 vCPU**
   - **Container port**: `8080`
   - **Environment variables**:
     | Variable | Value | Description |
     | :--- | :--- | :--- |
     | `MOCK_MODE` | `false` | Set to `true` if testing without satellite/weather keys |
     | `OPENWEATHER_API_KEY` | `<your-key>` | Optional weather integration key |
     | `COPERNICUS_CLIENT_ID` | `<your-id>` | Optional satellite NDVI key |
     | `COPERNICUS_CLIENT_SECRET` | `<your-secret>` | Optional satellite key |
7. Click **Create**.
8. Cloud Build builds the container and provides a public HTTPS URL:
   ```text
   https://agrishield-ai-xxxxxx.a.run.app
   ```
   *(Verify by opening `https://agrishield-ai-xxxxxx.a.run.app/health` in your browser)*.

---

### Step 3: Deploy Integration Backend API (`agrishield-backend`)

1. In Cloud Run, click **Create Service**.
2. Select **Continuously deploy from a repository** -> Click **Set Up Cloud Build**.
3. Choose repository `mayankanand-dev/AgriShield`.
4. Configure Branch & Build:
   - **Branch**: `^main$`
   - **Build Type**: `Dockerfile`
   - **Source location**: `/backend/Dockerfile`
5. Configure Service Settings:
   - **Service name**: `agrishield-backend`
   - **Region**: Same region as AI (e.g. `asia-south1` or `us-central1`)
   - **Authentication**: Select **Allow unauthenticated invocations**
6. Expand **Container, Volumes, Networking, Security**:
   - **Memory**: `512 MiB` or `1 GiB`
   - **CPU**: `1 vCPU`
   - **Container port**: `8080`
   - **Environment variables**:
     | Variable | Value | Description |
     | :--- | :--- | :--- |
     | `DATABASE_URL` | `postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Your Supabase connection string |
     | `AI_SERVICE_URL` | `https://agrishield-ai-xxxxxx.a.run.app` | URL of the AI service deployed in Step 2 |
     | `SECRET_KEY` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | 32+ character JWT secret string |
     | `POLYGON_RPC_URL` | `https://rpc-amoy.polygon.technology` | Polygon Amoy testnet RPC endpoint |
     | `POLYGON_PRIVATE_KEY` | `0x...` | Amoy testnet wallet private key |
     | `SMART_CONTRACT_ADDRESS` | `0x479c319C22928FF293713e70F24d399220d46876` | Deployed AgriShieldRecords contract |
7. Click **Create**.
8. Cloud Run will provide your Backend public HTTPS URL:
   ```text
   https://agrishield-backend-xxxxxx.a.run.app
   ```
   *(Verify by opening `https://agrishield-backend-xxxxxx.a.run.app/health` and `https://agrishield-backend-xxxxxx.a.run.app/api/v1/meta`)*.

---

### Step 4: Deploy Web Dashboard (Vercel or Cloud Run)

#### Option A: Vercel (Recommended — 1 minute)
1. Go to [vercel.com](https://vercel.com) and click **Add New -> Project**.
2. Import `mayankanand-dev/AgriShield`.
3. Set **Root Directory** to `web`.
4. Add Environment Variables:
   - `VITE_API_BASE_URL`: `https://agrishield-backend-xxxxxx.a.run.app/api/v1`
5. Click **Deploy**. Your dashboard is live at `https://agrishield-web.vercel.app`.

#### Option B: Google Cloud Run
1. In Cloud Run, click **Create Service** -> Connect GitHub repo.
2. Build Type: `Dockerfile`, Source path: `/web/Dockerfile`.
3. Port: `8080`.
4. Click **Create**.

---

### Step 5: Compile Standalone Android APK (For Phone Without USB)

Once the backend is live on Google Cloud Run:

1. Open your terminal in `app/`:
   ```bash
   cd app
   flutter build apk --release --dart-define=API_BASE_URL=https://agrishield-backend-xxxxxx.a.run.app/api/v1
   ```
2. The standalone release APK is generated at:
   ```text
   app/build/app/outputs/flutter-apk/app-release.apk
   ```
3. Transfer `app-release.apk` to your phone (via Google Drive, WhatsApp, Telegram, or USB).
4. Tap to install. The app will communicate directly with Google Cloud Run and Supabase anywhere in the world!
