[CmdletBinding()]
param (
    [ValidateSet('all', 'backend', 'frontend')]
    [string]$Target = 'all',
    [ValidateSet('univillage-503009')]
    [string]$ProjectId = 'univillage-503009',
    [ValidateSet('us-central1')]
    [string]$Region = 'us-central1',
    [ValidateSet('univillage-admin-backend')]
    [string]$BackendServiceName = 'univillage-admin-backend',
    [ValidateSet('univillage-admin-frontend')]
    [string]$FrontendServiceName = 'univillage-admin-frontend'
)

$ErrorActionPreference = 'Stop'
$null = Get-Command gcloud
$locationArgs = @("--region=$Region", "--project=$ProjectId")

function Invoke-CloudRun {
    & gcloud run @args
    if ($LASTEXITCODE -ne 0) { throw "Cloud Run command failed with exit code $LASTEXITCODE." }
}

function Get-ServiceUrl([string]$ServiceName) {
    $url = Invoke-CloudRun services describe $ServiceName @locationArgs '--format=value(status.url)'
    if (-not $url) { throw "Existing Cloud Run URL is required for $ServiceName." }
    return $url
}

$backendUrl = Get-ServiceUrl $BackendServiceName
$frontendUrl = Get-ServiceUrl $FrontendServiceName
if ($Target -in @('all', 'backend')) {
    $serverDir = Join-Path $PSScriptRoot 'server'
    $runtimeConfig = "NODE_ENV=production,APP_ENV=production,FIREBASE_PROJECT_ID=$ProjectId,FIREBASE_STORAGE_BUCKET=$ProjectId.firebasestorage.app,FRONTEND_URL=$frontendUrl"
    Invoke-CloudRun deploy $BackendServiceName @locationArgs "--source=$serverDir" '--clear-base-image' "--update-env-vars=$runtimeConfig" '--quiet'
    if ((Get-ServiceUrl $BackendServiceName) -cne $backendUrl) { throw 'The backend URL changed.' }
    Write-Host "Backend URL $backendUrl"
}

if ($Target -in @('all', 'frontend')) {
    $clientDir = Join-Path $PSScriptRoot 'client'
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $stagingDir = Join-Path $tempRoot ([IO.Path]::GetRandomFileName())
    $null = New-Item -ItemType Directory -Path $stagingDir
    $previousBackendUrl = $env:VITE_BACKEND_URL

    try {
        $env:VITE_BACKEND_URL = $backendUrl
        $dist = Join-Path $stagingDir 'dist'
        & npm --prefix $clientDir run build:production -- --outDir $dist
        if ($LASTEXITCODE -ne 0) { throw 'Production frontend build failed.' }
        Copy-Item -LiteralPath (Join-Path $clientDir 'nginx.conf') -Destination $stagingDir
        Copy-Item -LiteralPath (Join-Path $clientDir 'Dockerfile.release') -Destination (Join-Path $stagingDir 'Dockerfile')
        Invoke-CloudRun deploy $FrontendServiceName @locationArgs "--source=$stagingDir" '--clear-base-image' '--quiet'
        if ((Get-ServiceUrl $FrontendServiceName) -cne $frontendUrl) { throw 'The frontend URL changed.' }
        Write-Host "Frontend URL $frontendUrl"
    }
    finally {
        $env:VITE_BACKEND_URL = $previousBackendUrl
        if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($stagingDir)) -eq $tempRoot.TrimEnd('\', '/')) {
            Remove-Item -LiteralPath $stagingDir -Recurse -Force
        }
    }
}
