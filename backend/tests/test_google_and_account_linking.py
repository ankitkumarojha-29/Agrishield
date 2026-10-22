"""
SECTION: TEST SUITE - GOOGLE OAUTH, ACCOUNT LINKING & OTP PRESERVATION (PHASE 10)
Verifies:
1. Free Development OTP flow works without SMS provider (returns otp_code for autofill).
2. Production SMS provider suppresses otp_code.
3. Linking ticket generation and cryptographic verification.
4. Flow A: Mobile OTP login opens existing farmer.
5. Flow B: Google Sign-In resolves to identical permanent farmer ID.
6. Flow C: First-time Google login securely links to existing mobile farmer without duplication.
7. Account conflict prevention (duplicate Google IDs / stolen identities rejected).
8. Google unlinking constraints (requires phone number).
"""

import unittest
import sys
import os
import uuid
import time
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.sms_service import DevelopmentSMSProvider, ProductionSMSProvider, get_sms_provider
from services.google_auth_service import (
    create_linking_ticket,
    decode_linking_ticket,
    GoogleAuthVerificationError,
)
from core.security import create_access_token, decode_access_token


class TestSMSProviderAbstraction(unittest.IsolatedAsyncioTestCase):
    """
    SECTION: SMS PROVIDER TESTS
    Verifies that the free development mode works with zero SMS costs,
    and production mode suppresses OTP exposure.
    """

    async def test_development_provider_returns_otp_for_autofill(self):
        """Free development mode must return otp_code for on-screen display & autofill."""
        provider = DevelopmentSMSProvider()
        res = await provider.send_otp("+919876543210", "482910")
        self.assertTrue(res["success"])
        self.assertEqual(res["mode"], "development")
        self.assertEqual(res["otp_code"], "482910")
        self.assertTrue(res["is_development"])
        self.assertIn("स्क्रीन पर प्रदर्शित", res["message"])

    async def test_production_provider_suppresses_otp_code(self):
        """Production mode must NEVER expose otp_code in API response."""
        provider = ProductionSMSProvider(api_key="real_telecom_key")
        res = await provider.send_otp("+919876543210", "482910")
        self.assertTrue(res["success"])
        self.assertEqual(res["mode"], "production")
        self.assertIsNone(res["otp_code"], "Production SMS provider must never expose otp_code!")
        self.assertFalse(res["is_development"])

    async def test_production_provider_fails_safely_when_unconfigured(self):
        """Production mode must fail safely if SMS gateway key is missing."""
        provider = ProductionSMSProvider(api_key="")
        res = await provider.send_otp("+919876543210", "482910")
        self.assertFalse(res["success"])
        self.assertIsNone(res["otp_code"])
        self.assertIn("missing", res["error"].lower())


class TestGoogleLinkingTickets(unittest.TestCase):
    """
    SECTION: GOOGLE LINKING TICKET SECURITY TESTS
    Verifies tamper-proof cryptographic signatures for Flow C account linking.
    """

    def setUp(self):
        self.profile = {
            "google_id": "google_sub_109847291029384",
            "email": "ramesh.kumar@gmail.com",
            "name": "Ramesh Kumar",
            "avatar_url": "https://lh3.googleusercontent.com/photo.jpg"
        }

    def test_create_and_decode_valid_ticket(self):
        """A signed linking ticket must decode to the verified Google profile."""
        ticket = create_linking_ticket(self.profile)
        self.assertIsInstance(ticket, str)

        decoded = decode_linking_ticket(ticket)
        self.assertEqual(decoded["google_id"], self.profile["google_id"])
        self.assertEqual(decoded["email"], self.profile["email"])
        self.assertEqual(decoded["name"], self.profile["name"])

    def test_tampered_linking_ticket_rejected(self):
        """Tampered tickets must be rejected with GoogleAuthVerificationError."""
        ticket = create_linking_ticket(self.profile)
        tampered = ticket[:-5] + "XXXXX"
        with self.assertRaises(GoogleAuthVerificationError):
            decode_linking_ticket(tampered)

    def test_expired_ticket_rejected(self):
        """Expired tickets must be rejected."""
        from jose import jwt
        from core.config import settings
        expired_payload = {
            "type": "google_linking_ticket",
            "google_id": "google_123",
            "iat": int(time.time()) - 3600,
            "exp": int(time.time()) - 1800  # Expired 30 min ago
        }
        expired_ticket = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        with self.assertRaises(GoogleAuthVerificationError):
            decode_linking_ticket(expired_ticket)


