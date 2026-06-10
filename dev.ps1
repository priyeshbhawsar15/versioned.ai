# VersionedAI Dev Script
# Usage: .\dev.ps1           — full build (CLI + UI) then start server
#        .\dev.ps1 -SkipUI    — rebuild CLI only (faster, skip UI build)
#        .\dev.ps1 -UIOnly    — rebuild UI only then copy assets

param(
    [switch]$SkipUI,
    [switch]$UIOnly
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$CLI = Join-Path $Root "packages\cli"
$UI  = Join-Path $Root "packages\ui"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }

# --- Stop any existing server on port 3000 ---
try {
    $procs = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty OwningProcess -Unique |
             Where-Object { $_ -ne 0 }
    foreach ($pid in $procs) {
        Write-Host "Stopping existing process on port 3000 (PID $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
} catch {}

# --- Build CLI ---
if (-not $UIOnly) {
    Write-Step "Compiling CLI (tsc)"
    Push-Location $CLI
    npx tsc
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host "CLI build failed!" -ForegroundColor Red; exit 1 }
    Pop-Location
}

# --- Build UI ---
if (-not $SkipUI) {
    Write-Step "Building UI (next build)"
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    Push-Location $UI
    npx next build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host "UI build failed!" -ForegroundColor Red; exit 1 }
    Pop-Location
}

# --- Copy UI assets into CLI dist ---
Write-Step "Copying UI assets"
Push-Location $CLI
node scripts/copy-ui.js
Pop-Location

# --- Start server ---
if (-not $UIOnly) {
    Write-Step "Starting server at http://localhost:3000"
    Push-Location $CLI
    node dist/index.js dev
    Pop-Location
}

Write-Host "`nDone." -ForegroundColor Green
