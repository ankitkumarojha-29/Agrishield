"""
SECTION: TEST SUITE - INPUT VALIDATION, REGRESSION AND SECURITY HARDENING
Purpose: Automated tests verifying Indian mobile validation, Unicode farmer names,
coordinate boundaries, file upload limits, and authentication security rules.
"""

import unittest
import sys
import os

# Add parent directory to sys.path to load backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.validators import (
    validate_indian_phone,
    validate_person_name,
    validate_email_address,
    validate_password,
    validate_coordinates,
    validate_uploaded_file,
)


class TestFarmerRegistrationValidation(unittest.TestCase):
    """
    SECTION: FARMER REGISTRATION VALIDATION TESTS
    Covers the required test cases defined in Phase 7 test matrix.
    """

    def test_name_valid_ankit_kumar(self):
        """Name: 'Ankit Kumar' -> Accept"""
        valid, cleaned, err = validate_person_name("Ankit Kumar")
        self.assertTrue(valid)
        self.assertEqual(cleaned, "Ankit Kumar")
        self.assertIsNone(err)

    def test_name_numeric_only_rejected(self):
        """Name: '1253' -> Reject (Fix for verified bug)"""
        valid, cleaned, err = validate_person_name("1253")
        self.assertFalse(valid)
        self.assertIsNone(cleaned)
        self.assertIn("number", err.lower())

    def test_name_empty_or_spaces_rejected(self):
        """Name: Empty or spaces only -> Reject if required"""
        valid, _, err = validate_person_name("")
        self.assertFalse(valid)
        self.assertIsNotNone(err)

        valid_spaces, _, err_spaces = validate_person_name("   ")
        self.assertFalse(valid_spaces)
        self.assertIsNotNone(err_spaces)

    def test_name_unicode_devanagari_accepted(self):
        """Name: 'राम कुमार' -> Accept under Unicode policy"""
        valid, cleaned, err = validate_person_name("राम कुमार")
        self.assertTrue(valid)
        self.assertEqual(cleaned, "राम कुमार")
        self.assertIsNone(err)

    def test_name_with_apostrophe_accepted(self):
        """Name: 'O\'Neil' -> Accept"""
        valid, cleaned, err = validate_person_name("O'Neil")
        self.assertTrue(valid)
        self.assertEqual(cleaned, "O'Neil")
        self.assertIsNone(err)

    def test_name_too_short_or_too_long(self):
        """Name: Boundary lengths (minimum 2, maximum 70)"""
        valid_short, _, err_short = validate_person_name("A")
        self.assertFalse(valid_short)
        self.assertIn("at least 2", err_short)

        long_name = "A" * 75
        valid_long, _, err_long = validate_person_name(long_name)
        self.assertFalse(valid_long)
        self.assertIn("cannot exceed 70", err_long)

    def test_name_html_injection_rejected(self):
        """Name: '<script>alert(1)</script>' -> Reject markup / control characters"""
        valid, _, err = validate_person_name("<script>alert(1)</script>")
        self.assertFalse(valid)
        self.assertIn("html", err.lower())

    def test_mobile_valid_10_digits(self):
        """Mobile: '9876543210' -> Accept format"""
        valid, norm, err = validate_indian_phone("9876543210")
        self.assertTrue(valid)
        self.assertEqual(norm, "+919876543210")
        self.assertIsNone(err)

    def test_mobile_too_short_9_digits(self):
        """Mobile: '987654321' -> Reject"""
        valid, norm, err = validate_indian_phone("987654321")
        self.assertFalse(valid)
        self.assertIn("10 digits", err)

    def test_mobile_too_long_11_digits(self):
        """Mobile: '98765432101' -> Reject"""
        valid, norm, err = validate_indian_phone("98765432101")
        self.assertFalse(valid)
        self.assertIn("10 digits", err)

    def test_mobile_alphabetic_rejected(self):
        """Mobile: 'abcdefghij' -> Reject"""
        valid, norm, err = validate_indian_phone("abcdefghij")
        self.assertFalse(valid)
        self.assertIn("letters", err.lower())

    def test_mobile_alphanumeric_mixed_rejected(self):
        """Mobile: '98765abc10' -> Reject"""
        valid, norm, err = validate_indian_phone("98765abc10")
        self.assertFalse(valid)
        self.assertIn("letters", err.lower())

    def test_mobile_empty_rejected_when_required(self):
        """Mobile: Empty -> Reject when required"""
        valid, norm, err = validate_indian_phone("")
        self.assertFalse(valid)
        self.assertIn("required", err.lower())

    def test_mobile_normalization_with_country_code(self):
        """Mobile: '+919876543210' -> Normalizes to '+919876543210'"""
        valid, norm, err = validate_indian_phone("+919876543210")
        self.assertTrue(valid)
        self.assertEqual(norm, "+919876543210")

    def test_mobile_normalization_with_leading_zero(self):
        """Mobile: '09876543210' -> Normalizes to '+919876543210'"""
        valid, norm, err = validate_indian_phone("09876543210")
        self.assertTrue(valid)
        self.assertEqual(norm, "+919876543210")

    def test_mobile_invalid_starting_digit(self):
        """Mobile: '2876543210' (starts with 2) -> Reject per TRAI plan (6,7,8,9 only)"""
        valid, norm, err = validate_indian_phone("2876543210")
        self.assertFalse(valid)
        self.assertIn("6, 7, 8, or 9", err)


