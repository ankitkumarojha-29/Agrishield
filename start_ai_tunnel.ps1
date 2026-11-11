param(
    [int]$Port = 8001,
    [ValidateSet("cloudflare", "ngrok", "localtunnel")]
    [string]$TunnelType = "cloudflare",
    [string]$BackendUrl = "https://agrishield-backend-8vzw.onrender.com",
    [switch]$NonInteractive,
    [switch]$AiOnly,
    [switch]$TunnelOnly
)

# =====================================================================
# AgriShield AI Inference Service & Public Cloud Tunnel Orchestrator
# Connects local PyTorch/YOLO compute to Cloud Backend (Render)
# Default engine: Cloudflare Quick Tunnels (UNLIMITED, NO SIGNUP NEEDED)
# Includes Auto-Sync: Automatically informs Render of new tunnel URL!
# =====================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "         AgriShield AI & Cloud Tunnel Orchestrator            " -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

$RootPath = $PSScriptRoot
$AiPath = Join-Path $RootPath "ai"

# Resolve Secret Key for Auto-Sync
$SecretKey = "agrishield-tunnel-auth-key-2026"
$backendEnv = Join-Path $RootPath "backend\.env"
if (Test-Path $backendEnv) {
    foreach ($line in (Get-Content $backendEnv)) {
        if ($line -match "^TUNNEL_SECRET_KEY=(.+)") {
            $SecretKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

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
# 2. Check / Start Local AI Service (Port $Port)
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
# 3. Tunneling Engine Execution
# ---------------------------------------------------------------------
$PublicUrl = $null

if ($TunnelType -eq "cloudflare") {
    Write-Host ""
    Write-Host "[*] Tunnel Engine: Cloudflare Quick Tunnel (Unlimited Data, 0 Signup)" -ForegroundColor Cyan

    $CloudflaredCandidates = @(
        (Join-Path $AiPath "cloudflared.exe"),
        (Join-Path $RootPath "ai\cloudflared.exe"),
        (Join-Path $RootPath "cloudflared.exe"),
        "cloudflared"
    )

    $CloudflaredCmd = $null
    foreach ($candidate in $CloudflaredCandidates) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            $CloudflaredCmd = $candidate
            break
        }
        if (Test-Path $candidate) {
            $CloudflaredCmd = $candidate
            break
        }
    }

    if (-not $CloudflaredCmd) {
        Write-Host "[*] cloudflared not found locally. Auto-downloading standalone binary..." -ForegroundColor Yellow
        $targetExe = Join-Path $AiPath "cloudflared.exe"
        $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
            Invoke-WebRequest -Uri $downloadUrl -OutFile $targetExe -UseBasicParsing
            $CloudflaredCmd = $targetExe
            Write-Host "[OK] cloudflared downloaded successfully to $targetExe" -ForegroundColor Green
        } catch {
            Write-Host "[!] Failed to auto-download cloudflared: $_" -ForegroundColor Red
        }
    }

    if ($CloudflaredCmd) {
        Write-Host "[OK] Located cloudflared engine: $CloudflaredCmd" -ForegroundColor Gray

        # Stop existing cloudflared tunnels to ensure clean start
        Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

        $tempLog = Join-Path ([System.IO.Path]::GetTempPath()) "agrishield_cf_$Port.log"
        if (Test-Path $tempLog) { Remove-Item $tempLog -Force -ErrorAction SilentlyContinue }

        Write-Host "[*] Launching Cloudflare Tunnel for http://127.0.0.1:$Port..." -ForegroundColor Yellow
        Start-Process -FilePath $CloudflaredCmd -ArgumentList "tunnel --url http://127.0.0.1:$Port" -RedirectStandardError $tempLog -WindowStyle Hidden

        # Extract trycloudflare.com URL from log
        $WaitCount = 0
        while ($WaitCount -lt 20 -and -not $PublicUrl) {
            Start-Sleep -Seconds 1
            $WaitCount++
            if (Test-Path $tempLog) {
                $logContent = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
                if ($logContent -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
                    $PublicUrl = $matches[0]
                }
            }
        }

        # Verify DNS / public health check
        if ($PublicUrl) {
            Write-Host "[*] Tunnel assigned: $PublicUrl" -ForegroundColor Cyan
            Write-Host "[*] Verifying DNS propagation and end-to-end connectivity..." -ForegroundColor Gray
            $DnsReady = $false
            for ($d = 0; $d -lt 15; $d++) {
                try {
                    $testResp = Invoke-RestMethod -Uri "$PublicUrl/health" -TimeoutSec 4 -ErrorAction Stop
                    if ($testResp.status -in @("healthy", "ok", "OK") -or $testResp) {
                        $DnsReady = $true
                        break
                    }
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
            if ($DnsReady) {
                Write-Host "[OK] Cloudflare tunnel verified active & responding!" -ForegroundColor Green
            } else {
                Write-Host "[!] Cloudflare DNS is still propagating (ready in ~5 seconds)." -ForegroundColor Yellow
            }
        } else {
            Write-Host "[!] Failed to extract public URL from cloudflared output. Check log: $tempLog" -ForegroundColor Red
        }
    }
} elseif ($TunnelType -eq "ngrok") {
    Write-Host ""
    Write-Host "[*] Tunnel Engine: ngrok" -ForegroundColor Cyan

    $NgrokCandidates = @(
        (Join-Path $AiPath "ngrok.exe"),
        (Join-Path $RootPath "ai\ngrok.exe"),
        "ngrok",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe",
        "$env:LOCALAPPDATA\Programs\ngrok\ngrok.exe",
        "$env:ProgramFiles\ngrok\ngrok.exe",
        "$env:USERPROFILE\bin\ngrok.exe"
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

    if ($NgrokCommand) {
        Write-Host "[OK] Located ngrok engine: $NgrokCommand" -ForegroundColor Gray

        $NgrokProc = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
        if (-not $NgrokProc) {
            Write-Host "[*] Launching ngrok tunnel forwarding to port $Port..." -ForegroundColor Yellow
            Start-Process -FilePath $NgrokCommand -ArgumentList "http $Port --log=stdout" -WindowStyle Minimized
            Start-Sleep -Seconds 3
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
    }
} elseif ($TunnelType -eq "localtunnel") {
    Write-Host ""
    Write-Host "[*] Tunnel Engine: localtunnel (via npx)" -ForegroundColor Cyan
    $NpxCmd = Get-Command npx -ErrorAction SilentlyContinue
    if ($NpxCmd) {
        Start-Process -FilePath "npx" -ArgumentList "localtunnel --port $Port" -WindowStyle Normal
        Write-Host "[OK] Launched localtunnel in a separate window." -ForegroundColor Green
    } else {
        Write-Host "[!] npx (Node.js) is not installed." -ForegroundColor Red
    }
}

# ---------------------------------------------------------------------
# 4. Auto-Sync with Render Cloud Backend
# ---------------------------------------------------------------------
$AutoSynced = $false
if ($PublicUrl) {
    try {
        Set-Clipboard -Value $PublicUrl
    } catch {}

    Write-Host ""
    Write-Host "[*] Auto-syncing live tunnel with Render Cloud Backend..." -ForegroundColor Cyan
    try {
        $syncBody = @{
            tunnel_url = $PublicUrl
            secret_key = $SecretKey
        } | ConvertTo-Json
        $syncResp = Invoke-RestMethod -Uri "$BackendUrl/api/v1/admin/register-tunnel" -Method Post -Body $syncBody -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
        if ($syncResp.success) {
            $AutoSynced = $true
            Write-Host "[OK] AUTOMATICALLY SYNCED WITH RENDER!" -ForegroundColor Green
            Write-Host "     Render Backend is now directing inference to this live tunnel!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[!] Auto-sync pending: Backend at $BackendUrl is waking up or compiling." -ForegroundColor Yellow
        Write-Host "    (The heartbeat loop will automatically connect as soon as backend responds)" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------------
# 5. Display Status & Interactive Heartbeat Loop
# ---------------------------------------------------------------------
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
if ($PublicUrl) {
    Write-Host " LIVE PUBLIC AI URL (UNLIMITED & ACTIVE):" -ForegroundColor White
    Write-Host " $PublicUrl" -ForegroundColor Green -BackgroundColor Black
    Write-Host "===============================================================" -ForegroundColor Green
    
    if ($AutoSynced) {
        Write-Host ""
        Write-Host ">>> ZERO-TOUCH ACTIVE: NO NEED TO UPDATE RENDER MANUALLY! <<<" -ForegroundColor Green
        Write-Host "    Your hosted website will now run all AI models through your laptop." -ForegroundColor White
        Write-Host "    Keep this terminal window OPEN while your AI models are in use." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "-> One-Time Render Setup (if auto-sync is not yet deployed to cloud):" -ForegroundColor Yellow
        Write-Host "   Set AI_SERVICE_URL = $PublicUrl in Render Dashboard -> Environment" -ForegroundColor White
    }
} else {
    Write-Host " LOCAL AI STATUS: Running on http://127.0.0.1:$Port" -ForegroundColor Green
    Write-Host " To expose with Cloudflare: .\start_ai_tunnel.ps1 -TunnelType cloudflare" -ForegroundColor Yellow
    Write-Host "===============================================================" -ForegroundColor Green
}

if (-not $NonInteractive -and $PublicUrl) {
    Write-Host ""
    Write-Host ">>> Tunnel is ACTIVE! Running background heartbeat every 30s..." -ForegroundColor Cyan
    Write-Host "    (Press any key or Enter to stop the tunnel and exit)" -ForegroundColor DarkGray
    Write-Host ""

    $RunHeartbeat = $true
    while ($RunHeartbeat) {
        # Sleep in 1-second ticks so key presses exit immediately
        for ($s = 0; $s -lt 30; $s++) {
            Start-Sleep -Seconds 1
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                $RunHeartbeat = $false
                break
            }
        }

        if (-not $RunHeartbeat) { break }

        # Heartbeat ping to keep Render actively pointed to our live tunnel
        try {
            $hbBody = @{
                tunnel_url = $PublicUrl
                secret_key = $SecretKey
            } | ConvertTo-Json
            $hbResp = Invoke-RestMethod -Uri "$BackendUrl/api/v1/admin/register-tunnel" -Method Post -Body $hbBody -ContentType "application/json" -TimeoutSec 6 -ErrorAction Stop
            $timeStr = (Get-Date).ToString("HH:mm:ss")
            Write-Host "[$timeStr] Heartbeat Active - Cloud backend linked to your live AI models." -ForegroundColor DarkCyan
        } catch {
            $timeStr = (Get-Date).ToString("HH:mm:ss")
            Write-Host "[$timeStr] Heartbeat retry: ($($_.Exception.Message))" -ForegroundColor DarkGray
        }
    }

    Write-Host ""
    Write-Host "[*] Stopping Cloudflare tunnel..." -ForegroundColor Yellow
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Tunnel closed cleanly. Cloud backend will automatically resume offline fallback." -ForegroundColor Green
}
