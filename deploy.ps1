<#
.SYNOPSIS
    Automated Cloud Run Deployment Script for Univillage Admin Portal
.DESCRIPTION
    Deploys univillage-admin-backend and/or univillage-admin-frontend to Google Cloud Run.
.PARAMETER Target
    Target to deploy: 'all' (default), 'backend', or 'frontend'.
.PARAMETER ProjectId
    GCP Project ID (default: 'univillage-503009').
.PARAMETER Region
    GCP Region (default: 'us-central1').
.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Target backend
    .\deploy.ps1 -Target frontend
#>

[CmdletBinding()]
param (
    [ValidateSet('all', 'backend', 'frontend')]
    [string]$Target = 'all',

    [string]$ProjectId = 'univillage-503009',
    [string]$Region = 'us-central1',
    [string]$BackendServiceName = 'univillage-admin-backend',
    [string]$FrontendServiceName = 'univillage-admin-frontend'
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 1. Validate gcloud CLI
Write-Step "Checking Prerequisites"
if (-not (Get-Command "gcloud" -ErrorAction SilentlyContinue)) {
    Write-Err "gcloud CLI is not installed or not in PATH."
    Write-Err "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
}

Write-Info "Setting active GCP Project to: $ProjectId"
gcloud config set project $ProjectId --quiet

$activeAccount = (gcloud config get-value account 2>$null)
Write-Info "Active gcloud account: $activeAccount"

$backendUrl = ""
$frontendUrl = ""

# 2. Deploy Backend
if ($Target -eq 'all' -or $Target -eq 'backend') {
    Write-Step "Deploying Backend: $BackendServiceName"
    $serverDir = Join-Path $ScriptDir "server"

    if (-not (Test-Path $serverDir)) {
        Write-Err "Server directory not found at $serverDir"
        exit 1
    }

    Push-Location $serverDir
    try {
        Write-Info "Building and deploying backend container to Cloud Run ($Region)..."
        gcloud run deploy $BackendServiceName `
            --source . `
            --region $Region `
            --project $ProjectId `
            --allow-unauthenticated `
            --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=$ProjectId,FIREBASE_STORAGE_BUCKET=$ProjectId.firebasestorage.app" `
            --quiet

        $backendUrl = (gcloud run services describe $BackendServiceName --region $Region --project $ProjectId --format "value(status.url)")
        Write-Success "Backend deployed successfully!"
        Write-Host "Backend URL: $backendUrl" -ForegroundColor Green
    }
    catch {
        Write-Err "Backend deployment failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
} else {
    # If deploying frontend only, fetch existing backend URL
    $backendUrl = (gcloud run services describe $BackendServiceName --region $Region --project $ProjectId --format "value(status.url)" 2>$null)
}

# 3. Deploy Frontend
if ($Target -eq 'all' -or $Target -eq 'frontend') {
    Write-Step "Deploying Frontend: $FrontendServiceName"
    $clientDir = Join-Path $ScriptDir "client"

    if (-not (Test-Path $clientDir)) {
        Write-Err "Client directory not found at $clientDir"
        exit 1
    }

    # Verify or update .env.production if backend URL is known
    $envProdPath = Join-Path $clientDir ".env.production"
    if ($backendUrl -and (Test-Path $envProdPath)) {
        $envContent = Get-Content $envProdPath -Raw
        if ($envContent -notmatch "VITE_BACKEND_URL") {
            Add-Content -Path $envProdPath -Value "`nVITE_BACKEND_URL=$backendUrl"
        }
    }

    Push-Location $clientDir
    try {
        Write-Info "Building and deploying frontend container to Cloud Run ($Region)..."
        gcloud run deploy $FrontendServiceName `
            --source . `
            --region $Region `
            --project $ProjectId `
            --allow-unauthenticated `
            --quiet

        $frontendUrl = (gcloud run services describe $FrontendServiceName --region $Region --project $ProjectId --format "value(status.url)")
        Write-Success "Frontend deployed successfully!"
        Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Green
    }
    catch {
        Write-Err "Frontend deployment failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Summary
Write-Step "Deployment Completed Summary"
if ($backendUrl) {
    Write-Host " Backend Service  : $backendUrl" -ForegroundColor Green
}
if ($frontendUrl) {
    Write-Host " Frontend Service : $frontendUrl" -ForegroundColor Green
}
Write-Host "`nAll targeted services are live and operational on Cloud Run.`n" -ForegroundColor Cyan
