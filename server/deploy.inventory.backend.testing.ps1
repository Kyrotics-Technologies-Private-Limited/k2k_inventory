# ==============================================================================
# deploy.inventory.backend.testing.ps1
# Automated Cloud Run Deployment Script for Univillage Inventory Backend (Testing)
# ==============================================================================
param (
    [string]$Action = "--check"
)

$ErrorActionPreference = "Continue"

$EXPECTED_PROJECT = "univillage-testing-a640c"
$FORBIDDEN_PROJECT = "univillage-503009"
$REGION = "us-central1"
$SERVICE_NAME = "k2k-inventory-api"
$SERVICE_ACCOUNT = "k2k-inventory-backend@$EXPECTED_PROJECT.iam.gserviceaccount.com"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Univillage Inventory Backend Deployment Tool (Testing)" -ForegroundColor Cyan
Write-Host "  Target Project: $EXPECTED_PROJECT" -ForegroundColor Cyan
Write-Host "  Region:         $REGION" -ForegroundColor Cyan
Write-Host "  Service Name:   $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "  Mode:           $Action" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

function Test-ProjectIsolation {
    $rawProj = (gcloud config get-value project 2>$null)
    $currentProj = "$rawProj".Trim()
    if ($currentProj -eq $FORBIDDEN_PROJECT) {
        Write-Warning "Active gcloud project is set to production ($FORBIDDEN_PROJECT)."
        Write-Host "This script will explicitly override and target ONLY: $EXPECTED_PROJECT."
    }
}

function Run-Checks {
    Write-Host "[STEP 1/5] Checking CLI tools and authentication..." -ForegroundColor Yellow
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "gcloud CLI is not installed or not in PATH."
        exit 1
    }

    $rawAccount = (gcloud config get-value account 2>$null)
    $activeAccount = "$rawAccount".Trim()
    if (-not $activeAccount -or $activeAccount -eq "(unset)") {
        Write-Error "No authenticated gcloud account found. Run 'gcloud auth login'."
        exit 1
    }
    Write-Host "[OK] Authenticated account: $activeAccount" -ForegroundColor Green

    Write-Host "[STEP 2/5] Validating GCP project prerequisites on $EXPECTED_PROJECT..." -ForegroundColor Yellow
    Test-ProjectIsolation

    $rawBilling = (gcloud billing projects describe $EXPECTED_PROJECT --format="value(billingEnabled)" 2>$null)
    $billingEnabled = "$rawBilling".Trim()
    if ($billingEnabled -ne "True" -and $billingEnabled -ne "true") {
        Write-Error "Billing is not enabled for project $EXPECTED_PROJECT."
        exit 1
    }
    Write-Host "[OK] Billing is active." -ForegroundColor Green

    Write-Host "[STEP 3/5] Verifying required GCP APIs are enabled..." -ForegroundColor Yellow
    $requiredApis = @("run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com")
    foreach ($api in $requiredApis) {
        $enabled = gcloud services list --project=$EXPECTED_PROJECT --enabled --filter="name:$api" --format="value(name)"
        if (-not $enabled) {
            Write-Error "Required API '$api' is not enabled on $EXPECTED_PROJECT."
            exit 1
        }
    }
    Write-Host "[OK] Cloud Run, Cloud Build, Artifact Registry, and Firestore APIs are enabled." -ForegroundColor Green

    Write-Host "[STEP 4/5] Verifying runtime service account..." -ForegroundColor Yellow
    $sa = gcloud iam service-accounts describe $SERVICE_ACCOUNT --project=$EXPECTED_PROJECT --format="value(email)" 2>$null
    if (-not $sa) {
        Write-Error "Runtime service account '$SERVICE_ACCOUNT' does not exist."
        exit 1
    }
    Write-Host "[OK] Runtime service account verified: $SERVICE_ACCOUNT" -ForegroundColor Green

    Write-Host "[STEP 5/5] Running automated backend security test suite..." -ForegroundColor Yellow
    Push-Location $ScriptDir
    try {
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Backend test suite failed with exit code $LASTEXITCODE."
            exit 1
        }
        Write-Host "[OK] All security unit and integration tests passed." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host ">>> ALL PRE-DEPLOYMENT CHECKS PASSED SUCCESSFULLY." -ForegroundColor Green
}

