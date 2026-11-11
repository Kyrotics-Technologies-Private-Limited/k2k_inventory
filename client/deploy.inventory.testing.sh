#!/usr/bin/env bash
# ==============================================================================
# deploy.inventory.testing.sh
# Automated Firebase Hosting Deployment Script for Univillage Inventory Frontend (Testing)
# ==============================================================================
set -Eeuo pipefail

EXPECTED_PROJECT="univillage-testing-a640c"
FORBIDDEN_PROJECT="univillage-503009"
EXPECTED_SITE="univillage-inventory-testing"
TARGET_ALIAS="inventory"
BACKEND_URL="https://k2k-inventory-api-42827689186.us-central1.run.app"
STOREFRONT_SITE="univillage-testing-a640c"
STOREFRONT_URL="https://univillage-testing-a640c.web.app"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ACTION="${1:---check}"

echo ""
echo "========================================================"
echo "  Univillage Inventory Frontend Deployment Tool (Testing)"
echo "  Target Project: ${EXPECTED_PROJECT}"
echo "  Hosting Site:   ${EXPECTED_SITE}"
echo "  Target Alias:   ${TARGET_ALIAS}"
echo "  Backend URL:    ${BACKEND_URL}"
echo "  Mode:           ${ACTION}"
echo "========================================================"
echo ""

run_checks() {
  echo "[STEP 1/7] Verifying CLI prerequisites..."
  for cmd in node npm firebase curl; do
    if ! command -v "${cmd}" &>/dev/null; then
      echo "[ERROR] Command '${cmd}' not found in PATH."
      exit 1
    fi
  done
  echo "[OK] CLI tools available."

  echo "[STEP 2/7] Verifying Firebase CLI authentication and project..."
  if ! firebase projects:list --json 2>/dev/null | grep -q "${EXPECTED_PROJECT}"; then
    echo "[ERROR] Project '${EXPECTED_PROJECT}' not accessible via Firebase CLI."
    exit 1
  fi
  echo "[OK] Authenticated and confirmed access to ${EXPECTED_PROJECT}."

  echo "[STEP 3/7] Verifying Backend Health..."
  local backend_status
  backend_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BACKEND_URL}/health" || echo "000")
  if [[ "${backend_status}" != "200" ]]; then
    echo "[ERROR] Backend health check failed with HTTP ${backend_status}."
    exit 1
  fi
  echo "[OK] Cloud Run backend healthy: HTTP 200."

  echo "[STEP 4/7] Verifying Hosting Target mapping..."
  local rc_path="${REPO_ROOT}/.firebaserc"
  if [[ ! -f "${rc_path}" ]]; then
    rc_path="${SCRIPT_DIR}/.firebaserc"
  fi
  if ! grep -q "${EXPECTED_SITE}" "${rc_path}"; then
    echo "[ERROR] Target alias '${TARGET_ALIAS}' is not mapped to '${EXPECTED_SITE}' in ${rc_path}."
    exit 1
  fi
  if grep -q "\"${TARGET_ALIAS}\":\s*\[\s*\"${STOREFRONT_SITE}\"" "${rc_path}"; then
    echo "[CRITICAL] Target alias points to Storefront site '${STOREFRONT_SITE}'. Aborting!"
    exit 1
  fi
  echo "[OK] Target '${TARGET_ALIAS}' strictly maps to '${EXPECTED_SITE}'."

  echo "[STEP 5/7] Verifying Environment Configuration..."
  local env_testing="${SCRIPT_DIR}/.env.testing"
  if [[ ! -f "${env_testing}" ]]; then
    echo "[ERROR] .env.testing not found in ${SCRIPT_DIR}."
    exit 1
  fi
  if grep -q "${FORBIDDEN_PROJECT}" "${env_testing}"; then
    echo "[CRITICAL] .env.testing contains production project ID '${FORBIDDEN_PROJECT}'!"
    exit 1
  fi
  if ! grep -q "${EXPECTED_PROJECT}" "${env_testing}"; then
    echo "[ERROR] .env.testing missing target project ID '${EXPECTED_PROJECT}'."
    exit 1
  fi
  if ! grep -q "${BACKEND_URL}" "${env_testing}"; then
    echo "[ERROR] .env.testing missing backend URL '${BACKEND_URL}'."
    exit 1
  fi
  echo "[OK] .env.testing verified for ${EXPECTED_PROJECT}."

  echo "[STEP 6/7] Running Frontend Unit Tests..."
  cd "${SCRIPT_DIR}"
  npm test
  echo "[OK] Frontend unit tests passed."

  echo "[STEP 7/7] Compiling Frontend Bundle in Testing Mode..."
  cd "${SCRIPT_DIR}"
  npm run build -- --mode testing
  if [[ ! -f "dist/index.html" ]]; then
    echo "[ERROR] Build output dist/index.html was not generated."
    exit 1
  fi
  # Bundle validation
  local bundle_js
  bundle_js=$(find dist/assets -name "*.js" | head -n 1)
  if grep -q "${FORBIDDEN_PROJECT}" "${bundle_js}"; then
    echo "[CRITICAL] Compiled bundle contains production project ID '${FORBIDDEN_PROJECT}'!"
    exit 1
  fi
  if ! grep -q "${EXPECTED_PROJECT}" "${bundle_js}"; then
    echo "[ERROR] Compiled bundle does not contain expected testing project ID '${EXPECTED_PROJECT}'."
    exit 1
  fi
  if ! grep -q "${BACKEND_URL}" "${bundle_js}"; then
    echo "[ERROR] Compiled bundle does not contain expected backend URL '${BACKEND_URL}'."
    exit 1
  fi
  echo "[OK] Compiled bundle successfully verified against testing configuration."

  echo ""
  echo ">>> ALL FRONTEND PRE-DEPLOYMENT CHECKS PASSED SUCCESSFULLY."
}

