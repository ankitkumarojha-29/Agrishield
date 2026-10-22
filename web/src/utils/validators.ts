/**
 * Authoritative input validation utilities for AgriShield Web Client.
 * Matches backend validation rules strictly.
 */

// SECTION: INDIAN MOBILE NUMBER VALIDATION
export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

export function validateIndianMobile(phone: string): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: 'कृपया मोबाइल नंबर दर्ज करें (Mobile phone number is required).'
    };
  }

  const raw = phone.trim();

  // Check for letters
  if (/[a-zA-Z]/.test(raw)) {
    return {
      isValid: false,
      error: 'मोबाइल नंबर में अक्षर नहीं हो सकते (Phone number cannot contain letters).'
    };
  }

  // Check for invalid characters
  if (/[^\d+\-\s()]/.test(raw)) {
    return {
      isValid: false,
      error: 'मोबाइल नंबर में केवल अंक व +91 कोड हो सकते हैं (Invalid characters in phone number).'
    };
  }

  const digits = raw.replace(/\D/g, '');

  let mobileDigits = '';
  if (raw.startsWith('+')) {
    if (digits.startsWith('91') && digits.length === 12) {
      mobileDigits = digits.slice(2);
    } else {
      return {
        isValid: false,
        error: 'कृपया सही 10-अंकों का भारतीय मोबाइल नंबर (+91) दर्ज करें (Must be 10-digit Indian number).'
      };
    }
  } else if (digits.startsWith('91') && digits.length === 12) {
    mobileDigits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    mobileDigits = digits.slice(1);
  } else if (digits.length === 10) {
    mobileDigits = digits;
  } else {
    if (digits.length < 10) {
      return {
        isValid: false,
        error: `मोबाइल नंबर में ठीक 10 अंक होने चाहिए, अभी ${digits.length} हैं (Must be exactly 10 digits).`
      };
    } else {
      return {
        isValid: false,
        error: `मोबाइल नंबर 10 अंकों से अधिक नहीं हो सकता (Cannot exceed 10 digits).`
      };
    }
  }

  if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
    return {
      isValid: false,
      error: 'भारतीय मोबाइल नंबर 6, 7, 8 या 9 से शुरू होना चाहिए (Number must start with 6, 7, 8, or 9).'
    };
  }

  return {
    isValid: true,
    normalized: `+91${mobileDigits}`
  };
}

// SECTION: PERSON NAME VALIDATION
export interface NameValidationResult {
  isValid: boolean;
  cleaned?: string;
  error?: string;
}

export function validatePersonName(name: string, required: boolean = true): NameValidationResult {
  if (!name || !name.trim()) {
    if (required) {
      return {
        isValid: false,
        error: 'कृपया किसान/उपयोगकर्ता का नाम दर्ज करें (Name is required).'
      };
    }
    return { isValid: true, cleaned: '' };
  }

  const cleaned = name.trim();

  if (cleaned.length < 2) {
    return {
      isValid: false,
      error: 'नाम कम से कम 2 अक्षरों का होना चाहिए (Name must be at least 2 characters).'
    };
  }

  if (cleaned.length > 70) {
    return {
      isValid: false,
      error: 'नाम 70 अक्षरों से अधिक नहीं हो सकता (Name cannot exceed 70 characters).'
    };
  }

  // Reject purely numeric names (such as "1253")
  const strippedNonLetters = cleaned.replace(/[\s\-_.'"]/g, '');
  if (/^\d+$/.test(strippedNonLetters)) {
    return {
      isValid: false,
      error: 'नाम में केवल संख्याएं नहीं हो सकतीं (Name cannot consist solely of numbers).'
    };
  }

  // Reject HTML tags
  if (/<[^>]*>/.test(cleaned)) {
    return {
      isValid: false,
      error: 'नाम में अमान्य वर्ण या HTML टैग नहीं हो सकते (Invalid markup in name).'
    };
  }

  // Check that there is at least one Unicode letter (supports English and Indian regional scripts)
  // Unicode \p{L} matches any letter in any language
  try {
    if (!/\p{L}/u.test(cleaned)) {
      return {
        isValid: false,
        error: 'नाम में कम से कम एक वैध अक्षर होना आवश्यक है (Name must contain letters).'
      };
    }
  } catch {
    // Fallback for environments where Unicode property escapes are not enabled
    if (!/[a-zA-Z\u0900-\u097F]/.test(cleaned)) {
      return {
        isValid: false,
        error: 'नाम में कम से कम एक वैध अक्षर होना आवश्यक है (Name must contain letters).'
      };
    }
  }

  return {
    isValid: true,
    cleaned
  };
}

// SECTION: EMAIL VALIDATION
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'कृपया ईमेल पता दर्ज करें (Email is required).' };
  }
  const clean = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (!emailRegex.test(clean) || clean.endsWith('.')) {
    return { isValid: false, error: 'कृपया सही ईमेल पता दर्ज करें (उदा. officer@agrishield.com).' };
  }
  return { isValid: true };
}

// SECTION: PASSWORD VALIDATION
export function validatePassword(password: string, minLength: number = 6): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'पासवर्ड दर्ज करना आवश्यक है (Password is required).' };
  }
  if (password.length < minLength) {
    return { isValid: false, error: `पासवर्ड कम से कम ${minLength} अक्षरों का होना चाहिए (At least ${minLength} characters).` };
  }
  return { isValid: true };
}
