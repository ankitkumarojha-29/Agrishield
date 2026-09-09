import os
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("agrishield.agmarknet")

AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY", "")
AGMARKNET_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Official 2025-26 Mandi & MSP Benchmark Rates in INR per Quintal (100 kg)
BENCHMARK_MANDI_PRICES = {
    "wheat": {"price_qtl": 2425.0, "market": "Bhopal Mandi (Benchmark)", "grade": "FAQ"},
    "soybean": {"price_qtl": 4892.0, "market": "Indore Mandi (Benchmark)", "grade": "Yellow"},
    "rice": {"price_qtl": 2320.0, "market": "Jabalpur Mandi (Benchmark)", "grade": "Common"},
    "paddy": {"price_qtl": 2320.0, "market": "Jabalpur Mandi (Benchmark)", "grade": "Common"},
    "cotton": {"price_qtl": 7521.0, "market": "Khargone Mandi (Benchmark)", "grade": "Medium Staple"},
    "maize": {"price_qtl": 2225.0, "market": "Chhindwara Mandi (Benchmark)", "grade": "Hybrid"},
    "gram": {"price_qtl": 5650.0, "market": "Vidisha Mandi (Benchmark)", "grade": "Desi"},
    "chana": {"price_qtl": 5650.0, "market": "Vidisha Mandi (Benchmark)", "grade": "Desi"},
    "mustard": {"price_qtl": 5950.0, "market": "Morena Mandi (Benchmark)", "grade": "Bold"},
    "sugarcane": {"price_qtl": 340.0, "market": "Narsinghpur Sugar Mill (FRP)", "grade": "Standard"},
}

_CACHE: Dict[str, Dict[str, Any]] = {}

async def get_mandi_price(crop: str, state: str = "Madhya Pradesh") -> Dict[str, Any]:
    """
    Fetch mandi price for crop from data.gov.in Agmarknet API.
    Falls back gracefully to official MSP benchmark rates if external API is slow or unavailable.
    """
    crop_clean = (crop or "wheat").strip().lower()
    
    # Check cache first (cached per session)
    if crop_clean in _CACHE:
        return _CACHE[crop_clean]

    # Map vernacular / variant crop names
    canonical_crop = "wheat"
    if "soy" in crop_clean:
        canonical_crop = "soybean"
    elif "paddy" in crop_clean or "rice" in crop_clean or "dhan" in crop_clean:
        canonical_crop = "paddy"
    elif "cotton" in crop_clean or "kapas" in crop_clean:
        canonical_crop = "cotton"
    elif "maize" in crop_clean or "makka" in crop_clean or "corn" in crop_clean:
        canonical_crop = "maize"
    elif "gram" in crop_clean or "chana" in crop_clean or "chickpea" in crop_clean:
        canonical_crop = "gram"
    elif "mustard" in crop_clean or "sarson" in crop_clean:
        canonical_crop = "mustard"
    elif "sugar" in crop_clean or "ganna" in crop_clean:
        canonical_crop = "sugarcane"
    elif "wheat" in crop_clean or "gehun" in crop_clean:
        canonical_crop = "wheat"
    else:
        canonical_crop = crop_clean

    benchmark = BENCHMARK_MANDI_PRICES.get(canonical_crop, BENCHMARK_MANDI_PRICES["wheat"])

    # Attempt live query to data.gov.in Agmarknet
    try:
        commodity_title = canonical_crop.capitalize()
        if canonical_crop == "paddy":
            commodity_title = "Paddy(Dhan)"
        elif canonical_crop == "soybean":
            commodity_title = "Soyabean"

        params = {
            "api-key": AGMARKNET_API_KEY,
            "format": "json",
            "limit": "5",
            "filters[state]": state,
            "filters[commodity]": commodity_title,
        }

        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(AGMARKNET_BASE_URL, params=params)
            if resp.status_code == 200:
                data = resp.json()
                records = data.get("records", [])
                if records and isinstance(records, list):
                    rec = records[0]
                    modal_price = float(rec.get("modal_price", benchmark["price_qtl"]))
                    market = rec.get("market", benchmark["market"])
                    grade = rec.get("grade", benchmark["grade"])
                    arrival_date = rec.get("arrival_date", "Latest")

                    result = {
                        "crop": canonical_crop.capitalize(),
                        "price_per_quintal": modal_price,
                        "price_per_kg": round(modal_price / 100.0, 2),
                        "market": f"{market}, {state}",
                        "grade": grade,
                        "date": arrival_date,
                        "source": "Agmarknet Live (data.gov.in)",
                        "is_live": True,
                    }
                    _CACHE[crop_clean] = result
                    return result
    except Exception as e:
        logger.warning(f"Agmarknet live fetch failed, using benchmark: {e}")

    # Fallback to statutory MSP / Mandi benchmark
    fallback_res = {
        "crop": canonical_crop.capitalize(),
        "price_per_quintal": benchmark["price_qtl"],
        "price_per_kg": round(benchmark["price_qtl"] / 100.0, 2),
        "market": benchmark["market"],
        "grade": benchmark["grade"],
        "date": "2025-26 Benchmark",
        "source": "Agmarknet / PMFBY Mandi Benchmark",
        "is_live": False,
    }
    _CACHE[crop_clean] = fallback_res
    return fallback_res