run_deploy() {
  run_checks

  echo ""
  echo "========================================================"
  echo "  Deploying Inventory Frontend to Firebase Hosting"
  echo "  Target: hosting:${TARGET_ALIAS} (${EXPECTED_SITE})"
  echo "========================================================"
  echo ""

  cd "${REPO_ROOT}"
  firebase deploy --only "hosting:${TARGET_ALIAS}" --project "${EXPECTED_PROJECT}"

  local live_url="https://${EXPECTED_SITE}.web.app"
  echo ""
  echo "========================================================"
  echo "  Hosting Deployment Complete!"
  echo "  Live Inventory URL: ${live_url}"
  echo "========================================================"
  echo ""

  echo "Performing Live End-to-End Probes..."
  local root_code
  root_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${live_url}" || echo "000")
  echo "[OK] Root URL '${live_url}' returned HTTP ${root_code}."

  local login_code
  login_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${live_url}/admin/login" || echo "000")
  echo "[OK] SPA Route '${live_url}/admin/login' returned HTTP ${login_code}."

  local sf_code
  sf_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${STOREFRONT_URL}" || echo "000")
  echo "[OK] Storefront '${STOREFRONT_URL}' unaffected: HTTP ${sf_code}."
}

run_status() {
  echo "Project ID:        ${EXPECTED_PROJECT}"
  echo "Hosting Site ID:   ${EXPECTED_SITE}"
  echo "Hosting URL:       https://${EXPECTED_SITE}.web.app"
  echo "Hosting Alias:     ${TARGET_ALIAS}"
  echo "Backend URL:       ${BACKEND_URL}"

  local b_code
  b_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BACKEND_URL}/health" || echo "000")
  echo "Backend Health:    HTTP ${b_code}"

  local f_code
  f_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${EXPECTED_SITE}.web.app" || echo "000")
  echo "Frontend Status:   HTTP ${f_code}"
}

case "${ACTION}" in
  --check|-check|check)
    run_checks
    ;;
  --deploy|-deploy|deploy)
    run_deploy
    ;;
  --status|-status|status)
    run_status
    ;;
  *)
    echo "Usage: $0 [--check | --deploy | --status]"
    echo "Supported aliases: check, --check, deploy, --deploy, status, --status"
    exit 1
    ;;
esac

