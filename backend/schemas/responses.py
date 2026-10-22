"""
SECTION: RESPONSE SCHEMAS
Purpose: Standard API response envelopes and error structures conforming to openapi.yaml.
Re-exports canonical Envelope models from contract.py for convenience and backward compatibility.
"""

from schemas.contract import Envelope, EnvelopeMeta, EnvelopeError, ErrorCode

__all__ = ["Envelope", "EnvelopeMeta", "EnvelopeError", "ErrorCode"]
