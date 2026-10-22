"""
Core input validation utilities for AgriShield.
Provides authoritative, standardized validation for phone numbers, names,
emails, passwords, coordinates, and file uploads.
"""
import re
import unicodedata
from typing import Optional, Tuple

# SECTION: INDIAN MOBILE NUMBER VALIDATION
# Standard Indian mobile numbers: exactly 10 digits starting with 6, 7, 8, or 9
INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")

def validate_indian_phone(phone: Optional[str]) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates and normalizes an Indian mobile phone number.
    Supports numbers formatted as:
      - 10 digits: "9876543210"
      - With leading zero: "09876543210"
      - With +91: "+919876543210", "+91 98765 43210"
      - With 91: "919876543210"
    
    Returns:
      (is_valid: bool, normalized: Optional[str], error_message: Optional[str])
      On success, normalized is in standard format "+91XXXXXXXXXX".
    """
    if not phone or not phone.strip():
        return False, None, "Mobile phone number is required (मोबाइल नंबर अनिवार्य है)"
    
    raw = phone.strip()
    
    # Reject strings containing letters or disallowed symbols
    # Allowed symbols: +, -, spaces, parentheses, digits
    if re.search(r"[a-zA-Z]", raw):
        return False, None, "Mobile phone number must not contain letters (मोबाइल नंबर में अक्षर नहीं हो सकते)"
    
    if re.search(r"[^\d+\-\s()]", raw):
        return False, None, "Mobile phone number contains invalid characters (अमान्य वर्ण)"
    
    # Normalize by extracting digits only
    digits = re.sub(r"\D", "", raw)
    
    # Check for country code prefix handling
    if raw.startswith("+"):
        if digits.startswith("91") and len(digits) == 12:
            mobile_digits = digits[2:]
        else:
            return False, None, "Invalid international mobile number; must be 10-digit Indian number (+91)"
    elif digits.startswith("91") and len(digits) == 12:
        mobile_digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        mobile_digits = digits[1:]
    elif len(digits) == 10:
        mobile_digits = digits
    else:
        if len(digits) < 10:
            return False, None, f"Mobile phone number must be exactly 10 digits, got {len(digits)} (10-अंकों का नंबर दर्ज करें)"
        else:
            return False, None, f"Mobile phone number must be exactly 10 digits, got {len(digits)} (10-अंकों से अधिक नहीं हो सकता)"
    
    if not INDIAN_MOBILE_REGEX.match(mobile_digits):
        if not mobile_digits.startswith(("6", "7", "8", "9")):
            return False, None, "Valid Indian mobile numbers must start with 6, 7, 8, or 9 (नंबर 6, 7, 8 या 9 से शुरू होना चाहिए)"
        return False, None, "Invalid 10-digit Indian mobile number format"
    
    normalized = f"+91{mobile_digits}"
    return True, normalized, None


# SECTION: PERSON NAME VALIDATION
# Disallow pure numbers, control chars, HTML tags. Allow Unicode letters across Indian scripts.
HTML_TAG_REGEX = re.compile(r"<[^>]*>")

def validate_person_name(name: Optional[str], required: bool = True) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates a farmer or user's name.
    
    Rules:
      - Reject empty or whitespace-only values (if required).
      - Reject names consisting only of numeric digits (e.g. '1253').
      - Enforce minimum length (2 chars) and maximum length (70 chars).
      - Reject HTML tags and ASCII control characters.
      - Allow letters (ASCII & Unicode regional scripts: Hindi, Marathi, etc.),
        spaces, hyphens, dots, and apostrophes (e.g. "O'Neil", "डॉ. राम कुमार").
    
    Returns:
      (is_valid: bool, cleaned: Optional[str], error_message: Optional[str])
    """
    if name is None or not name.strip():
        if required:
            return False, None, "Name is required (नाम दर्ज करना अनिवार्य है)"
        return True, None, None
    
    cleaned = unicodedata.normalize("NFKC", name.strip())
    
    # Check length
    if len(cleaned) < 2:
        return False, None, "Name must be at least 2 characters long (नाम कम से कम 2 अक्षरों का होना चाहिए)"
    if len(cleaned) > 70:
        return False, None, "Name cannot exceed 70 characters (नाम 70 अक्षरों से अधिक नहीं हो सकता)"
    
    # Reject pure numbers / digits
    digits_only = re.sub(r"[\s\-_.'\"]", "", cleaned)
    if digits_only.isdigit():
        return False, None, "Name cannot consist solely of numbers (नाम में केवल संख्याएं नहीं हो सकतीं)"
    
    # Reject HTML tags
    if HTML_TAG_REGEX.search(cleaned):
        return False, None, "Name must not contain HTML or markup characters"
    
    # Reject control characters
    for ch in cleaned:
        category = unicodedata.category(ch)
        if category.startswith("C"):  # Control, format, surrogate, etc.
            return False, None, "Name contains invalid control characters"
    
    # Ensure there is at least one Unicode letter character
    has_letter = any(unicodedata.category(ch).startswith("L") for ch in cleaned)
    if not has_letter:
        return False, None, "Name must contain at least one valid letter (नाम में वैध अक्षर होना आवश्यक है)"
    
    return True, cleaned, None


# SECTION: EMAIL ADDRESS VALIDATION
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_address(email: Optional[str], required: bool = True) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates an email address.
    """
    if not email or not email.strip():
        if required:
            return False, None, "Email address is required (ईमेल अनिवार्य है)"
        return True, None, None
    
    clean = email.strip().lower()
    if len(clean) > 254:
        return False, None, "Email address is too long (maximum 254 characters)"
    
    if not EMAIL_REGEX.match(clean) or clean.endswith("."):
        return False, None, "Please provide a valid email address (उदा. officer@agrishield.com)"
    
    return True, clean, None


# SECTION: PASSWORD VALIDATION
def validate_password(password: Optional[str], min_length: int = 6) -> Tuple[bool, Optional[str]]:
    """
    Validates password length and basic safety constraints.
    Bcrypt has an input limit of 72 bytes.
    """
    if not password:
        return False, "Password is required (पासवर्ड अनिवार्य है)"
    
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters (कम से कम {min_length} अक्षर आवश्यक हैं)"
    
    # Bcrypt byte limit is 72 bytes
    if len(password.encode("utf-8")) > 72:
        return False, "Password cannot exceed 72 bytes"
    
    return True, None


# SECTION: GEOGRAPHIC COORDINATE VALIDATION
def validate_coordinates(lat: float, lon: float) -> Tuple[bool, Optional[str]]:
    """
    Validates WGS84 latitude (-90 to +90) and longitude (-180 to +180).
    """
    if not (-90.0 <= lat <= 90.0):
        return False, f"Latitude must be between -90 and 90 degrees, got {lat}"
    if not (-180.0 <= lon <= 180.0):
        return False, f"Longitude must be between -180 and 180 degrees, got {lon}"
    return True, None


# SECTION: FILE UPLOAD VALIDATION
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "application/pdf"
}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

def validate_uploaded_file(filename: str, content_type: Optional[str], file_size: int) -> Tuple[bool, Optional[str]]:
    """
    Validates uploaded file size and content type.
    """
    if file_size <= 0:
        return False, "Uploaded file cannot be empty (0 bytes)"
    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB"
    
    ct = (content_type or "").lower().split(";")[0].strip()
    if ct and ct not in ALLOWED_MIME_TYPES and ct != "application/octet-stream":
        return False, f"Unsupported file format '{ct}'. Allowed formats: JPG, PNG, WEBP, PDF."
    
    return True, None
