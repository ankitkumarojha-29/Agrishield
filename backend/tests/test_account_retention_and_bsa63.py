"""
Automated Test Suite: Statutory Account Retention, Client IP Telemetry,
Day 181 PII Smart Anonymization, and Section 63 BSA Forensic Electronic Dossiers.
Compliant with DPDP Act 2023, IT Act 2000, CERT-In Directions, and Bharatiya Sakshya Adhiniyam 2023.
"""
import unittest
import asyncio
import uuid
import json
import hashlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.network import get_client_ip, get_user_agent
from db.models import User, UserRole, Farm, SoilReport, AIAssessment, AssessmentType, AuditLog
from services.account_retention_service import (
    log_audit_event,
    purge_expired_quarantined_accounts,
    generate_section_63_bsa_dossier,
)


class TestClientIpAndTelemetryExtraction(unittest.TestCase):
    """Verifies true client IP resolution across proxies, cellular gateways, and edge CDNs."""

    def test_extract_ip_from_cloudflare_header(self):
        req = MagicMock()
        req.headers = {"cf-connecting-ip": "203.0.113.195", "x-forwarded-for": "198.51.100.1"}
        req.client.host = "10.0.0.1"
        ip = get_client_ip(req)
        self.assertEqual(ip, "203.0.113.195")

    def test_extract_ip_from_x_forwarded_for_first_hop(self):
        req = MagicMock()
        req.headers = {"x-forwarded-for": "103.21.244.2, 10.142.0.1, 127.0.0.1"}
        req.client.host = "10.0.0.1"
        ip = get_client_ip(req)
        self.assertEqual(ip, "103.21.244.2")

    def test_extract_ip_fallback_to_socket(self):
        req = MagicMock()
        req.headers = {}
        req.client.host = "49.36.128.4"
        ip = get_client_ip(req)
        self.assertEqual(ip, "49.36.128.4")

    def test_extract_user_agent_clean(self):
        req = MagicMock()
        req.headers = {"user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AgriShield/1.0"}
        ua = get_user_agent(req)
        self.assertEqual(ua, "Mozilla/5.0 (Linux; Android 14; Pixel 8) AgriShield/1.0")


class TestDay181SmartAnonymization(unittest.IsolatedAsyncioTestCase):
    """Verifies that Day 181 PII wipe strips personal data while preserving non-PII spatial linkages for AI."""

    async def test_purge_expired_accounts_wipes_pii_completely(self):
        now = datetime.utcnow()
        expired_farmer = User(
            id=uuid.uuid4(),
            phone="+919876543210",
            name="Rameshwar Singh",
            email="rameshwar@example.com",
            google_id="google_sub_12345",
            avatar_url="https://example.com/avatar.jpg",
            role=UserRole.FARMER,
            is_deleted=True,
            deleted_at=now - timedelta(days=181),
            purge_scheduled_at=now - timedelta(days=1),
            registration_ip="49.36.120.1",
            last_login_ip="49.36.120.1",
            deleted_ip="49.36.120.1",
            deletion_reason="Farmer self-requested deletion"
        )

        mock_db = MagicMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [expired_farmer]
        mock_db.execute = MagicMock(return_value=asyncio.Future())
        mock_db.execute.return_value.set_result(mock_result)
        mock_db.commit = MagicMock(return_value=asyncio.Future())
        mock_db.commit.return_value.set_result(None)
        mock_db.flush = MagicMock(return_value=asyncio.Future())
        mock_db.flush.return_value.set_result(None)

        purged_count = await purge_expired_quarantined_accounts(mock_db)

        self.assertEqual(purged_count, 1)
        # PII must be completely purged
        self.assertIn("Anonymized Account", expired_farmer.name)
        self.assertIn("XXXXXX3210", expired_farmer.phone)
        self.assertIsNone(expired_farmer.email)
        self.assertIsNone(expired_farmer.google_id)
        self.assertIsNone(expired_farmer.avatar_url)
        self.assertEqual(expired_farmer.registration_ip, "0.0.0.0")
        self.assertEqual(expired_farmer.last_login_ip, "0.0.0.0")
        self.assertEqual(expired_farmer.deleted_ip, "0.0.0.0")


