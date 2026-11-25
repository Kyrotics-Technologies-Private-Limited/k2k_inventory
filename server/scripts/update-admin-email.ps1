<#
.SYNOPSIS
    Update admin account to admin@univillage.in with password 123456
.DESCRIPTION
    Configures Firebase Auth user, custom claims ({ role: 'admin', isAdmin: true }),
    and Firestore 'admin' & 'users' collections for both Inventory and Traceability systems.
.PARAMETER Environment
    Target environment: 'testing' (default), 'production', or 'all'/'both'.
.EXAMPLE
    .\update-admin-email.ps1 -Environment testing
    .\update-admin-email.ps1 -Environment production
    .\update-admin-email.ps1 -Environment all
#>

[CmdletBinding()]
param (
    [ValidateSet('testing', 'production', 'all', 'both')]
    [string]$Environment = 'testing'
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Split-Path -Parent $ScriptDir

$NodeScript = Join-Path $ScriptDir "updateAdminEmail.js"

if (-not (Test-Path $NodeScript)) {
    Write-Error "Could not find node script at: $NodeScript"
    exit 1
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  Univillage Admin Credential Configuration Script" -ForegroundColor Cyan
Write-Host "  Target Environment: $Environment" -ForegroundColor Cyan
Write-Host "  New Admin Email:    admin@univillage.in" -ForegroundColor Cyan
Write-Host "  Password:           123456" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not found in PATH."
    exit 1
}

# Execute script
Push-Location $ServerDir
try {
    node $NodeScript $Environment
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Script execution failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
