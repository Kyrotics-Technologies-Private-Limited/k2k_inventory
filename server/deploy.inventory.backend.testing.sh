#!/usr/bin/env bash
# ==============================================================================
# deploy.inventory.backend.testing.sh
# Automated Cloud Run Deployment Script for Univillage Inventory Backend (Testing)
# ==============================================================================
set -Eeuo pipefail

EXPECTED_PROJECT="univillage-testing-a640c"
FORBIDDEN_PROJECT="univillage-503009"
REGION="us-central1"
SERVICE_NAME="k2k-inventory-api"
SERVICE_ACCOUNT="k2k-inventory-backend@${EXPECTED_PROJECT}.iam.gserviceaccount.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:---check}"

echo ""
echo "========================================================"
echo "  Univillage Inventory Backend Deployment Tool (Testing)"
echo "  Target Project: ${EXPECTED_PROJECT}"
echo "  Region:         ${REGION}"
echo "  Service Name:   ${SERVICE_NAME}"
echo "  Mode:           ${ACTION}"
echo "========================================================"
echo ""

# Guard: Strict rejection of production project
validate_project_isolation() {
  local current_gcloud_proj
  current_gcloud_proj=$(gcloud config get-value project 2>/dev/null || true)
  if [[ "${current_gcloud_proj}" == "${FORBIDDEN_PROJECT}" ]]; then
    echo "[SECURITY WARNING] Active gcloud project is set to production (${FORBIDDEN_PROJECT})."
    echo "This script will explicitly override and target ONLY: ${EXPECTED_PROJECT}."
  fi
}

run_checks() {
  echo "[STEP 1/5] Checking CLI tools and authentication..."
  if ! command -v gcloud &>/dev/null; then
    echo "[ERROR] gcloud CLI is not installed or not in PATH."
    exit 1
  fi

  local active_account
  active_account=$(gcloud config get-value account 2>/dev/null || true)
  if [[ -z "${active_account}" ]]; then
    echo "[ERROR] No authenticated gcloud account found. Run 'gcloud auth login'."
    exit 1
  fi
  echo "[OK] Authenticated account: ${active_account}"

  echo "[STEP 2/5] Validating GCP project prerequisites on ${EXPECTED_PROJECT}..."
  validate_project_isolation

  local billing_enabled
  billing_enabled=$(gcloud billing projects describe "${EXPECTED_PROJECT}" --format="value(billingEnabled)" 2>/dev/null || echo "false")
  if [[ "${billing_enabled}" != "true" ]]; then
    echo "[ERROR] Billing is not enabled for project ${EXPECTED_PROJECT}."
    exit 1
  fi
  echo "[OK] Billing is active."

  echo "[STEP 3/5] Verifying required GCP APIs are enabled..."
  local required_apis=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "firestore.googleapis.com"
  )
  for api in "${required_apis[@]}"; do
    if ! gcloud services list --project="${EXPECTED_PROJECT}" --enabled --filter="name:${api}" --format="value(name)" | grep -q "${api}"; then
      echo "[ERROR] Required API '${api}' is not enabled on ${EXPECTED_PROJECT}."
      exit 1
    fi
  done
  echo "[OK] Cloud Run, Cloud Build, Artifact Registry, and Firestore APIs are enabled."

  echo "[STEP 4/5] Verifying runtime service account..."
  if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${EXPECTED_PROJECT}" &>/dev/null; then
    echo "[ERROR] Runtime service account '${SERVICE_ACCOUNT}' does not exist."
    exit 1
  fi
  echo "[OK] Runtime service account verified: ${SERVICE_ACCOUNT}"

  echo "[STEP 5/5] Running automated backend security test suite..."
  cd "${SCRIPT_DIR}"
  npm test
  echo "[OK] All security unit and integration tests passed."
  echo ""
  echo ">>> ALL PRE-DEPLOYMENT CHECKS PASSED SUCCESSFULLY."
}

run_deploy() {
  run_checks

  echo ""
  echo "========================================================"
  echo "  Deploying ${SERVICE_NAME} to Google Cloud Run"
  echo "========================================================"
  echo ""

  cd "${SCRIPT_DIR}"

  gcloud run deploy "${SERVICE_NAME}" \
    --source=. \
    --region="${REGION}" \
    --project="${EXPECTED_PROJECT}" \
    --service-account="${SERVICE_ACCOUNT}" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=1 \
    --memory=512Mi \
    --cpu=1 \
    --cpu-boost \
    --cpu-throttling \
    --set-env-vars="NODE_ENV=production,APP_ENV=testing,FIREBASE_PROJECT_ID=${EXPECTED_PROJECT},FRONTEND_URL=https://univillage-inventory-testing.web.app" \
    --quiet

  local service_url
  service_url=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${EXPECTED_PROJECT}" --format="value(status.url)")

  echo ""
  echo "========================================================"
  echo "  Deployment Complete"
  echo "  Live Service URL: ${service_url}"
  echo "========================================================"
  echo ""

  echo "Verifying service health endpoint..."
  local health_code
  health_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${service_url}/health" || echo "000")
  if [[ "${health_code}" == "200" ]]; then
    echo "[SUCCESS] Live health check returned 200 OK."
    curl -s "${service_url}/health"
    echo ""
  else
    echo "[WARNING] Health check returned HTTP ${health_code} (cold start might take a few seconds)."
  fi
}

run_status() {
  echo "Retrieving Cloud Run status for ${SERVICE_NAME} in ${EXPECTED_PROJECT}..."
  if ! gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --project="${EXPECTED_PROJECT}" &>/dev/null; then
    echo "[INFO] Service '${SERVICE_NAME}' is not yet deployed in ${EXPECTED_PROJECT}."
    exit 0
  fi

  gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${EXPECTED_PROJECT}" \
    --format="table(
      metadata.name:label=SERVICE,
      status.url:label=URL,
      status.latestReadyRevisionName:label=REVISION,
      spec.template.spec.serviceAccountName:label=SERVICE_ACCOUNT,
      spec.template.spec.containers[0].resources.limits.memory:label=MEMORY,
      spec.template.spec.containers[0].resources.limits.cpu:label=CPU,
      status.conditions[0].status:label=READY
    )"
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

