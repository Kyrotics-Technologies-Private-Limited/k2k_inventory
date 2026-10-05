# Univillage Admin Portal Deployment Guide

Automated deployment configuration for Google Cloud Run services:
- **Backend Service**: `univillage-admin-backend` (Region: `us-central1`, Project: `univillage-503009`)
- **Frontend Service**: `univillage-admin-frontend` (Region: `us-central1`, Project: `univillage-503009`)

---

## 🚀 Quick Start Deployment

You can deploy directly using **PowerShell**, **npm**, or **Bash**.

### Option 1: Using PowerShell (Recommended on Windows)

Open PowerShell in the project root directory and run:

```powershell
# Deploy both backend and frontend
.\deploy.ps1

# Deploy only backend
.\deploy.ps1 -Target backend

# Deploy only frontend
.\deploy.ps1 -Target frontend
```

### Option 2: Using npm Scripts

```bash
# Deploy both backend and frontend
npm run deploy

# Deploy only backend
npm run deploy:backend

# Deploy only frontend
npm run deploy:frontend
```

### Option 3: Using Bash / Git Bash (macOS / Linux / CI/CD)

```bash
chmod +x deploy.sh

# Deploy both
./deploy.sh all

# Deploy backend only
./deploy.sh backend

# Deploy frontend only
./deploy.sh frontend
```

---

## ⚙️ Configuration & Environment

| Setting | Backend | Frontend |
|---|---|---|
| **Service Name** | `univillage-admin-backend` | `univillage-admin-frontend` |
| **GCP Project** | `univillage-503009` | `univillage-503009` |
| **Region** | `us-central1` | `us-central1` |
| **Public Access** | Yes (`--allow-unauthenticated`) | Yes (`--allow-unauthenticated`) |
| **Environment File** | `server/config.env` + Cloud Run env vars | `client/.env.production` |
| **Port** | 8080 (handled via Docker/Cloud Run) | 8080 (Nginx) |

---

## 🛠️ Prerequisites

1. **Google Cloud SDK (`gcloud`)** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project univillage-503009
   ```
2. **Permissions**: The authenticated account (`technology@univillage.in`) must have Cloud Run Admin and Cloud Build Editor roles on `univillage-503009`.
