@echo off
title AgriShield AI Microservice ^& Cloud Tunnel
cd /d "%~dp0"
echo ===============================================================
echo          AgriShield AI Service ^& Cloud Tunnel Launcher
echo ===============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_ai_tunnel.ps1"
pause
