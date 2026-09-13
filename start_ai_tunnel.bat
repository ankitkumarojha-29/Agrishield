@echo off
title AgriShield AI & Cloud Tunnel Orchestrator
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_ai_tunnel.ps1" %*
