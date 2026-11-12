"""
Network and Client Telemetry Utilities for AgriShield.
Compliant with Indian CERT-In Directions and IT Rules 2021.
Extracts true client IP address through reverse proxies (Cloudflare, Render, cellular gateways).
"""
from fastapi import Request
from typing import Optional


def get_client_ip(request: Request) -> str:
    """
    Extracts the authoritative client IP address.
    Checks Cloudflare CF-Connecting-IP first, then standard X-Forwarded-For,
    and finally falls back to direct client socket host.
    """
    if not request:
        return "0.0.0.0"

    # 1. Cloudflare edge proxy header (highest fidelity for mobile/web clients)
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 2. Standard X-Forwarded-For header (Render / Nginx reverse proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and forwarded.strip():
        # First IP in comma-separated chain is the originating client IP
        return forwarded.split(",")[0].strip()

    # 3. Direct socket connection fallback
    if request.client and request.client.host:
        return request.client.host.strip()

    return "127.0.0.1"


def get_user_agent(request: Request) -> str:
    """Extracts client User-Agent string for device and audit logs."""
    if not request:
        return "Unknown Client"
    ua = request.headers.get("user-agent") or ""
    return ua.strip()[:255] if ua else "Unknown Device"

