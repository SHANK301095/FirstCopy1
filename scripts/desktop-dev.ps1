# ============================================
# MMC Desktop Dev - One-Click Development Script
# Starts Backend + Vite + Electron with proper sequencing
# ============================================

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "MMC Desktop Dev"

# Colors
function Write-Status($msg) { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[X] $msg" -ForegroundColor Red }

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "   MMC Desktop Development Environment     " -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# Track child processes for cleanup
$script:ChildProcesses = @()

function Cleanup {
    Write-Host ""
    Write-Warn "Shutting down..."
    foreach ($proc in $script:ChildProcesses) {
        if ($proc -and !$proc.HasExited) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Status "Stopped process $($proc.Id)"
            } catch {}
        }
    }
    Write-Success "Cleanup complete"
}

# Register cleanup on exit
trap { Cleanup; break }

# ============================================
# Step 1: Check Prerequisites
# ============================================
Write-Status "Checking prerequisites..."

# Check Python
$pythonPath = Join-Path $ProjectRoot "backend\.venv\Scripts\python.exe"
if (!(Test-Path $pythonPath)) {
    Write-Err "Python venv not found at: $pythonPath"
    Write-Host "Run this first:" -ForegroundColor Yellow
    Write-Host "  cd backend"
    Write-Host "  python -m venv .venv"
    Write-Host "  .\.venv\Scripts\Activate.ps1"
    Write-Host "  pip install -r requirements.txt"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Success "Python venv found"

# Check Node
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Err "Node.js not found. Install from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Success "Node.js found: $(node --version)"

# Check node_modules
$nodeModules = Join-Path $ProjectRoot "node_modules"
if (!(Test-Path $nodeModules)) {
    Write-Warn "node_modules not found, installing..."
    npm install
}
Write-Success "Dependencies ready"

# Create logs directory
$logsDir = Join-Path $ProjectRoot "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# ============================================
# Step 2: Start Backend
# ============================================
Write-Host ""
Write-Status "Starting Python backend..."

$backendDir = Join-Path $ProjectRoot "backend"
$backendProcess = Start-Process -FilePath $pythonPath -ArgumentList "main.py", "--port", "32145" -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden

$script:ChildProcesses += $backendProcess

# Wait for backend health
Write-Status "Waiting for backend to be ready..."
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:32145/health" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 500
    Write-Host "." -NoNewline
}
Write-Host ""

if ($backendReady) {
    Write-Success "Backend ready on http://127.0.0.1:32145"
} else {
    Write-Warn "Backend may not be ready yet - continuing anyway"
}

# ============================================
# Step 3: Start Vite Dev Server
# ============================================
Write-Host ""
Write-Status "Starting Vite dev server..."

$npmPath = (Get-Command npm).Source
$viteProcess = Start-Process -FilePath $npmPath -ArgumentList "run", "dev" -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Minimized

$script:ChildProcesses += $viteProcess

# Wait for Vite
Write-Status "Waiting for Vite to be ready..."
$viteReady = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $viteReady = $true
            break
        }
    } catch {}
    Start-Sleep -Milliseconds 500
    Write-Host "." -NoNewline
}
Write-Host ""

if ($viteReady) {
    Write-Success "Vite ready on http://localhost:5173"
} else {
    Write-Err "Vite failed to start - check for errors"
    Cleanup
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================
# Step 4: Compile and Start Electron
# ============================================
Write-Host ""
Write-Status "Compiling Electron TypeScript..."

$npxPath = (Get-Command npx).Source
$tscArgs = "tsc", "-p", "electron/tsconfig.json"
$tscProcess = Start-Process -FilePath $npxPath -ArgumentList $tscArgs -WorkingDirectory $ProjectRoot -Wait -PassThru -NoNewWindow

if ($tscProcess.ExitCode -ne 0) {
    Write-Err "TypeScript compilation failed"
    Cleanup
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Success "Electron compiled"

Write-Status "Launching Electron..."
$electronArgs = "electron", "dist-electron/main.js"
$electronProcess = Start-Process -FilePath $npxPath -ArgumentList $electronArgs -WorkingDirectory $ProjectRoot -PassThru

$script:ChildProcesses += $electronProcess

# ============================================
# Done!
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   All services running!                   " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Backend:  http://127.0.0.1:32145        " -ForegroundColor Green
Write-Host "   Vite:     http://localhost:5173         " -ForegroundColor Green
Write-Host "   Electron: Running                       " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Wait for Electron to close
try {
    $electronProcess.WaitForExit()
} finally {
    Cleanup
}