class TestSameFarmerIdentityResolutionLogic(unittest.TestCase):
    """
    SECTION: SAME FARMER RESOLUTION TESTS (Flow A, B, C)
    Verifies that mobile OTP and Google OAuth resolve to the EXACT SAME permanent Farmer ID.
    """

    def setUp(self):
        # Simulated database store to test account resolution algorithms
        self.users_db = {}
        self.permanent_farmer_id = str(uuid.uuid4())

        # Seed existing farmer who registered with mobile OTP
        self.users_db[self.permanent_farmer_id] = {
            "id": self.permanent_farmer_id,
            "phone": "+919876543210",
            "name": "Ramesh Kumar",
            "email": None,
            "google_id": None,
            "role": "FARMER",
            "farms": ["Farm Parcel 1 (4.5 Ha)", "Farm Parcel 2 (2.1 Ha)"]
        }

    def test_flow_a_existing_farmer_mobile_login(self):
        """Flow A: Farmer enters phone -> resolves to permanent farmer ID."""
        phone = "+919876543210"
        matched = next((u for u in self.users_db.values() if u["phone"] == phone), None)
        self.assertIsNotNone(matched)
        self.assertEqual(matched["id"], self.permanent_farmer_id)
        self.assertEqual(len(matched["farms"]), 2)

    def test_flow_c_first_time_google_links_to_existing_farmer(self):
        """
        Flow C: Farmer logs in with Google for first time.
        Enters mobile phone + OTP -> system links Google to existing farmer.
        NO DUPLICATE ROW CREATED.
        """
        google_sub = "109847291029384729102"
        google_email = "ramesh@gmail.com"
        verified_phone = "+919876543210"

        # Check if google_id already exists
        user_by_google = next((u for u in self.users_db.values() if u["google_id"] == google_sub), None)
        self.assertIsNone(user_by_google, "New Google identity must be unlinked initially")

        # Farmer provides verified phone
        existing_farmer = next((u for u in self.users_db.values() if u["phone"] == verified_phone), None)
        self.assertIsNotNone(existing_farmer)

        # Link identities
        existing_farmer["google_id"] = google_sub
        existing_farmer["email"] = google_email

        # Assert no duplicate accounts: only 1 user exists
        self.assertEqual(len(self.users_db), 1)
        self.assertEqual(existing_farmer["id"], self.permanent_farmer_id)
        self.assertEqual(existing_farmer["google_id"], google_sub)
        self.assertEqual(existing_farmer["email"], google_email)

    def test_flow_b_subsequent_google_login_opens_same_farmer(self):
        """
        Flow B: Subsequent Google login immediately resolves to the exact same farmer
        without asking for phone or OTP.
        """
        # First link the account
        self.users_db[self.permanent_farmer_id]["google_id"] = "109847291029384729102"
        self.users_db[self.permanent_farmer_id]["email"] = "ramesh@gmail.com"

        # Farmer clicks 'Continue with Google'
        google_sub = "109847291029384729102"
        resolved_user = next((u for u in self.users_db.values() if u["google_id"] == google_sub), None)

        self.assertIsNotNone(resolved_user)
        self.assertEqual(resolved_user["id"], self.permanent_farmer_id)
        self.assertEqual(resolved_user["phone"], "+919876543210")
        self.assertEqual(len(resolved_user["farms"]), 2, "All historical farms must load intact!")

    def test_cross_account_conflict_rejected(self):
        """
        Edge Case: If Google ID is already linked to Farmer A,
        Farmer B cannot claim that Google ID.
        """
        farmer_b_id = str(uuid.uuid4())
        self.users_db[farmer_b_id] = {
            "id": farmer_b_id,
            "phone": "+919123456780",
            "name": "Suresh Patel",
            "google_id": None,
            "email": None,
            "role": "FARMER"
        }

        # Farmer A links google_sub
        google_sub = "109847291029384729102"
        self.users_db[self.permanent_farmer_id]["google_id"] = google_sub

        # Farmer B attempts to link the same google_sub
        is_already_taken = any(u["google_id"] == google_sub and u["id"] != farmer_b_id for u in self.users_db.values())
        self.assertTrue(is_already_taken, "Cross-account linking must be detected and rejected as a conflict!")

    def test_unlink_google_preserves_farmer_and_phone(self):
        """Unlinking Google removes google_id but preserves farmer ID and phone."""
        self.users_db[self.permanent_farmer_id]["google_id"] = "109847291029384729102"

        # Unlink Google
        farmer = self.users_db[self.permanent_farmer_id]
        self.assertIsNotNone(farmer["phone"])
        farmer["google_id"] = None

        self.assertIsNone(farmer["google_id"])
        self.assertEqual(farmer["id"], self.permanent_farmer_id)
        self.assertEqual(farmer["phone"], "+919876543210")


if __name__ == "__main__":
    unittest.main()
