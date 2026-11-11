#!/usr/bin/env bash
# ==============================================================================
# verify.inventory.backend.testing.sh
# Smoke and Integration Verification for Deployed Inventory Backend
# ==============================================================================
set -Eeuo pipefail

EXPECTED_PROJECT="univillage-testing-a640c"
REGION="us-central1"
SERVICE_NAME="k2k-inventory-api"

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${EXPECTED_PROJECT}" --format="value(status.url)" 2>/dev/null || echo "")

if [[ -z "${SERVICE_URL}" ]]; then
  echo "[ERROR] Service ${SERVICE_NAME} not found in ${EXPECTED_PROJECT}."
  exit 1
fi

echo "========================================================"
echo "  Verifying Live Inventory Backend: ${SERVICE_URL}"
echo "========================================================"
echo ""

echo "[TEST 1] Checking /health endpoint..."
curl -s -i --max-time 15 "${SERVICE_URL}/health"
echo ""

echo "[TEST 2] Checking /api/test diagnostic endpoint..."
curl -s -i --max-time 15 "${SERVICE_URL}/api/test"
echo ""

echo "[TEST 3] Checking public catalog endpoint (GET /api/products)..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${SERVICE_URL}/api/products")
echo "HTTP Status: ${STATUS_CODE}"
if [[ "${STATUS_CODE}" == "200" ]]; then
  echo "[OK] Public catalog read successful."
else
  echo "[FAIL] Unexpected status code: ${STATUS_CODE}"
fi
echo ""

echo "[TEST 4] Verifying unauthenticated write rejection (POST /api/products/create)..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${SERVICE_URL}/api/products/create" -H "Content-Type: application/json" -d '{"name":"Hacker Product"}')
echo "HTTP Status: ${STATUS_CODE}"
if [[ "${STATUS_CODE}" == "401" ]]; then
  echo "[OK] Unauthenticated write properly rejected with 401 Unauthorized."
else
  echo "[FAIL] Expected 401, got ${STATUS_CODE}"
fi
echo ""

echo "[TEST 5] Verifying unauthenticated dashboard stats rejection (GET /api/dashboard/stats)..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/dashboard/stats")
echo "HTTP Status: ${STATUS_CODE}"
if [[ "${STATUS_CODE}" == "401" ]]; then
  echo "[OK] Unauthenticated dashboard access properly rejected with 401 Unauthorized."
else
  echo "[FAIL] Expected 401, got ${STATUS_CODE}"
fi
echo ""

echo ">>> VERIFICATION COMPLETE."