function Run-Deploy {
    Run-Checks

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  Deploying $SERVICE_NAME to Google Cloud Run" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""

    Push-Location $ScriptDir
    try {
        gcloud run deploy $SERVICE_NAME `
            --source=. `
            --region=$REGION `
            --project=$EXPECTED_PROJECT `
            --service-account=$SERVICE_ACCOUNT `
            --allow-unauthenticated `
            --min-instances=0 `
            --max-instances=1 `
            --memory=512Mi `
            --cpu=1 `
            --cpu-boost `
            --cpu-throttling `
            --set-env-vars="NODE_ENV=production,APP_ENV=testing,FIREBASE_PROJECT_ID=$EXPECTED_PROJECT,FRONTEND_URL=https://univillage-inventory-testing.web.app" `
            --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Cloud Run deployment failed with exit code $LASTEXITCODE."
            exit 1
        }
    }
    finally {
        Pop-Location
    }

    $rawUrl = (gcloud run services describe $SERVICE_NAME --region=$REGION --project=$EXPECTED_PROJECT --format="value(status.url)" 2>$null)
    $serviceUrl = "$rawUrl".Trim()

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  Deployment Complete" -ForegroundColor Green
    Write-Host "  Live Service URL: $serviceUrl" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "Verifying service health endpoint..." -ForegroundColor Yellow
    try {
        $res = Invoke-RestMethod -Uri "$serviceUrl/health" -Method Get -TimeoutSec 15
        Write-Host "[SUCCESS] Live health check returned 200 OK." -ForegroundColor Green
        Write-Host ($res | ConvertTo-Json -Compress)
    }
    catch {
        Write-Warning "Health check returned warning: $_"
    }
}

function Run-Status {
    Write-Host "Retrieving Cloud Run status for $SERVICE_NAME in $EXPECTED_PROJECT..." -ForegroundColor Yellow
    $checkService = gcloud run services describe $SERVICE_NAME --region=$REGION --project=$EXPECTED_PROJECT 2>&1 | Out-String
    if ($checkService -match "Cannot find service" -or $LASTEXITCODE -ne 0) {
        Write-Host "[INFO] Service '$SERVICE_NAME' is not currently deployed in $EXPECTED_PROJECT." -ForegroundColor Yellow
        return
    }

    gcloud run services describe $SERVICE_NAME `
        --region=$REGION `
        --project=$EXPECTED_PROJECT `
        --format="table(metadata.name:label=SERVICE,status.url:label=URL,status.latestReadyRevisionName:label=REVISION,spec.template.spec.serviceAccountName:label=SERVICE_ACCOUNT,spec.template.spec.containers[0].resources.limits.memory:label=MEMORY,spec.template.spec.containers[0].resources.limits.cpu:label=CPU,status.conditions[0].status:label=READY)"

    $rawUrl = (gcloud run services describe $SERVICE_NAME --region=$REGION --project=$EXPECTED_PROJECT --format="value(status.url)" 2>$null)
    $serviceUrl = "$rawUrl".Trim()
    if ($serviceUrl) {
        Write-Host "`nProbing live health endpoint ($serviceUrl/health)..." -ForegroundColor Yellow
        try {
            $health = Invoke-RestMethod -Uri "$serviceUrl/health" -Method Get -TimeoutSec 5
            Write-Host "[OK] Health probe response: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
        }
        catch {
            Write-Warning "Health check warning: $_"
        }
    }
}

$normalizedAction = $Action.ToLower().TrimStart('-')
switch ($normalizedAction) {
    "check"  { Run-Checks }
    "deploy" { Run-Deploy }
    "status" { Run-Status }
    default  {
        Write-Host "Usage: deploy.inventory.backend.testing.ps1 [-Action <check|deploy|status>]"
        Write-Host "Supported action aliases: --check, -check, check, --deploy, -deploy, deploy, --status, -status, status"
    }
}
