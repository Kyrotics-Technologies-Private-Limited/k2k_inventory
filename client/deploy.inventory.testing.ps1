# ==============================================================================
# deploy.inventory.testing.ps1
# Automated Firebase Hosting Deployment Script for Univillage Inventory Frontend (Testing)
# ==============================================================================
param (
    [string]$Action = "--check"
)

$ErrorActionPreference = "Continue"

$EXPECTED_PROJECT = "univillage-testing-a640c"
$FORBIDDEN_PROJECT = "univillage-503009"
$EXPECTED_SITE = "univillage-inventory-testing"
$TARGET_ALIAS = "inventory"
$BACKEND_URL = "https://k2k-inventory-api-42827689186.us-central1.run.app"
$STOREFRONT_SITE = "univillage-testing-a640c"
$STOREFRONT_URL = "https://univillage-testing-a640c.web.app"

$ClientDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ClientDir

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Univillage Inventory Frontend Deployment Tool (Testing)" -ForegroundColor Cyan
Write-Host "  Target Project: $EXPECTED_PROJECT" -ForegroundColor Cyan
Write-Host "  Hosting Site:   $EXPECTED_SITE" -ForegroundColor Cyan
Write-Host "  Target Alias:   $TARGET_ALIAS" -ForegroundColor Cyan
Write-Host "  Backend URL:    $BACKEND_URL" -ForegroundColor Cyan
Write-Host "  Mode:           $Action" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Checks {
    Write-Host "[STEP 1/7] Verifying CLI prerequisites..." -ForegroundColor Yellow
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not found in PATH."
        exit 1
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not found in PATH."
        exit 1
    }
    if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
        Write-Error "Firebase CLI is not found in PATH."
        exit 1
    }
    Write-Host "[OK] Node $(node -v), npm $(npm -v), and Firebase CLI available." -ForegroundColor Green

    Write-Host "[STEP 2/7] Verifying Firebase CLI authentication and project..." -ForegroundColor Yellow
    $fbProjects = firebase projects:list 2>&1 | Out-String
    if ($fbProjects -notmatch $EXPECTED_PROJECT) {
        Write-Error "Project '$EXPECTED_PROJECT' not accessible via Firebase CLI. Check 'firebase login'."
        exit 1
    }
    Write-Host "[OK] Authenticated and confirmed access to $EXPECTED_PROJECT." -ForegroundColor Green

    Write-Host "[STEP 3/7] Verifying Backend Health..." -ForegroundColor Yellow
    try {
        $backendHealth = Invoke-RestMethod -Uri "$BACKEND_URL/health" -Method Get -TimeoutSec 10
        if ($backendHealth.status -ne "healthy") {
            Write-Error "Backend health check failed: status is not 'healthy'."
            exit 1
        }
        Write-Host "[OK] Cloud Run backend healthy: ($($backendHealth | ConvertTo-Json -Compress))" -ForegroundColor Green
    } catch {
        Write-Error "Cannot reach Cloud Run backend at $BACKEND_URL/health: $_"
        exit 1
    }

    Write-Host "[STEP 4/7] Verifying Hosting Target mapping..." -ForegroundColor Yellow
    $rcPath = Join-Path $RepoRoot ".firebaserc"
    if (-not (Test-Path $rcPath)) {
        $rcPath = Join-Path $ClientDir ".firebaserc"
    }
    $rc = Get-Content $rcPath -Raw | ConvertFrom-Json
    $mappedSites = $rc.targets."$EXPECTED_PROJECT".hosting."$TARGET_ALIAS"
    
    # Check that target alias maps to expected site (handles both string and array)
    $hasExpectedSite = $false
    if ($mappedSites -is [array]) {
        $hasExpectedSite = $mappedSites -contains $EXPECTED_SITE
    } else {
        $hasExpectedSite = ($mappedSites -eq $EXPECTED_SITE)
    }

    if (-not $hasExpectedSite) {
        Write-Error "Target alias '$TARGET_ALIAS' maps to '$mappedSites', expected '$EXPECTED_SITE'."
        exit 1
    }

    # Strict Storefront site guard
    if (($mappedSites -is [array] -and $mappedSites -contains $STOREFRONT_SITE) -or ($mappedSites -eq $STOREFRONT_SITE)) {
        Write-Error "CRITICAL: Target alias maps to Storefront site '$STOREFRONT_SITE'. Aborting!"
        exit 1
    }
    Write-Host "[OK] Target '$TARGET_ALIAS' strictly maps to '$EXPECTED_SITE'." -ForegroundColor Green

    Write-Host "[STEP 5/7] Verifying Environment Configuration..." -ForegroundColor Yellow
    $envTestingPath = Join-Path $ClientDir ".env.testing"
    if (-not (Test-Path $envTestingPath)) {
        Write-Error ".env.testing not found in $ClientDir"
        exit 1
    }
    $envContent = Get-Content $envTestingPath -Raw
    if ($envContent -match $FORBIDDEN_PROJECT) {
        Write-Error "CRITICAL: .env.testing contains production project ID '$FORBIDDEN_PROJECT'!"
        exit 1
    }
    if ($envContent -notmatch $EXPECTED_PROJECT) {
        Write-Error ".env.testing missing target project ID '$EXPECTED_PROJECT'."
        exit 1
    }
    if ($envContent -notmatch [regex]::Escape($BACKEND_URL)) {
        Write-Error ".env.testing missing backend URL '$BACKEND_URL'."
        exit 1
    }
    Write-Host "[OK] .env.testing verified for $EXPECTED_PROJECT." -ForegroundColor Green

    Write-Host "[STEP 6/7] Running Frontend Unit Tests..." -ForegroundColor Yellow
    Push-Location $ClientDir
    try {
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend unit tests failed with exit code $LASTEXITCODE."
            exit 1
        }
        Write-Host "[OK] Frontend unit tests passed." -ForegroundColor Green
    } finally {
        Pop-Location
    }

    Write-Host "[STEP 7/7] Compiling Frontend Bundle in Testing Mode..." -ForegroundColor Yellow
    Push-Location $ClientDir
    try {
        npm run build -- --mode testing
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend build failed with exit code $LASTEXITCODE."
            exit 1
        }
        $distIndex = Join-Path $ClientDir "dist\index.html"
        if (-not (Test-Path $distIndex)) {
            Write-Error "Build output dist\index.html was not generated."
            exit 1
        }

        # Inspect all generated JS bundle files
        $jsFiles = Get-ChildItem -Path (Join-Path $ClientDir "dist\assets") -Filter "*.js"
        $combinedBundle = ""
        foreach ($file in $jsFiles) {
            $combinedBundle += (Get-Content $file.FullName -Raw)
        }

        if ($combinedBundle -match $FORBIDDEN_PROJECT) {
            Write-Error "CRITICAL: Compiled bundle contains production project ID '$FORBIDDEN_PROJECT'!"
            exit 1
        }
        if (-not ($combinedBundle -match $EXPECTED_PROJECT)) {
            Write-Error "Compiled bundle does not contain expected testing project ID '$EXPECTED_PROJECT'."
            exit 1
        }
        if (-not ($combinedBundle -match [regex]::Escape($BACKEND_URL))) {
            Write-Error "Compiled bundle does not contain expected backend URL '$BACKEND_URL'."
            exit 1
        }
        Write-Host "[OK] Compiled bundle successfully verified against testing configuration." -ForegroundColor Green
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host ">>> ALL FRONTEND PRE-DEPLOYMENT CHECKS PASSED SUCCESSFULLY." -ForegroundColor Green
}

