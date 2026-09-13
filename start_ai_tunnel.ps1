param(
    [int]$Port = 8001,
    [switch]$NonInteractive,
    [switch]$AiOnly,
    [switch]$TunnelOnly
)

# =====================================================================
# AgriShield AI Inference Service & Public Tunnel Launcher
# Connects local compute/inference to Cloud Backend (Render) via ngrok
# =====================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "         AgriShield AI & Cloud Tunnel Orchestrator            " -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

$RootPath = $PSScriptRoot
$AiPath = Join-Path $RootPath "ai"

# ---------------------------------------------------------------------
# 1. Resolve Python Executable
# ---------------------------------------------------------------------
$PythonCandidates = @(
    (Join-Path $AiPath ".venv\Scripts\python.exe"),
    (Join-Path $AiPath "venv\Scripts\python.exe"),
    (Join-Path $RootPath ".venv\Scripts\python.exe"),
    (Join-Path $RootPath "backend\venv\Scripts\python.exe"),
    (Join-Path $RootPath "venv\Scripts\python.exe")
)

$PythonExe = $null
foreach ($candidate in $PythonCandidates) {
    if (Test-Path $candidate) {
        $PythonExe = $candidate
        break
    }
}

if (-not $PythonExe) {
    $SystemPython = Get-Command python -ErrorAction SilentlyContinue
    if ($SystemPython) {
        $PythonExe = $SystemPython.Source
    }
}

if (-not $PythonExe -and (Test-Path "C:\Python314\python.exe")) {
    $PythonExe = "C:\Python314\python.exe"
}

if (-not $PythonExe) {
    Write-Host "[!] Error: Could not locate Python. Please ensure Python is installed or a virtual environment exists." -ForegroundColor Red
    Write-Host "    To set up: cd ai; python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Python Runtime: $PythonExe" -ForegroundColor Gray

# ---------------------------------------------------------------------
# 2. Check / Start AI Service (Port $Port)
# ---------------------------------------------------------------------
if (-not $TunnelOnly) {
    $PortInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }

    if ($PortInUse) {
        Write-Host "[OK] AI Microservice is already running on port $Port (PID: $($PortInUse[0].OwningProcess))" -ForegroundColor Green
    } else {
        Write-Host "[*] Starting AgriShield AI Service on port $Port..." -ForegroundColor Yellow
        Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port $Port" -WorkingDirectory $AiPath -WindowStyle Minimized

        # Wait for AI service to respond on health check
        $Retries = 0
        $Healthy = $false
        while ($Retries -lt 25) {
            Start-Sleep -Seconds 1
            try {
                $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2 -ErrorAction Stop
                if ($resp.status -in @("healthy", "ok", "OK") -or $resp) {
                    $Healthy = $true
                    break
                }
            } catch {
                $Retries++
            }
        }

        if ($Healthy) {
            Write-Host "[OK] AI Microservice is healthy and listening on http://127.0.0.1:$Port" -ForegroundColor Green
        } else {
            Write-Host "[!] AI service started, but health check is taking longer than expected. Continuing..." -ForegroundColor Yellow
        }
    }
}

if ($AiOnly) {
    Write-Host "[*] AI-only mode selected. Skipping tunnel setup." -ForegroundColor Cyan
    exit 0
}

# ---------------------------------------------------------------------
# 3. Locate & Run Tunnel (ngrok or fallback)
# ---------------------------------------------------------------------
$NgrokCandidates = @(
    "ngrok",
    "$env:LOCALAPPDATA\Programs\ngrok\ngrok.exe",
    "$env:ProgramFiles\ngrok\ngrok.exe",
    "$env:USERPROFILE\bin\ngrok.exe",
    "$env:USERPROFILE\AppData\Local\Microsoft\WinGet\Links\ngrok.exe",
    "C:\ProgramData\chocolatey\bin\ngrok.exe"
)

$NgrokCommand = $null
foreach ($cmd in $NgrokCandidates) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $NgrokCommand = $cmd
        break
    }
    if (Test-Path $cmd) {
        $NgrokCommand = $cmd
        break
    }
}

$PublicUrl = $null

if ($NgrokCommand) {
    $NgrokProc = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue

    if (-not $NgrokProc) {
        Write-Host "[*] Launching ngrok tunnel forwarding to port $Port..." -ForegroundColor Yellow
        Start-Process -FilePath $NgrokCommand -ArgumentList "http $Port --log=stdout" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    } else {
        Write-Host "[OK] ngrok process already active (PID: $($NgrokProc[0].Id))" -ForegroundColor Green
    }

    $Retries = 0
    while ($Retries -lt 15 -and -not $PublicUrl) {
        try {
            $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
            if ($tunnels.tunnels -and $tunnels.tunnels.Count -gt 0) {
                $httpsTunnel = $tunnels.tunnels | Where-Object { $_.proto -eq "https" }
                if ($httpsTunnel) {
                    $PublicUrl = $httpsTunnel[0].public_url
                } else {
                    $PublicUrl = $tunnels.tunnels[0].public_url
                }
            }
        } catch {
            Start-Sleep -Seconds 1
            $Retries++
        }
    }
} else {
    Write-Host ""
    Write-Host "[!] Note: ngrok executable not found in PATH or standard directories." -ForegroundColor Yellow
    Write-Host "    Install ngrok via: winget install ngrok.ngrok" -ForegroundColor DarkGray
    Write-Host "    Or download from:  https://ngrok.com/download" -ForegroundColor DarkGray
    Write-Host ""
    
    $NpxCmd = Get-Command npx -ErrorAction SilentlyContinue
    if ($NpxCmd) {
        Write-Host "[*] Attempting localtunnel fallback via npx..." -ForegroundColor Cyan
        Start-Process -FilePath "npx" -ArgumentList "localtunnel --port $Port" -WindowStyle Minimized
        Write-Host "[OK] Launched localtunnel in background." -ForegroundColor Green
        Write-Host "    Check terminal window or run: npx localtunnel --port $Port" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------------
# 4. Display Results & Copy to Clipboard
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
if ($PublicUrl) {
    Write-Host " LIVE PUBLIC AI URL:" -ForegroundColor White
    Write-Host " $PublicUrl" -ForegroundColor Green -BackgroundColor Black
    Write-Host "===============================================================" -ForegroundColor Green
    
    try {
        Set-Clipboard -Value $PublicUrl
        Write-Host "[OK] Copied URL to clipboard!" -ForegroundColor Cyan
    } catch {}

    Write-Host ""
    Write-Host "-> Cloud Integration Instructions:" -ForegroundColor Yellow
    Write-Host "   1. Open Render Dashboard -> agrishield-backend -> Environment" -ForegroundColor White
    Write-Host "   2. Set AI_SERVICE_URL = $PublicUrl" -ForegroundColor Green
    Write-Host "   3. Set AI_MODE = live" -ForegroundColor Green
    Write-Host "   4. Trigger deploy or restart backend." -ForegroundColor DarkGray
} else {
    Write-Host " LOCAL AI STATUS: Running on http://127.0.0.1:$Port" -ForegroundColor Green
    Write-Host " To expose to cloud, start ngrok: ngrok http $Port" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Green
}

if (-not $NonInteractive) {
    Write-Host ""
    Write-Host "Press Enter to exit launcher (services continue running in background)..." -ForegroundColor Gray
    Read-Host
}
