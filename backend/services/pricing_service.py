def calculate_premium(area_m2: float, crop: str) -> dict:
    """
    PMFBY (Pradhan Mantri Fasal Bima Yojana) Actuarial Pricing Engine.
    
    Statutory guidelines:
    - Rabi crops (Wheat, Gram, Mustard, Barley): Farmer pays max 1.5% of Sum Insured.
    - Kharif crops (Paddy, Soybean, Maize, Cotton): Farmer pays max 2.0% of Sum Insured (5% commercial).
    - Commercial/Horticultural (Sugarcane, Cotton): Farmer pays max 5.0% of Sum Insured.
    - Balance (Actuarial Gross Premium - Farmer Share) is 100% subsidized by Central & State Govt (50:50).
    """
    area_ha = max(area_m2 / 10000.0, 0.01)
    crop_clean = (crop or "").strip().lower()
    
    # Scales of finance per hectare (in INR) based on MP Agriculture Department
    scales_of_finance = {
        "wheat": 60000.0,
        "gehun": 60000.0,
        "गेहूं": 60000.0,
        "rice": 68000.0,
        "paddy": 68000.0,
        "dhan": 68000.0,
        "धान": 68000.0,
        "soybean": 50000.0,
        "सोयाबीन": 50000.0,
        "gram": 42000.0,
        "chana": 42000.0,
        "चना": 42000.0,
        "mustard": 44000.0,
        "sarson": 44000.0,
        "सरसों": 44000.0,
        "barley": 38000.0,
        "jau": 38000.0,
        "maize": 45000.0,
        "makka": 45000.0,
        "cotton": 85000.0,
        "kapas": 85000.0,
        "कपास": 85000.0,
        "sugarcane": 120000.0,
        "ganna": 120000.0,
        "गन्ना": 120000.0,
    }
    
    # Determine scale of finance
    scale_of_finance = 55000.0
    for key, val in scales_of_finance.items():
        if key in crop_clean:
            scale_of_finance = val
            break
            
    # Determine Season & Statutory Farmer Share %
    rabi_crops = ["wheat", "gehun", "गेहूं", "gram", "chana", "चना", "mustard", "sarson", "सरसों", "barley", "jau"]
    commercial_crops = ["cotton", "kapas", "कपास", "sugarcane", "ganna", "गन्ना"]
    
    is_rabi = any(r in crop_clean for r in rabi_crops)
    is_comm = any(c in crop_clean for c in commercial_crops)
    
    if is_comm:
        farmer_share_pct = 5.0
        season = "Annual / Kharif 2025-26"
        coverage_period = "Nov '25 - Oct '26"
        actuarial_rate_pct = 10.5
    elif is_rabi:
        farmer_share_pct = 1.5
        season = "Rabi 2025-26"
        coverage_period = "Oct '25 - Apr '26"
        actuarial_rate_pct = 8.5
    else:
        # Kharif default
        farmer_share_pct = 2.0
        season = "Kharif 2026"
        coverage_period = "Jun '26 - Nov '26"
        actuarial_rate_pct = 9.0

    # Total Sum Insured (Coverage Amount)
    sum_insured = round(area_ha * scale_of_finance, 2)
    
    # Farmer Subsidized Share
    farmer_premium = round(sum_insured * (farmer_share_pct / 100.0), 2)
    
    # Gross Actuarial Premium
    gross_premium = round(sum_insured * (actuarial_rate_pct / 100.0), 2)
    
    # Government Subsidy (Central + State)
    govt_subsidy = max(round(gross_premium - farmer_premium, 2), 0.0)
    subsidy_pct = round((govt_subsidy / gross_premium) * 100.0, 1) if gross_premium > 0 else 0.0

    return {
        "premium_amount": farmer_premium,  # farmer's payable share
        "coverage_amount": sum_insured,     # full sum insured
        "farmer_premium": farmer_premium,
        "sum_insured": sum_insured,
        "farmer_share_pct": farmer_share_pct,
        "season": season,
        "coverage_period": coverage_period,
        "scale_of_finance_per_ha": scale_of_finance,
        "actuarial_rate_pct": actuarial_rate_pct,
        "gross_premium": gross_premium,
        "govt_subsidy": govt_subsidy,
        "subsidy_pct": subsidy_pct,
        "area_ha": round(area_ha, 2),
        "area_acres": round(area_ha * 2.47105, 2),
    }