class TestAccountSecurityValidation(unittest.TestCase):
    """
    SECTION: ADMIN & CREDENTIALS VALIDATION TESTS
    Covers email, password security, and credential bounds.
    """

    def test_email_valid(self):
        valid, clean, err = validate_email_address("officer.pmfby@gov.in")
        self.assertTrue(valid)
        self.assertEqual(clean, "officer.pmfby@gov.in")
        self.assertIsNone(err)

    def test_email_invalid_format(self):
        valid, clean, err = validate_email_address("not-an-email")
        self.assertFalse(valid)
        self.assertIn("valid email", err.lower())

    def test_password_valid(self):
        valid, err = validate_password("SecurePass#2026")
        self.assertTrue(valid)
        self.assertIsNone(err)

    def test_password_too_short(self):
        valid, err = validate_password("12345")
        self.assertFalse(valid)
        self.assertIn("at least 6", err)


class TestGeographicCoordinatesValidation(unittest.TestCase):
    """
    SECTION: COORDINATES AND GEOSPATIAL VALIDATION TESTS
    """

    def test_coordinates_valid_india(self):
        valid, err = validate_coordinates(28.6139, 77.2090)
        self.assertTrue(valid)
        self.assertIsNone(err)

    def test_coordinates_latitude_out_of_bounds(self):
        valid, err = validate_coordinates(95.0, 77.2090)
        self.assertFalse(valid)
        self.assertIn("between -90 and 90", err)

    def test_coordinates_longitude_out_of_bounds(self):
        valid, err = validate_coordinates(28.6139, 195.0)
        self.assertFalse(valid)
        self.assertIn("between -180 and 180", err)


class TestFileUploadSecurityValidation(unittest.TestCase):
    """
    SECTION: FILE UPLOAD SECURITY VALIDATION TESTS
    """

    def test_file_valid_size(self):
        valid, err = validate_uploaded_file("crop_leaf.jpg", "image/jpeg", 2 * 1024 * 1024)
        self.assertTrue(valid)
        self.assertIsNone(err)

    def test_file_excessive_size_rejected(self):
        valid, err = validate_uploaded_file("huge.png", "image/png", 16 * 1024 * 1024)
        self.assertFalse(valid)
        self.assertIn("exceeds maximum allowed limit", err)

    def test_file_disallowed_extension_rejected(self):
        valid, err = validate_uploaded_file("malicious.exe", "application/x-dosexec", 1024)
        self.assertFalse(valid)
from services.polygon_validator import validate_farm_boundary
from schemas.contract import GeoPolygon, PolygonValidationResultReason


class TestPolygonBoundaryValidation(unittest.TestCase):
    """
    SECTION: POLYGON BOUNDARY AND WGS84 COORDINATE VALIDATION TESTS
    """

    def test_polygon_valid(self):
        # Valid parcel in Madhya Pradesh (~1 hectare)
        coords = [
            [77.4120, 23.2590],
            [77.4130, 23.2590],
            [77.4130, 23.2600],
            [77.4120, 23.2600],
            [77.4120, 23.2590]
        ]
        poly = GeoPolygon(coordinates=[coords])
        res = validate_farm_boundary(poly)
        self.assertTrue(res.valid)
        self.assertGreater(res.area_m2, 100)

    def test_polygon_coordinates_latitude_out_of_bounds(self):
        # Latitude 95.0 is physically impossible on Earth
        coords = [
            [77.4120, 95.2590],
            [77.4130, 95.2590],
            [77.4130, 95.2600],
            [77.4120, 95.2600],
            [77.4120, 95.2590]
        ]
        poly = GeoPolygon(coordinates=[coords])
        res = validate_farm_boundary(poly)
        self.assertFalse(res.valid)
        self.assertEqual(res.reason, PolygonValidationResultReason.TOO_FEW_VERTICES)

    def test_polygon_coordinates_longitude_out_of_bounds(self):
        # Longitude 195.0 is physically impossible
        coords = [
            [195.4120, 23.2590],
            [195.4130, 23.2590],
            [195.4130, 23.2600],
            [195.4120, 23.2600],
            [195.4120, 23.2590]
        ]
        poly = GeoPolygon(coordinates=[coords])
        res = validate_farm_boundary(poly)
        self.assertFalse(res.valid)
        self.assertEqual(res.reason, PolygonValidationResultReason.TOO_FEW_VERTICES)


if __name__ == "__main__":
    unittest.main()