function Run-Deploy {
    Run-Checks

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  Deploying Inventory Frontend to Firebase Hosting" -ForegroundColor Cyan
    Write-Host "  Target: hosting:$TARGET_ALIAS ($EXPECTED_SITE)" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""

    Push-Location $RepoRoot
    try {
        firebase deploy --only "hosting:$TARGET_ALIAS" --project $EXPECTED_PROJECT
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Firebase hosting deploy failed with exit code $LASTEXITCODE."
            exit 1
        }
    } finally {
        Pop-Location
    }

    $liveUrl = "https://$EXPECTED_SITE.web.app"
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  Hosting Deployment Complete!" -ForegroundColor Green
    Write-Host "  Live Inventory URL: $liveUrl" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""

    Write-Host "Performing Live End-to-End Probes..." -ForegroundColor Yellow
    try {
        $resRoot = Invoke-WebRequest -Uri $liveUrl -Method Get -TimeoutSec 15 -UseBasicParsing
        Write-Host "[OK] Root URL '$liveUrl' returned HTTP $($resRoot.StatusCode)." -ForegroundColor Green

        $resLogin = Invoke-WebRequest -Uri "$liveUrl/admin/login" -Method Get -TimeoutSec 15 -UseBasicParsing
        Write-Host "[OK] SPA Route '$liveUrl/admin/login' returned HTTP $($resLogin.StatusCode)." -ForegroundColor Green

        # Verify Storefront unaffected
        $sfRes = Invoke-WebRequest -Uri $STOREFRONT_URL -Method Get -TimeoutSec 15 -UseBasicParsing
        Write-Host "[OK] Storefront '$STOREFRONT_URL' unaffected: HTTP $($sfRes.StatusCode)." -ForegroundColor Green
    } catch {
        Write-Warning "Live probe encountered warning: $_"
    }
}

function Run-Status {
    Write-Host "Project ID:        $EXPECTED_PROJECT"
    Write-Host "Hosting Site ID:   $EXPECTED_SITE"
    Write-Host "Hosting URL:       https://$EXPECTED_SITE.web.app"
    Write-Host "Hosting Alias:     $TARGET_ALIAS"
    Write-Host "Backend URL:       $BACKEND_URL"

    try {
        $backendHealth = Invoke-RestMethod -Uri "$BACKEND_URL/health" -Method Get -TimeoutSec 5
        Write-Host "Backend Health:    $($backendHealth.status) ($($backendHealth.timestamp))" -ForegroundColor Green
    } catch {
        Write-Host "Backend Health:    UNREACHABLE ($($_))" -ForegroundColor Red
    }

    try {
        $webRes = Invoke-WebRequest -Uri "https://$EXPECTED_SITE.web.app" -Method Get -TimeoutSec 5 -UseBasicParsing
        Write-Host "Frontend Status:   HTTP $($webRes.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "Frontend Status:   NOT DEPLOYED / UNREACHABLE" -ForegroundColor Yellow
    }
}

$normalizedAction = $Action.ToLower().TrimStart('-')
switch ($normalizedAction) {
    "check"  { Run-Checks }
    "deploy" { Run-Deploy }
    "status" { Run-Status }
    default  {
        Write-Host "Usage: deploy.inventory.testing.ps1 [-Action <check|deploy|status>]"
        Write-Host "Supported action aliases: --check, -check, check, --deploy, -deploy, deploy, --status, -status, status"
    }
}
