"""
Google OAuth 2.0 Token Verification & Linking Service for AgriShield.
Verifies real Google ID tokens via google-auth and Google's official public key certificates.
Provides secure, tamper-proof signed linking tickets for first-time farmer account linking.
"""

import time
import logging
from typing import Dict, Any, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt, JWTError

from core.config import settings

logger = logging.getLogger(__name__)

# Allowed Google ID token issuers
GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]


class GoogleAuthVerificationError(Exception):
    """Raised when Google ID token fails cryptographic verification."""
    pass


def verify_google_id_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verifies Google ID Token returned by Google Identity Services SDK.
    Validates signature, expiration, issuer, and audience (if configured).

    Returns:
        dict: {
            "google_id": str (Google sub claim),
            "email": str,
            "email_verified": bool,
            "name": str,
            "avatar_url": Optional[str]
        }
    """
    if not token or not token.strip():
        raise GoogleAuthVerificationError("Google ID token is required.")

    clean_token = token.strip()
    audience = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None

    try:
        req = google_requests.Request()
        # verify_oauth2_token verifies signature with Google's live certs and checks expiry
        id_info = id_token.verify_oauth2_token(clean_token, req, audience=audience)

        # Verify issuer
        issuer = id_info.get("iss")
        if issuer not in GOOGLE_ISSUERS:
            raise GoogleAuthVerificationError(f"Invalid Google ID token issuer: {issuer}")

        google_sub = id_info.get("sub")
        if not google_sub:
            raise GoogleAuthVerificationError("Missing Google subject identifier ('sub') in token.")

        email = id_info.get("email")
        email_verified = bool(id_info.get("email_verified", False))

        return {
            "google_id": str(google_sub),
            "email": email.lower() if email else None,
            "email_verified": email_verified,
            "name": id_info.get("name"),
            "avatar_url": id_info.get("picture"),
        }

    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise GoogleAuthVerificationError(f"Google authentication failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error validating Google ID token: {e}")
        raise GoogleAuthVerificationError(f"Google authentication service error: {str(e)}")


def create_linking_ticket(google_profile: Dict[str, Any]) -> str:
    """
    Creates a cryptographically signed, short-lived (15 min) linking ticket.
    Used during Flow C when a new Google user needs to provide their phone number and verify OTP.
    Prevents token forgery or replay attacks.
    """
    now = int(time.time())
    payload = {
        "type": "google_linking_ticket",
        "google_id": google_profile["google_id"],
        "email": google_profile.get("email"),
        "name": google_profile.get("name"),
        "avatar_url": google_profile.get("avatar_url"),
        "iat": now,
        "exp": now + 900  # 15 minutes TTL
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_linking_ticket(ticket: str) -> Dict[str, Any]:
    """
    Decodes and verifies a signed linking ticket.
    Raises GoogleAuthVerificationError if invalid or expired.
    """
    try:
        payload = jwt.decode(ticket, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "google_linking_ticket":
            raise GoogleAuthVerificationError("Invalid ticket type")
        return payload
    except JWTError as e:
        logger.warning(f"Invalid or expired linking ticket: {e}")
        raise GoogleAuthVerificationError("Account linking session has expired. Please sign in with Google again.")
