param(
    [switch]$NonInteractive
)

# AgriShield AI & Ngrok Tunnel Launcher
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "        AgriShield AI & Tunnel Launcher           " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

$RootPath = $PSScriptRoot
$AiPath = Join-Path $RootPath "ai"
$VenvPython = Join-Path $AiPath ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Could not find Python virtual environment at: $VenvPython" -ForegroundColor Red
    exit 1
}

# 1. Check if AI service is already running on port 8001
$PortInUse = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }

if ($PortInUse) {
    Write-Host "[✓] AI Service is already running on port 8001 (PID: $($PortInUse.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "[*] Starting AgriShield AI Service on port 8001..." -ForegroundColor Yellow
    Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8001" -WorkingDirectory $AiPath -WindowStyle Minimized
    
    # Wait for server to become healthy
    $Retries = 0
    $Healthy = $false
    while ($Retries -lt 30) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/health/" -TimeoutSec 2 -ErrorAction Stop
            if ($resp.status -eq "healthy") {
                $Healthy = $true
                break
            }
        } catch {
            $Retries++
        }
    }
    if ($Healthy) {
        Write-Host "[✓] AI Service is healthy and ready!" -ForegroundColor Green
    } else {
        Write-Host "[!] AI Service took too long to start. Continuing to tunnel..." -ForegroundColor Yellow
    }
}

# 2. Check if ngrok is already running
$NgrokProc = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue

if (-not $NgrokProc) {
    Write-Host "[*] Starting ngrok tunnel on port 8001..." -ForegroundColor Yellow
    Start-Process -FilePath "ngrok" -ArgumentList "http 8001 --log=stdout" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[✓] ngrok is already running (PID: $($NgrokProc.Id))" -ForegroundColor Green
}

# 3. Retrieve Public HTTPS URL from ngrok API
$PublicUrl = $null
$Retries = 0
while ($Retries -lt 15 -and -not $PublicUrl) {
    try {
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
        if ($tunnels.tunnels.Count -gt 0) {
            $PublicUrl = $tunnels.tunnels[0].public_url
        }
    } catch {
        Start-Sleep -Seconds 1
        $Retries++
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
if ($PublicUrl) {
    Write-Host " LIVE PUBLIC AI URL:" -ForegroundColor White
    Write-Host " $PublicUrl" -ForegroundColor Green -BackgroundColor Black
    Write-Host "==================================================" -ForegroundColor Green
    
    try {
        Set-Clipboard -Value $PublicUrl
        Write-Host "[✓] Copied URL to clipboard!" -ForegroundColor Cyan
    } catch {}

    Write-Host ""
    Write-Host "-> Paste this URL into Render:" -ForegroundColor Yellow
    Write-Host "   Render Dashboard -> agrishield-backend -> Environment Variables" -ForegroundColor DarkGray
    Write-Host "   AI_SERVICE_URL = $PublicUrl" -ForegroundColor White
} else {
    Write-Host "[!] Could not fetch ngrok URL automatically." -ForegroundColor Red
    Write-Host "    Check http://127.0.0.1:4040 in your browser." -ForegroundColor Yellow
}
Write-Host "==================================================" -ForegroundColor Green
if (-not $NonInteractive) {
    Write-Host ""
    Write-Host "Press Enter to exit this launcher (services stay running in background)..."
    Read-Host
}