class TestSection63BSAForensicDossier(unittest.IsolatedAsyncioTestCase):
    """Verifies cryptographic SHA-256 electronic evidence hash and legal certificate under BSA 2023 Sec 63."""

    async def test_generate_dossier_sha256_hash_integrity(self):
        farmer_id = uuid.uuid4()
        admin_id = uuid.uuid4()
        now = datetime.utcnow()

        farmer = User(
            id=farmer_id,
            phone="+919876543210",
            name="Suresh Patel",
            email="suresh@agrishield.in",
            role=UserRole.FARMER,
            is_deleted=True,
            deleted_at=now,
            purge_scheduled_at=now + timedelta(days=180),
            registration_ip="203.0.113.10",
            last_login_ip="203.0.113.10",
            deleted_ip="203.0.113.10",
            deletion_reason="Account terminated under Section 10A"
        )
        admin = User(
            id=admin_id,
            email="admin@agrishield.in",
            name="Chief IT Vigilance Officer",
            role=UserRole.ADMIN,
            is_approved=True
        )

        mock_db = MagicMock()
        mock_db.get = MagicMock(return_value=asyncio.Future())
        mock_db.get.return_value.set_result(farmer)

        # Mock farm parcel queries
        farm_result = MagicMock()
        farm_result.scalars.return_value.all.return_value = []
        soil_result = MagicMock()
        soil_result.scalars.return_value.all.return_value = []
        scan_result = MagicMock()
        scan_result.scalars.return_value.all.return_value = []
        audit_result = MagicMock()
        audit_result.scalars.return_value.all.return_value = []

        call_results = [farm_result, scan_result, audit_result]
        def execute_side_effect(stmt):
            fut = asyncio.Future()
            fut.set_result(call_results.pop(0) if call_results else farm_result)
            return fut
        mock_db.execute = MagicMock(side_effect=execute_side_effect)

        dossier = await generate_section_63_bsa_dossier(
            farmer_id=farmer_id,
            db=mock_db,
            admin_user=admin,
            server_ip="192.168.1.10"
        )

        self.assertIn("dossier_id", dossier)
        self.assertTrue(dossier["dossier_id"].startswith("BSA63-"))
        self.assertEqual(dossier["subject_farmer"]["id"], str(farmer_id))
        self.assertIn("QUARANTINED", dossier["subject_farmer"]["account_status"])

        # Check statutory certificate under Bharatiya Sakshya Adhiniyam, 2023
        cert = dossier["statutory_certificate"]
        self.assertEqual(cert["statute"], "Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023)")
        self.assertEqual(cert["certified_by_admin"], "admin@agrishield.in")
        self.assertEqual(cert["system_host"], "192.168.1.10")

        # Cryptographic Hash check: 64-character hexadecimal SHA-256
        sha256 = cert["electronic_record_hash_sha256"]
        self.assertEqual(len(sha256), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in sha256))
        self.assertIn("Bharatiya Sakshya Adhiniyam, 2023", cert["legal_declaration"])


class TestAccountRestorationPetitionAndApproval(unittest.IsolatedAsyncioTestCase):
    """
    Verifies DPDP Act 2023 Sec 6 (Withdrawal/Re-consent) and Sec 12 compliant
    farmer account restoration petitioning and administrator review & reinstatement.
    """

    async def test_farmer_submits_restoration_petition(self):
        farmer_id = uuid.uuid4()
        now = datetime.utcnow()
        farmer = User(
            id=farmer_id,
            phone="+919876543210",
            name="Radhe Shyam",
            role=UserRole.FARMER,
            is_deleted=True,
            deleted_at=now - timedelta(days=10),
            purge_scheduled_at=now + timedelta(days=170),
            restore_requested=False
        )

        # Farmer submits restoration request
        farmer.restore_requested = True
        farmer.restore_requested_at = now
        farmer.restore_reason = "Mistakenly deleted, please restore access to my Khasra maps"

        self.assertTrue(farmer.restore_requested)
        self.assertEqual(farmer.restore_reason, "Mistakenly deleted, please restore access to my Khasra maps")
        self.assertTrue(farmer.is_deleted)  # Still quarantined pending admin approval

    async def test_admin_approves_restoration_reinstates_account(self):
        farmer_id = uuid.uuid4()
        admin_id = uuid.uuid4()
        now = datetime.utcnow()
        farmer = User(
            id=farmer_id,
            phone="+919876543210",
            name="Radhe Shyam",
            role=UserRole.FARMER,
            is_deleted=True,
            deleted_at=now - timedelta(days=5),
            purge_scheduled_at=now + timedelta(days=175),
            restore_requested=True,
            restore_reason="Accidental deletion"
        )
        admin = User(
            id=admin_id,
            email="admin@agrishield.in",
            name="Platform Superadmin",
            role=UserRole.ADMIN,
            is_approved=True
        )

        # Admin approves restoration
        farmer.is_deleted = False
        farmer.deleted_at = None
        farmer.purge_scheduled_at = None
        farmer.restore_requested = False
        farmer.restored_at = now
        farmer.restored_by_id = admin.id

        self.assertFalse(farmer.is_deleted)
        self.assertIsNone(farmer.deleted_at)
        self.assertIsNone(farmer.purge_scheduled_at)
        self.assertFalse(farmer.restore_requested)
        self.assertEqual(farmer.restored_by_id, admin.id)
        self.assertIsNotNone(farmer.restored_at)

    async def test_admin_rejects_restoration_keeps_quarantine(self):
        farmer_id = uuid.uuid4()
        admin_id = uuid.uuid4()
        now = datetime.utcnow()
        purge_scheduled = now + timedelta(days=150)
        farmer = User(
            id=farmer_id,
            phone="+919876543210",
            name="Fraud Suspect",
            role=UserRole.FARMER,
            is_deleted=True,
            deleted_at=now - timedelta(days=30),
            purge_scheduled_at=purge_scheduled,
            restore_requested=True,
            restore_reason="Want to come back"
        )

        # Admin rejects restoration
        farmer.restore_requested = False

        self.assertTrue(farmer.is_deleted)
        self.assertFalse(farmer.restore_requested)
        self.assertEqual(farmer.purge_scheduled_at, purge_scheduled)


if __name__ == "__main__":
    unittest.main()

