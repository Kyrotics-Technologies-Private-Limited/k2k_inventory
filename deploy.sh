#!/usr/bin/env bash
# ==============================================================================
# Automated Cloud Run Deployment Script for Univillage Admin Portal
# ==============================================================================
set -euo pipefail

TARGET="${1:-all}"
PROJECT_ID="univillage-503009"
REGION="us-central1"
BACKEND_SERVICE="univillage-admin-backend"
FRONTEND_SERVICE="univillage-admin-frontend"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================================"
echo "  Univillage Cloud Run Deployment"
echo "  Target: $TARGET | Project: $PROJECT_ID | Region: $REGION"
echo "========================================================"
echo ""

# 1. Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo "[ERROR] gcloud CLI is not installed or not in PATH."
    exit 1
fi

gcloud config set project "$PROJECT_ID" --quiet
echo "[INFO] Active gcloud account: $(gcloud config get-value account 2>/dev/null)"

BACKEND_URL=""
FRONTEND_URL=""

# 2. Deploy Backend
if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    echo ""
    echo "--- Deploying Backend: $BACKEND_SERVICE ---"
    cd "$SCRIPT_DIR/server"
    gcloud run deploy "$BACKEND_SERVICE" \
        --source . \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --allow-unauthenticated \
        --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=$PROJECT_ID,FIREBASE_STORAGE_BUCKET=$PROJECT_ID.firebasestorage.app" \
        --quiet

    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format "value(status.url)")
    echo "[SUCCESS] Backend deployed at: $BACKEND_URL"
    cd "$SCRIPT_DIR"
else
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format "value(status.url)" 2>/dev/null || true)
fi

# 3. Deploy Frontend
if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
    echo ""
    echo "--- Deploying Frontend: $FRONTEND_SERVICE ---"
    cd "$SCRIPT_DIR/client"
    gcloud run deploy "$FRONTEND_SERVICE" \
        --source . \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --allow-unauthenticated \
        --quiet

    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --project "$PROJECT_ID" --format "value(status.url)")
    echo "[SUCCESS] Frontend deployed at: $FRONTEND_URL"
    cd "$SCRIPT_DIR"
fi

echo ""
echo "========================================================"
echo "  Deployment Summary"
echo "========================================================"
[ -n "$BACKEND_URL" ] && echo "  Backend Service  : $BACKEND_URL"
[ -n "$FRONTEND_URL" ] && echo "  Frontend Service : $FRONTEND_URL"
echo "========================================================"
echo ""
