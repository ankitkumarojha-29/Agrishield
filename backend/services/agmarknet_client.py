import os
import httpx
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete, or_

from core.config import settings
from db.models import MandiPriceRecord

logger = logging.getLogger("agrishield.agmarknet")

AGMARKNET_API_KEY = getattr(settings, "AGMARKNET_API_KEY", "") or os.getenv("AGMARKNET_API_KEY", "")
AGMARKNET_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Official 2025-26 / 2026-27 CACP Minimum Support Price (MSP) & Market Benchmark Rates in INR per Quintal (100 kg)
BENCHMARK_MANDI_PRICES: Dict[str, Dict[str, Any]] = {
    "wheat": {
        "price_qtl": 2425.0, 
        "market": "Bhopal Mandi (Benchmark)", 
        "grade": "FAQ", 
        "hindi": "गेहूं", 
        "season": "Rabi",
        "change": "+₹150 (+6.6%)"
    },
    "soybean": {
        "price_qtl": 4892.0, 
        "market": "Indore Mandi (Benchmark)", 
        "grade": "Yellow", 
        "hindi": "सोयाबीन", 
        "season": "Kharif",
        "change": "+₹292 (+6.3%)"
    },
    "rice": {
        "price_qtl": 2320.0, 
        "market": "Jabalpur Mandi (Benchmark)", 
        "grade": "Common", 
        "hindi": "धान / चावल", 
        "season": "Kharif",
        "change": "+₹137 (+6.3%)"
    },
    "paddy": {
        "price_qtl": 2320.0, 
        "market": "Jabalpur Mandi (Benchmark)", 
        "grade": "Common", 
        "hindi": "धान / चावल", 
        "season": "Kharif",
        "change": "+₹137 (+6.3%)"
    },
    "cotton": {
        "price_qtl": 7521.0, 
        "market": "Khargone Mandi (Benchmark)", 
        "grade": "Medium Staple", 
        "hindi": "कपास", 
        "season": "Kharif",
        "change": "+₹501 (+7.1%)"
    },
    "maize": {
        "price_qtl": 2225.0, 
        "market": "Chhindwara Mandi (Benchmark)", 
        "grade": "Hybrid", 
        "hindi": "मक्का", 
        "season": "Kharif",
        "change": "+₹135 (+6.5%)"
    },
    "gram": {
        "price_qtl": 5650.0, 
        "market": "Vidisha Mandi (Benchmark)", 
        "grade": "Desi", 
        "hindi": "चना", 
        "season": "Rabi",
        "change": "+₹210 (+3.9%)"
    },
    "chana": {
        "price_qtl": 5650.0, 
        "market": "Vidisha Mandi (Benchmark)", 
        "grade": "Desi", 
        "hindi": "चना", 
        "season": "Rabi",
        "change": "+₹210 (+3.9%)"
    },
    "mustard": {
        "price_qtl": 5950.0, 
        "market": "Morena Mandi (Benchmark)", 
        "grade": "Bold", 
        "hindi": "सरसों", 
        "season": "Rabi",
        "change": "+₹300 (+5.3%)"
    },
    "groundnut": {
        "price_qtl": 6783.0, 
        "market": "Rajkot APMC (Benchmark)", 
        "grade": "FAQ", 
        "hindi": "मूंगफली", 
        "season": "Kharif",
        "change": "+₹406 (+6.4%)"
    },
    "moong": {
        "price_qtl": 8682.0, 
        "market": "Nagaur APMC (Benchmark)", 
        "grade": "FAQ", 
        "hindi": "मूंग", 
        "season": "Kharif",
        "change": "+₹124 (+1.4%)"
    },
    "sugarcane": {
        "price_qtl": 340.0, 
        "market": "Narsinghpur Sugar Mill (FRP)", 
        "grade": "Standard", 
        "hindi": "गन्ना", 
        "season": "Annual",
        "change": "+₹25 (+7.9%)",
        "avg_yield": 750
    },
    "bajra": {
        "price_qtl": 2625.0,
        "market": "Jaipur APMC (Benchmark)",
        "grade": "Hybrid",
        "hindi": "बाजरा",
        "season": "Kharif",
        "change": "+₹125 (+5.0%)",
        "avg_yield": 22
    },
    "jowar": {
        "price_qtl": 3371.0,
        "market": "Solapur APMC (Benchmark)",
        "grade": "Maldandi",
        "hindi": "ज्वार",
        "season": "Kharif",
        "change": "+₹191 (+6.0%)",
        "avg_yield": 20
    },
    "tur": {
        "price_qtl": 7550.0,
        "market": "Latur APMC (Benchmark)",
        "grade": "Red / Desi",
        "hindi": "अरहर / तुअर",
        "season": "Kharif",
        "change": "+₹550 (+7.8%)",
        "avg_yield": 14
    },
    "potato": {
        "price_qtl": 1450.0,
        "market": "Agra APMC (Benchmark)",
        "grade": "Jyoti",
        "hindi": "आलू",
        "season": "Rabi",
        "change": "+₹120 (+9.0%)",
        "avg_yield": 220
    },
    "onion": {
        "price_qtl": 1850.0,
        "market": "Lasalgaon APMC (Benchmark)",
        "grade": "Red Medium",
        "hindi": "प्याज",
        "season": "Rabi",
        "change": "+₹180 (+10.8%)",
        "avg_yield": 180
    },
    "garlic": {
        "price_qtl": 6800.0,
        "market": "Mandsaur APMC (Benchmark)",
        "grade": "G2 Bold",
        "hindi": "लहसुन",
        "season": "Rabi",
        "change": "+₹500 (+7.9%)",
        "avg_yield": 65
    },
    "cumin": {
        "price_qtl": 24500.0,
        "market": "Unjha APMC (Benchmark)",
        "grade": "Superior",
        "hindi": "जीरा",
        "season": "Rabi",
        "change": "+₹1,200 (+5.1%)",
        "avg_yield": 8
    },
    "guar": {
        "price_qtl": 5400.0,
        "market": "Bikaner APMC (Benchmark)",
        "grade": "Gum Grade",
        "hindi": "ग्वार बीज",
        "season": "Kharif",
        "change": "+₹320 (+6.3%)",
        "avg_yield": 12
    },
    "castor": {
        "price_qtl": 6200.0,
        "market": "Patan APMC (Benchmark)",
        "grade": "Standard",
        "hindi": "अरंडी",
        "season": "Kharif",
        "change": "+₹380 (+6.5%)",
        "avg_yield": 20
    },
    "chilli": {
        "price_qtl": 18500.0,
        "market": "Guntur APMC (Benchmark)",
        "grade": "Teja / Deluxe",
        "hindi": "लाल मिर्च",
        "season": "Kharif",
        "change": "+₹950 (+5.4%)",
        "avg_yield": 25
    },
    "lentil": {
        "price_qtl": 6700.0,
        "market": "Patna Mandi (Benchmark)",
        "grade": "Desi Small",
        "hindi": "मसूर",
        "season": "Rabi",
        "change": "+₹275 (+4.3%)",
        "avg_yield": 12
    },
    "jute": {
        "price_qtl": 5335.0,
        "market": "Burdwan APMC (Benchmark)",
        "grade": "TD-5",
        "hindi": "जूट / पटसन",
        "season": "Kharif",
        "change": "+₹285 (+5.6%)",
        "avg_yield": 28
    },
    "sesame": {
        "price_qtl": 9267.0,
        "market": "Amreli APMC (Benchmark)",
        "grade": "White Bold",
        "hindi": "तिल",
        "season": "Kharif",
        "change": "+₹632 (+7.3%)",
        "avg_yield": 6
    },
    "turmeric": {
        "price_qtl": 13200.0,
        "market": "Nizamabad APMC (Benchmark)",
        "grade": "Finger",
        "hindi": "हल्दी",
        "season": "Annual",
        "change": "+₹800 (+6.4%)",
        "avg_yield": 45
    },
    "ragi": {
        "price_qtl": 4290.0,
        "market": "Mandya APMC (Benchmark)",
        "grade": "FAQ",
        "hindi": "रागी / मड़ुआ",
        "season": "Kharif",
        "change": "+₹444 (+11.5%)",
        "avg_yield": 18
    }
}

STATE_REGIONAL_CROPS: Dict[str, List[str]] = {
    "madhya pradesh": ["soybean", "wheat", "gram", "mustard", "garlic", "onion", "maize", "paddy"],
    "uttar pradesh": ["sugarcane", "wheat", "paddy", "potato", "mustard", "maize", "gram", "lentil"],
    "punjab": ["wheat", "paddy", "cotton", "mustard", "maize", "potato", "sugarcane", "gram"],
    "haryana": ["wheat", "mustard", "paddy", "cotton", "bajra", "sugarcane", "gram", "maize"],
    "maharashtra": ["cotton", "soybean", "sugarcane", "onion", "tur", "groundnut", "jowar", "maize"],
    "rajasthan": ["mustard", "bajra", "moong", "guar", "gram", "wheat", "cumin", "groundnut"],
    "gujarat": ["groundnut", "cotton", "castor", "cumin", "sesame", "wheat", "onion", "bajra"],
    "bihar": ["paddy", "wheat", "maize", "lentil", "potato", "sugarcane", "mustard", "jute"],
    "karnataka": ["cotton", "maize", "paddy", "tur", "groundnut", "sugarcane", "ragi", "chilli"],
    "telangana": ["cotton", "paddy", "chilli", "maize", "tur", "groundnut", "turmeric", "soybean"],
    "andhra pradesh": ["paddy", "cotton", "chilli", "groundnut", "maize", "sugarcane", "turmeric", "tur"],
    "west bengal": ["paddy", "jute", "potato", "mustard", "maize", "wheat", "lentil", "sesame"]
}

def canonicalize_crop_name(crop: str) -> str:
    """Map vernacular, variant, colloquial, and Hindi Devanagari crop names to canonical English keys."""
    crop_clean = (crop or "wheat").strip().lower()
    if "soy" in crop_clean or "सोयाबीन" in crop_clean:
        return "soybean"
    elif "paddy" in crop_clean or "rice" in crop_clean or "dhan" in crop_clean or "chawal" in crop_clean or "धान" in crop_clean or "चावल" in crop_clean:
        return "paddy"
    elif "cotton" in crop_clean or "kapas" in crop_clean or "कपास" in crop_clean:
        return "cotton"
    elif "maize" in crop_clean or "makka" in crop_clean or "corn" in crop_clean or "मक्का" in crop_clean:
        return "maize"
    elif "gram" in crop_clean or "chana" in crop_clean or "chickpea" in crop_clean or "चना" in crop_clean:
        return "gram"
    elif "mustard" in crop_clean or "sarson" in crop_clean or "rai" in crop_clean or "सरसों" in crop_clean or "राई" in crop_clean:
        return "mustard"
    elif "groundnut" in crop_clean or "mungfali" in crop_clean or "peanut" in crop_clean or "मूंगफली" in crop_clean:
        return "groundnut"
    elif "moong" in crop_clean or "mung" in crop_clean or "मूंग" in crop_clean:
        return "moong"
    elif "urad" in crop_clean or "mash" in crop_clean or "उड़द" in crop_clean:
        return "urad"
    elif "sugar" in crop_clean or "ganna" in crop_clean or "गन्ना" in crop_clean:
        return "sugarcane"
    elif "bajra" in crop_clean or "pearl" in crop_clean or "बाजरा" in crop_clean:
        return "bajra"
    elif "jowar" in crop_clean or "sorghum" in crop_clean or "ज्वार" in crop_clean:
        return "jowar"
    elif "tur" in crop_clean or "arhar" in crop_clean or "pigeon" in crop_clean or "तुअर" in crop_clean or "अरहर" in crop_clean:
        return "tur"
    elif "potato" in crop_clean or "aloo" in crop_clean or "alu" in crop_clean or "आलू" in crop_clean:
        return "potato"
    elif "onion" in crop_clean or "pyaz" in crop_clean or "kanda" in crop_clean or "प्याज" in crop_clean:
        return "onion"
    elif "garlic" in crop_clean or "lahsun" in crop_clean or "लहसुन" in crop_clean:
        return "garlic"
    elif "tomato" in crop_clean or "tamatar" in crop_clean or "टमाटर" in crop_clean:
        return "tomato"
    elif "cumin" in crop_clean or "jeera" in crop_clean or "जीरा" in crop_clean:
        return "cumin"
    elif "guar" in crop_clean or "ग्वार" in crop_clean:
        return "guar"
    elif "castor" in crop_clean or "arandi" in crop_clean or "अरंडी" in crop_clean:
        return "castor"
    elif "chilli" in crop_clean or "mirch" in crop_clean or "chili" in crop_clean or "मिर्च" in crop_clean:
        return "chilli"
    elif "lentil" in crop_clean or "masur" in crop_clean or "masoor" in crop_clean or "मसूर" in crop_clean:
        return "lentil"
    elif "jute" in crop_clean or "patson" in crop_clean or "जूट" in crop_clean or "पटसन" in crop_clean:
        return "jute"
    elif "sesame" in crop_clean or "til" in crop_clean or "तिल" in crop_clean:
        return "sesame"
    elif "turmeric" in crop_clean or "haldi" in crop_clean or "हल्दी" in crop_clean:
        return "turmeric"
    elif "ragi" in crop_clean or "mandua" in crop_clean or "रागी" in crop_clean or "मड़ुआ" in crop_clean:
        return "ragi"
    elif "barley" in crop_clean or "jau" in crop_clean or "जौ" in crop_clean:
        return "barley"
    elif "ginger" in crop_clean or "adrak" in crop_clean or "अदरक" in crop_clean:
        return "ginger"
    elif "coriander" in crop_clean or "dhania" in crop_clean or "धनिया" in crop_clean:
        return "coriander"
    elif "fenugreek" in crop_clean or "methi" in crop_clean or "मेथी" in crop_clean:
        return "fenugreek"
    elif "fennel" in crop_clean or "saunf" in crop_clean or "सौंफ" in crop_clean:
        return "fennel"
    elif "pea" in crop_clean or "matar" in crop_clean or "मटर" in crop_clean:
        return "peas"
    elif "brinjal" in crop_clean or "baingan" in crop_clean or "बैंगन" in crop_clean:
        return "brinjal"
    elif "okra" in crop_clean or "bhindi" in crop_clean or "भिंडी" in crop_clean:
        return "okra"
    elif "wheat" in crop_clean or "gehun" in crop_clean or "sharbati" in crop_clean or "गेहूं" in crop_clean:
        return "wheat"
    return crop_clean


CROP_HINDI_NAMES: Dict[str, str] = {
    "wheat": "गेहूं",
    "soybean": "सोयाबीन",
    "paddy": "धान / चावल",
    "rice": "धान / चावल",
    "cotton": "कपास",
    "maize": "मक्का",
    "gram": "चना",
    "mustard": "सरसों",
    "groundnut": "मूंगफली",
    "moong": "मूंग",
    "urad": "उड़द",
    "sugarcane": "गन्ना",
    "bajra": "बाजरा",
    "jowar": "ज्वार",
    "tur": "अरहर / तुअर",
    "potato": "आलू",
    "onion": "प्याज",
    "garlic": "लहसुन",
    "tomato": "टमाटर",
    "cumin": "जीरा",
    "guar": "ग्वार बीज",
    "castor": "अरंडी",
    "chilli": "लाल मिर्च",
    "lentil": "मसूर",
    "jute": "जूट / पटसन",
    "sesame": "तिल",
    "turmeric": "हल्दी",
    "ragi": "रागी / मड़ुआ",
    "barley": "जौ",
    "ginger": "अदरक",
    "coriander": "धनिया",
    "fenugreek": "मेथी",
    "fennel": "सौंफ",
    "peas": "मटर",
    "brinjal": "बैंगन",
    "okra": "भिंडी",
    "cauliflower": "फूलगोभी",
    "cabbage": "पत्तागोभी",
    "sunflower": "सूरजमुखी",
    "banana": "केला",
    "mango": "आम",
    "citrus": "संतरा",
    "tea": "चाय",
    "coffee": "कॉफ़ी",
    "tobacco": "तंबाकू"
}


def get_crop_hindi_name(raw_name: str) -> str:
    """Return Hindi translation for any Indian crop commodity."""
    if not raw_name:
        return "फसल"
    c_norm = canonicalize_crop_name(raw_name)
    if c_norm in CROP_HINDI_NAMES:
        return CROP_HINDI_NAMES[c_norm]
    # Check substring matches
    for k, v in CROP_HINDI_NAMES.items():
        if k in raw_name.lower():
            return v
    return raw_name



def parse_arrival_date(date_str: Optional[str]) -> Optional[date]:
    """Parse date strings commonly returned by Indian Agmarknet / APMC feeds."""
    if not date_str:
        return None
    cleaned = date_str.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d.%m.%Y"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


async def fetch_live_from_data_gov(state: str = "Madhya Pradesh", limit: int = 60) -> List[Dict[str, Any]]:
    """
    Fetch live daily market arrivals from Government of India Agmarknet resource on data.gov.in.
    """
    if not AGMARKNET_API_KEY:
        logger.warning("AGMARKNET_API_KEY not configured, cannot query data.gov.in")
        return []

    params = {
        "api-key": AGMARKNET_API_KEY,
        "format": "json",
        "limit": str(limit),
        "filters[state]": state,
    }

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        async with httpx.AsyncClient(headers=headers, timeout=12.0) as client:
            resp = await client.get(AGMARKNET_BASE_URL, params=params)
            if resp.status_code == 200:
                body = resp.json()
                records = body.get("records", [])
                if isinstance(records, list):
                    logger.info("Successfully fetched %d live Agmarknet records for %s", len(records), state)
                    return records
            else:
                logger.warning("data.gov.in returned status %d: %s", resp.status_code, resp.text[:150])
    except Exception as e:
        logger.warning("Failed to connect to data.gov.in Agmarknet feed: %s", e)

    return []


import time

# Server-Side In-Memory Cache (FastAPI RAM) to eliminate unnecessary Supabase DB reads and writes
# Caches parsed results per state for 30 minutes in server memory
_IN_MEMORY_MANDI_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes


async def sync_and_get_daily_mandi_rates(
    db: AsyncSession, 
    state: str = "Madhya Pradesh", 
    search: Optional[str] = None,
    force_refresh: bool = False
) -> List[Dict[str, Any]]:
    """
    Daily Mandi Ingestion with Zero-Inflation Storage Bounds and Guaranteed Yesterday Fallback:
    1. Server-Side In-Memory Cache Check:
       If not force_refresh, serves immediately from server RAM (<1ms, 0 DB queries, 0 DB writes).
    2. Zero Duplicate Guarantee (Atomic Replace):
       Before inserting incoming live feed records, existing records for that state and date
       are atomically deleted so refreshing 1 or 1,000 times NEVER adds duplicate rows.
    3. Strict 1-Day Rolling Retention Pruning:
       Only today and yesterday (fallback buffer) are retained. Records older than yesterday
       (rate_date < CURRENT_DATE - 1 day) are automatically pruned on every sync, capping
       the total database storage for mandi data to <300 KB forever (preventing Supabase 512MB overflow).
    4. Multi-Tier Fallback:
       - 1st Priority: Live Today Agmarknet feed
       - 2nd Priority: Stored Yesterday / Previous Trading Day actual market rates
       - 3rd Priority: Statutory Official MSP Benchmarks (strictly deduplicated)
    """
    today = date.today()
    yesterday = today - timedelta(days=1)
    state_clean = state.strip().title()
    state_key = state.strip().lower()

    # 1. Server In-Memory RAM Cache Check
    if not force_refresh and state_key in _IN_MEMORY_MANDI_CACHE:
        cache_entry = _IN_MEMORY_MANDI_CACHE[state_key]
        cache_age = time.time() - cache_entry.get("timestamp", 0)
        if cache_age < CACHE_TTL_SECONDS and cache_entry.get("date") == today:
            cached_items = cache_entry.get("items", [])
            if search:
                q = search.lower().strip()
                return [
                    it for it in cached_items 
                    if q in it.get("crop", "").lower() 
                    or q in it.get("crop_hindi", "").lower()
                    or q in it.get("bilingual_crop", "").lower()
                    or q in it.get("mandi", "").lower() 
                    or q in (it.get("district") or "").lower()
                ]
            return cached_items

    records_to_serve: List[MandiPriceRecord] = []
    is_fallback = False
    source_label = "Agmarknet Live APMC Feed (Today)"

    # 2. Check if database already has today's records for this state
    stmt_today = (
        select(MandiPriceRecord)
        .where(
            MandiPriceRecord.state.ilike(f"%{state_clean}%"),
            MandiPriceRecord.rate_date == today
        )
        .order_by(MandiPriceRecord.commodity, MandiPriceRecord.market)
    )

    if not force_refresh:
        result = await db.execute(stmt_today)
        records_to_serve = list(result.scalars().all())

    # 3. If force_refresh or today's records not in DB: FETCH LIVE FROM AGMARKNET
    if not records_to_serve or force_refresh:
        logger.info("Syncing live Agmarknet mandi rates for %s (force_refresh=%s)...", state_clean, force_refresh)
        live_recs = await fetch_live_from_data_gov(state=state_clean, limit=60)
        
        if live_recs:
            # Deduplicate incoming records in Python by (market, commodity, rate_date)
            # Retain only the record with highest modal_price for each unique pair
            dedup_map: Dict[tuple, Dict[str, Any]] = {}
            for r in live_recs:
                try:
                    modal = float(r.get("modal_price") or 0)
                    if modal <= 0:
                        continue
                    min_p = float(r.get("min_price") or modal * 0.95)
                    max_p = float(r.get("max_price") or modal * 1.05)

                    raw_arrival = r.get("arrival_date") or ""
                    parsed_d = parse_arrival_date(raw_arrival) or today
                    mkt = (r.get("market") or f"{state_clean} APMC").strip()
                    comm = (r.get("commodity") or "General").strip()

                    dedup_key = (mkt.lower(), comm.lower(), parsed_d)
                    if dedup_key not in dedup_map or modal > dedup_map[dedup_key]["modal_price"]:
                        dedup_map[dedup_key] = {
                            "state": r.get("state") or state_clean,
                            "district": r.get("district") or "",
                            "market": mkt,
                            "commodity": comm,
                            "variety": r.get("variety") or "Standard",
                            "grade": r.get("grade") or "FAQ",
                            "arrival_date": raw_arrival or parsed_d.strftime("%d/%m/%Y"),
                            "rate_date": parsed_d,
                            "min_price": min_p,
                            "max_price": max_p,
                            "modal_price": modal
                        }
                except Exception as ex:
                    logger.debug("Skip invalid record %s: %s", r, ex)

            if dedup_map:
                # Dates present in the incoming live batch
                incoming_dates = {item["rate_date"] for item in dedup_map.values()}

                # ATOMIC REPLACE: Delete previous records for this state and these exact dates
                # This guarantees that refreshing NEVER creates duplicate records or inflates row count
                await db.execute(
                    delete(MandiPriceRecord).where(
                        MandiPriceRecord.state.ilike(f"%{state_clean}%"),
                        MandiPriceRecord.rate_date.in_(incoming_dates)
                    )
                )

                # Insert the clean, unique records
                to_add = [MandiPriceRecord(**fields) for fields in dedup_map.values()]
                db.add_all(to_add)
                await db.commit()

                # STRICT 1-DAY ROLLING RETENTION PRUNING:
                # Delete any records strictly older than yesterday (rate_date < today - 1 day)
                # Prevents Supabase 512MB storage exhaustion permanently
                try:
                    await db.execute(
                        delete(MandiPriceRecord).where(MandiPriceRecord.rate_date < yesterday)
                    )
                    await db.commit()
                except Exception as ex:
                    logger.warning("Error pruning older mandi records: %s", ex)

                # Re-query today's records
                res_today = await db.execute(stmt_today)
                records_to_serve = list(res_today.scalars().all())
                if records_to_serve:
                    source_label = "Agmarknet Live APMC Feed (Today)"
                    is_fallback = False
                    logger.info("Successfully synced %d live records for today (%s) in %s", len(records_to_serve), today, state_clean)

        # 4. IF TODAY'S RATES COULD NOT BE FETCHED -> FALLBACK TO YESTERDAY'S MARKET RATES
        if not records_to_serve:
            logger.warning("Today's rates not available for %s. Executing fallback to yesterday's rates...", state_clean)
            prev_stmt = (
                select(MandiPriceRecord)
                .where(
                    MandiPriceRecord.state.ilike(f"%{state_clean}%"),
                    MandiPriceRecord.rate_date < today
                )
                .order_by(MandiPriceRecord.rate_date.desc(), MandiPriceRecord.commodity)
            )
            prev_res = await db.execute(prev_stmt)
            all_prev = list(prev_res.scalars().all())
            
            if all_prev:
                latest_date = all_prev[0].rate_date
                # Deduplicate in memory by (market, commodity)
                seen_pairs = set()
                deduped_prev = []
                for r in all_prev:
                    if r.rate_date == latest_date:
                        pair_key = (r.market.lower(), r.commodity.lower())
                        if pair_key not in seen_pairs:
                            seen_pairs.add(pair_key)
                            deduped_prev.append(r)
                records_to_serve = deduped_prev
                is_fallback = True
                source_label = f"Agmarknet Previous Day Fallback ({latest_date.strftime('%d/%m/%Y')})"
                logger.info("Serving %d records from %s as fallback for %s", len(records_to_serve), latest_date, state_clean)
            else:
                # 5. Last resort: Seed statutory official MSP benchmarks with atomic replace
                logger.info("No previous days' records found for %s, seeding statutory MSP benchmarks", state_clean)
                await db.execute(
                    delete(MandiPriceRecord).where(
                        MandiPriceRecord.state.ilike(f"%{state_clean}%"),
                        MandiPriceRecord.rate_date == today
                    )
                )
                for c_key, b in BENCHMARK_MANDI_PRICES.items():
                    rec = MandiPriceRecord(
                        state=state_clean,
                        district=f"{state_clean} District",
                        market=b["market"],
                        commodity=c_key.capitalize(),
                        variety="FAQ Standard",
                        grade=b["grade"],
                        arrival_date=today.strftime("%d/%m/%Y"),
                        rate_date=today,
                        min_price=round(b["price_qtl"] * 0.95, 1),
                        max_price=round(b["price_qtl"] * 1.05, 1),
                        modal_price=b["price_qtl"]
                    )
                    db.add(rec)
                await db.commit()

                res_seed = await db.execute(stmt_today)
                records_to_serve = list(res_seed.scalars().all())
                is_fallback = True
                source_label = "Agmarknet Official MSP Benchmark"

    # Format items
    items = []
    for r in records_to_serve:
        c_norm = canonicalize_crop_name(r.commodity)
        benchmark = BENCHMARK_MANDI_PRICES.get(c_norm, {})
        msp_rate = benchmark.get("price_qtl", 0.0)
        status = "Above MSP" if (msp_rate > 0 and r.modal_price >= msp_rate) else ("Near MSP" if msp_rate > 0 else "Market Spot")
        crop_hindi = get_crop_hindi_name(r.commodity)
        
        items.append({
            "id": str(r.id),
            "mandi": r.market,
            "district": r.district,
            "state": r.state,
            "crop": r.commodity,
            "crop_hindi": crop_hindi,
            "bilingual_crop": f"{r.commodity} ({crop_hindi})",
            "variety": r.variety,
            "grade": r.grade,
            "modalPrice": r.modal_price,
            "minPrice": r.min_price,
            "maxPrice": r.max_price,
            "arrival_date": r.arrival_date or (str(r.rate_date) if r.rate_date else today.strftime("%d/%m/%Y")),
            "status": status,
            "mspBenchmark": msp_rate,
            "source": source_label,
            "is_live": not is_fallback,
            "is_fallback": is_fallback,
            "rate_date": str(r.rate_date)
        })

    # Save to in-memory RAM cache for 30 minutes
    _IN_MEMORY_MANDI_CACHE[state_key] = {
        "timestamp": time.time(),
        "date": today,
        "items": items
    }

    # Filter by search query if requested
    if search:
        q = search.lower().strip()
        return [
            it for it in items 
            if q in it.get("crop", "").lower() 
            or q in it.get("crop_hindi", "").lower()
            or q in it.get("bilingual_crop", "").lower()
            or q in it.get("mandi", "").lower() 
            or q in (it.get("district") or "").lower()
        ]

    return items




async def get_mandi_price(crop: str, state: str = "Madhya Pradesh", db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Fetch specific commodity spot rate for a farm or crop valuation.
    Guarantees:
    1. First attempts to fetch and check today's rate.
    2. If today's rate is not available, falls back to yesterday's / latest previous day's rate from DB.
    3. If no DB record exists, falls back to statutory MSP benchmark.
    """
    canonical_crop = canonicalize_crop_name(crop)
    benchmark = BENCHMARK_MANDI_PRICES.get(canonical_crop, BENCHMARK_MANDI_PRICES["wheat"])
    today = date.today()
    today_str = today.strftime("%d/%m/%Y")

    if db:
        try:
            # Check if DB has any records for today in this state; if not, trigger today sync first!
            count_stmt = (
                select(func.count(MandiPriceRecord.id))
                .where(
                    MandiPriceRecord.state.ilike(f"%{state}%"),
                    MandiPriceRecord.rate_date == today
                )
            )
            count_res = await db.execute(count_stmt)
            today_count = count_res.scalar() or 0
            if today_count == 0:
                logger.info("No records for today in DB for %s. Triggering Agmarknet today sync first...", state)
                await sync_and_get_daily_mandi_rates(db, state=state)

            # 1. First attempt: Today's record
            stmt_today = (
                select(MandiPriceRecord)
                .where(
                    MandiPriceRecord.state.ilike(f"%{state}%"),
                    MandiPriceRecord.rate_date == today,
                    or_(
                        MandiPriceRecord.commodity.ilike(f"%{canonical_crop}%"),
                        MandiPriceRecord.commodity.ilike(f"%{crop}%")
                    )
                )
                .order_by(MandiPriceRecord.modal_price.desc())
                .limit(1)
            )
            res_today = await db.execute(stmt_today)
            match_today = res_today.scalar_one_or_none()
            if match_today:
                return {
                    "crop": match_today.commodity,
                    "price_per_quintal": match_today.modal_price,
                    "price_per_kg": round(match_today.modal_price / 100.0, 2),
                    "market": f"{match_today.market}, {match_today.state}",
                    "grade": match_today.grade,
                    "date": match_today.arrival_date or today_str,
                    "source": "Agmarknet Live APMC Rate (Today)",
                    "is_live": True,
                    "is_fallback": False,
                }

            # 2. Second attempt: Yesterday / latest previous day's record
            stmt_prev = (
                select(MandiPriceRecord)
                .where(
                    MandiPriceRecord.state.ilike(f"%{state}%"),
                    MandiPriceRecord.rate_date < today,
                    or_(
                        MandiPriceRecord.commodity.ilike(f"%{canonical_crop}%"),
                        MandiPriceRecord.commodity.ilike(f"%{crop}%")
                    )
                )
                .order_by(MandiPriceRecord.rate_date.desc(), MandiPriceRecord.modal_price.desc())
                .limit(1)
            )
            res_prev = await db.execute(stmt_prev)
            match_prev = res_prev.scalar_one_or_none()
            if match_prev:
                return {
                    "crop": match_prev.commodity,
                    "price_per_quintal": match_prev.modal_price,
                    "price_per_kg": round(match_prev.modal_price / 100.0, 2),
                    "market": f"{match_prev.market}, {match_prev.state}",
                    "grade": match_prev.grade,
                    "date": match_prev.arrival_date or str(match_prev.rate_date),
                    "source": f"Agmarknet Previous Day Fallback ({match_prev.arrival_date or match_prev.rate_date})",
                    "is_live": False,
                    "is_fallback": True,
                }
        except Exception as e:
            logger.warning("Database lookup failed in get_mandi_price: %s", e)

    # 3. Final resort: Official statutory MSP benchmark
    return {
        "crop": canonical_crop.capitalize(),
        "price_per_quintal": benchmark["price_qtl"],
        "price_per_kg": round(benchmark["price_qtl"] / 100.0, 2),
        "market": f"{benchmark['market']}, {state}",
        "grade": benchmark["grade"],
        "date": today_str,
        "source": "Agmarknet Official MSP Benchmark",
        "is_live": False,
        "is_fallback": True,
    }


def get_official_msp_benchmarks() -> List[Dict[str, Any]]:
    """Return official CACP MSP rates for agricultural economic forecasting."""
    results = []
    for crop, data in BENCHMARK_MANDI_PRICES.items():
        if crop in ("chana", "paddy"):  # omit duplicate synonyms
            continue
        results.append({
            "key": crop,
            "name": crop.capitalize(),
            "hindiName": data.get("hindi", ""),
            "season": data.get("season", "Kharif"),
            "mspPerQtl": data.get("price_qtl", 2400.0),
            "changeVsLastYear": data.get("change", "+5.5%"),
            "avgYieldQtlPerHa": data.get("avg_yield", 25)
        })
    return results


async def get_regional_mandi_summary(
    db: AsyncSession, 
    state: str = "Madhya Pradesh", 
    force_refresh: bool = False
) -> List[Dict[str, Any]]:
    """
    Produce regional commodity spot rates & MSP benchmarks dynamically adapted to the selected State/Region.
    1. Ingests or loads daily APMC Mandi rates for this specific state (live today with yesterday fallback).
    2. Retrieves the state's principal regional crops.
    3. Matches actual APMC modal spot prices, arrival dates, and mandis.
    4. Computes live spread vs statutory MSP floor.
    """
    state_clean = state.strip().title()
    state_key = state.strip().lower()
    today_str = date.today().strftime("%d/%m/%Y")
    
    # 1. Fetch / Sync state-specific APMC mandi arrivals (first today live, fallback yesterday)
    arrivals = await sync_and_get_daily_mandi_rates(db, state=state_clean, force_refresh=force_refresh)
    
    # 2. Get regional crops for this state
    regional_crop_keys = STATE_REGIONAL_CROPS.get(
        state_key, 
        ["wheat", "soybean", "paddy", "gram", "mustard", "cotton", "maize", "groundnut"]
    )
    
    results = []
    for crop_key in regional_crop_keys:
        c_norm = canonicalize_crop_name(crop_key)
        benchmark = BENCHMARK_MANDI_PRICES.get(c_norm, BENCHMARK_MANDI_PRICES.get("wheat", {}))
        msp_rate = benchmark.get("price_qtl", 2400.0)
        
        # Match with state's real arrivals
        matched_arrival = None
        for a in arrivals:
            a_crop = (a.get("crop") or "").lower()
            if c_norm in a_crop or crop_key in a_crop:
                matched_arrival = a
                break
        
        if matched_arrival:
            spot_price = matched_arrival.get("modalPrice", msp_rate)
            market_name = matched_arrival.get("mandi", f"{state_clean} APMC")
            arrival_date = matched_arrival.get("arrival_date", today_str)
            is_live = matched_arrival.get("is_live", True)
            is_fallback = matched_arrival.get("is_fallback", False)
            source = matched_arrival.get("source", "Agmarknet APMC Feed")
            status = matched_arrival.get("status", "Market Spot")
        else:
            spot_price = msp_rate
            market_name = f"{state_clean} Benchmark Mandi"
            arrival_date = today_str
            is_live = False
            is_fallback = True
            source = "Official CACP MSP / Market Benchmark"
            status = "At MSP Floor"
            
        diff = spot_price - msp_rate
        diff_pct = round((diff / msp_rate) * 100, 1) if msp_rate > 0 else 0
        if diff > 0:
            change_label = f"+₹{int(diff)} (+{diff_pct}%)"
            spread_status = "Above MSP"
        elif diff < 0:
            change_label = f"-₹{int(abs(diff))} ({diff_pct}%)"
            spread_status = "Near MSP"
        else:
            change_label = benchmark.get("change", "+5.5%")
            spread_status = "At MSP"
            
        results.append({
            "key": crop_key,
            "name": crop_key.capitalize(),
            "hindiName": benchmark.get("hindi", crop_key),
            "season": benchmark.get("season", "Kharif"),
            "spotPricePerQtl": spot_price,
            "mspPerQtl": msp_rate,
            "diffVsMsp": diff,
            "changeVsLastYear": change_label,
            "spread_status": spread_status,
            "status": status,
            "market": market_name,
            "state": state_clean,
            "arrival_date": arrival_date,
            "is_live": is_live,
            "is_fallback": is_fallback,
            "source": source,
            "avgYieldQtlPerHa": benchmark.get("avg_yield", 25),
        })
        
    return results


# Comprehensive Bilingual Indian Agricultural Crops & Mandi Commodities
ALL_MANDI_CROPS: List[Dict[str, Any]] = [
    # 1. Cereals & Millets / अनाज एवं मोटे अनाज
    {"id": "wheat", "name": "Wheat", "hindi": "गेहूं", "category": "Cereals", "categoryHindi": "अनाज", "season": "Rabi", "icon": "🌾", "benchmark_price": 2425.0, "market": "Bhopal Mandi (Benchmark)"},
    {"id": "paddy", "name": "Paddy (Rice)", "hindi": "धान / चावल", "category": "Cereals", "categoryHindi": "अनाज", "season": "Kharif", "icon": "🌾", "benchmark_price": 2320.0, "market": "Jabalpur Mandi (Benchmark)"},
    {"id": "maize", "name": "Maize", "hindi": "मक्का", "category": "Cereals", "categoryHindi": "अनाज", "season": "Kharif", "icon": "🌽", "benchmark_price": 2225.0, "market": "Chhindwara Mandi (Benchmark)"},
    {"id": "bajra", "name": "Bajra (Pearl Millet)", "hindi": "बाजरा", "category": "Cereals", "categoryHindi": "अनाज", "season": "Kharif", "icon": "🌾", "benchmark_price": 2625.0, "market": "Alwar Mandi (Benchmark)"},
    {"id": "jowar", "name": "Jowar (Sorghum)", "hindi": "ज्वार", "category": "Cereals", "categoryHindi": "अनाज", "season": "Kharif", "icon": "🌾", "benchmark_price": 3371.0, "market": "Solapur Mandi (Benchmark)"},
    {"id": "ragi", "name": "Ragi (Finger Millet)", "hindi": "रागी / मड़ुआ", "category": "Cereals", "categoryHindi": "अनाज", "season": "Kharif", "icon": "🌾", "benchmark_price": 4290.0, "market": "Mandya APMC (Benchmark)"},
    {"id": "barley", "name": "Barley (Jau)", "hindi": "जौ", "category": "Cereals", "categoryHindi": "अनाज", "season": "Rabi", "icon": "🌾", "benchmark_price": 1850.0, "market": "Jaipur Mandi (Benchmark)"},

    # 2. Pulses / दलहन
    {"id": "gram", "name": "Gram (Chickpea / Chana)", "hindi": "चना", "category": "Pulses", "categoryHindi": "दलहन", "season": "Rabi", "icon": "🌱", "benchmark_price": 5650.0, "market": "Vidisha Mandi (Benchmark)"},
    {"id": "tur", "name": "Tur (Arhar / Pigeon Pea)", "hindi": "अरहर / तुअर", "category": "Pulses", "categoryHindi": "दलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 7550.0, "market": "Latur APMC (Benchmark)"},
    {"id": "moong", "name": "Moong (Green Gram)", "hindi": "मूंग", "category": "Pulses", "categoryHindi": "दलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 8682.0, "market": "Nagaur APMC (Benchmark)"},
    {"id": "urad", "name": "Urad (Black Gram)", "hindi": "उड़द", "category": "Pulses", "categoryHindi": "दलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 7400.0, "market": "Hardoi Mandi (Benchmark)"},
    {"id": "lentil", "name": "Lentil (Masur)", "hindi": "मसूर", "category": "Pulses", "categoryHindi": "दलहन", "season": "Rabi", "icon": "🌱", "benchmark_price": 6700.0, "market": "Sagar Mandi (Benchmark)"},
    {"id": "peas", "name": "Green Peas (Matar)", "hindi": "मटर", "category": "Pulses", "categoryHindi": "दलहन", "season": "Rabi", "icon": "🌱", "benchmark_price": 4350.0, "market": "Jabalpur Mandi (Benchmark)"},
    {"id": "lobia", "name": "Cowpea (Lobia)", "hindi": "लोबिया / चौलाई", "category": "Pulses", "categoryHindi": "दलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 6200.0, "market": "Meerut Mandi (Benchmark)"},

    # 3. Oilseeds / तिलहन
    {"id": "soybean", "name": "Soybean", "hindi": "सोयाबीन", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 4892.0, "market": "Indore Mandi (Benchmark)"},
    {"id": "mustard", "name": "Mustard (Sarson / Rai)", "hindi": "सरसों / राई", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Rabi", "icon": "🌼", "benchmark_price": 5950.0, "market": "Morena Mandi (Benchmark)"},
    {"id": "groundnut", "name": "Groundnut (Peanut)", "hindi": "मूंगफली", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Kharif", "icon": "🥜", "benchmark_price": 6783.0, "market": "Rajkot APMC (Benchmark)"},
    {"id": "sesame", "name": "Sesame (Til)", "hindi": "तिल", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 9267.0, "market": "Amreli APMC (Benchmark)"},
    {"id": "sunflower", "name": "Sunflower", "hindi": "सूरजमुखी", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Zaid", "icon": "🌻", "benchmark_price": 7280.0, "market": "Kurnool APMC (Benchmark)"},
    {"id": "castor", "name": "Castor Seed (Arandi)", "hindi": "अरंडी", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Kharif", "icon": "🌱", "benchmark_price": 6450.0, "market": "Mehsana APMC (Benchmark)"},
    {"id": "safflower", "name": "Safflower (Kusum)", "hindi": "कुसुम", "category": "Oilseeds", "categoryHindi": "तिलहन", "season": "Rabi", "icon": "🌼", "benchmark_price": 5800.0, "market": "Beed APMC (Benchmark)"},

    # 4. Commercial & Fiber / व्यापारिक एवं रेशेदार
    {"id": "cotton", "name": "Cotton (Kapas)", "hindi": "कपास", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Kharif", "icon": "🌿", "benchmark_price": 7521.0, "market": "Khargone Mandi (Benchmark)"},
    {"id": "sugarcane", "name": "Sugarcane (Ganna)", "hindi": "गन्ना", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Annual", "icon": "🎋", "benchmark_price": 340.0, "market": "Muzaffarnagar APMC (Benchmark)"},
    {"id": "jute", "name": "Jute (Patson)", "hindi": "जूट / पटसन", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Kharif", "icon": "🌿", "benchmark_price": 5400.0, "market": "Barrackpore APMC (Benchmark)"},
    {"id": "guar", "name": "Guar Seed (Cluster Bean)", "hindi": "ग्वार बीज", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Kharif", "icon": "🌱", "benchmark_price": 5450.0, "market": "Bikaner APMC (Benchmark)"},
    {"id": "tobacco", "name": "Tobacco", "hindi": "तंबाकू", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Rabi", "icon": "🍂", "benchmark_price": 4200.0, "market": "Guntur APMC (Benchmark)"},
    {"id": "tea", "name": "Tea", "hindi": "चाय", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Annual", "icon": "🍵", "benchmark_price": 18500.0, "market": "Siliguri Auction (Benchmark)"},
    {"id": "coffee", "name": "Coffee", "hindi": "कॉफ़ी", "category": "Commercial", "categoryHindi": "व्यापारिक", "season": "Annual", "icon": "☕", "benchmark_price": 28000.0, "market": "Chikmagalur APMC (Benchmark)"},

    # 5. Spices / मसाले
    {"id": "chilli", "name": "Red Chilli (Mirch)", "hindi": "लाल मिर्च", "category": "Spices", "categoryHindi": "मसाले", "season": "Kharif", "icon": "🌶️", "benchmark_price": 19500.0, "market": "Guntur APMC (Benchmark)"},
    {"id": "garlic", "name": "Garlic (Lahsun)", "hindi": "लहसुन", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🧄", "benchmark_price": 6800.0, "market": "Mandsaur APMC (Benchmark)"},
    {"id": "onion", "name": "Onion (Pyaz)", "hindi": "प्याज", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🧅", "benchmark_price": 1850.0, "market": "Lasalgaon APMC (Benchmark)"},
    {"id": "turmeric", "name": "Turmeric (Haldi)", "hindi": "हल्दी", "category": "Spices", "categoryHindi": "मसाले", "season": "Annual", "icon": "🪵", "benchmark_price": 13200.0, "market": "Nizamabad APMC (Benchmark)"},
    {"id": "ginger", "name": "Ginger (Adrak)", "hindi": "अदरक", "category": "Spices", "categoryHindi": "मसाले", "season": "Annual", "icon": "🫚", "benchmark_price": 7200.0, "market": "Wayanad APMC (Benchmark)"},
    {"id": "cumin", "name": "Cumin (Jeera)", "hindi": "जीरा", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🧂", "benchmark_price": 24500.0, "market": "Unjha APMC (Benchmark)"},
    {"id": "coriander", "name": "Coriander (Dhania)", "hindi": "धनिया", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🌿", "benchmark_price": 7600.0, "market": "Kota APMC (Benchmark)"},
    {"id": "fenugreek", "name": "Fenugreek (Methi)", "hindi": "मेथी", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🌱", "benchmark_price": 6100.0, "market": "Jaipur Mandi (Benchmark)"},
    {"id": "fennel", "name": "Fennel (Saunf)", "hindi": "सौंफ", "category": "Spices", "categoryHindi": "मसाले", "season": "Rabi", "icon": "🌿", "benchmark_price": 11500.0, "market": "Unjha APMC (Benchmark)"},

    # 6. Vegetables / सब्जियां
    {"id": "potato", "name": "Potato (Aloo)", "hindi": "आलू", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Rabi", "icon": "🥔", "benchmark_price": 1450.0, "market": "Agra APMC (Benchmark)"},
    {"id": "tomato", "name": "Tomato (Tamatar)", "hindi": "टमाटर", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Zaid", "icon": "🍅", "benchmark_price": 1650.0, "market": "Kolar APMC (Benchmark)"},
    {"id": "brinjal", "name": "Brinjal (Baingan / Eggplant)", "hindi": "बैंगन", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Kharif", "icon": "🍆", "benchmark_price": 1400.0, "market": "Nashik APMC (Benchmark)"},
    {"id": "okra", "name": "Okra (Bhindi / Ladyfinger)", "hindi": "भिंडी", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Zaid", "icon": "🥒", "benchmark_price": 2600.0, "market": "Delhi Azadpur APMC (Benchmark)"},
    {"id": "cauliflower", "name": "Cauliflower (Phoolgobhi)", "hindi": "फूलगोभी", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Rabi", "icon": "🥦", "benchmark_price": 1350.0, "market": "Hapur APMC (Benchmark)"},
    {"id": "cabbage", "name": "Cabbage (Pattagobhi)", "hindi": "पत्तागोभी", "category": "Vegetables", "categoryHindi": "सब्जियां", "season": "Rabi", "icon": "🥬", "benchmark_price": 1150.0, "market": "Pune APMC (Benchmark)"},

    # 7. Fruits / फल
    {"id": "banana", "name": "Banana (Kela)", "hindi": "केला", "category": "Fruits", "categoryHindi": "फल", "season": "Annual", "icon": "🍌", "benchmark_price": 1800.0, "market": "Jalgaon APMC (Benchmark)"},
    {"id": "mango", "name": "Mango (Aam)", "hindi": "आम", "category": "Fruits", "categoryHindi": "फल", "season": "Annual", "icon": "🥭", "benchmark_price": 4500.0, "market": "Lucknow Mandi (Benchmark)"},
    {"id": "citrus", "name": "Citrus / Orange (Santra)", "hindi": "संतरा / मौसमी", "category": "Fruits", "categoryHindi": "फल", "season": "Annual", "icon": "🍊", "benchmark_price": 3800.0, "market": "Nagpur APMC (Benchmark)"},
    {"id": "pomegranate", "name": "Pomegranate (Anar)", "hindi": "अनार", "category": "Fruits", "categoryHindi": "फल", "season": "Annual", "icon": "🍎", "benchmark_price": 8500.0, "market": "Solapur APMC (Benchmark)"}
]

# Comprehensive 20+ Indian Soil Types (ICAR / PMFBY Soil Taxonomy)
ALL_SOIL_TYPES: List[Dict[str, Any]] = [
    {
        "id": "medium_black_loam",
        "name": "Medium Black Loam",
        "hindi": "मध्यम काली दोमट मिट्टी",
        "label": "Medium Black Loam (मध्यम काली दोमट)",
        "description": "कपास, सोयाबीन, गेहूं और चने के लिए उपयुक्त (Central India & Deccan)"
    },
    {
        "id": "deep_black_clay",
        "name": "Deep Black Cotton Soil (Regur)",
        "hindi": "गहरी काली कपासी मिट्टी (रेगुर)",
        "label": "Deep Black Cotton / Regur (गहरी काली कपासी)",
        "description": "उच्च नमी धारण क्षमता, कपास व दलहन (Malwa, Vidarbha, Gujarat)"
    },
    {
        "id": "heavy_black_clay",
        "name": "Heavy Black Clay Soil",
        "hindi": "भारी काली चिकनी मिट्टी",
        "label": "Heavy Black Clay (भारी काली चिकनी)",
        "description": "धीमी जल निकासी, धान, सोयाबीन और गेहूं हेतु आदर्श"
    },
    {
        "id": "alluvial_loam",
        "name": "Alluvial Loam",
        "hindi": "जलोढ़ दोमट मिट्टी",
        "label": "Alluvial Loam (जलोढ़ दोमट)",
        "description": "अत्यंत उपजाऊ, धान, गेहूं, गन्ना के लिए आदर्श (Indo-Gangetic Plain, UP, Bihar, Punjab)"
    },
    {
        "id": "old_alluvial_bangar",
        "name": "Old Alluvial (Bangar)",
        "hindi": "पुरानी जलोढ़ मिट्टी (बांगर)",
        "label": "Old Alluvial - Bangar (पुरानी जलोढ़ / बांगर)",
        "description": "कंकड़ युक्त उच्च भूमि, गेहूं, सरसों और दलहन हेतु उपयुक्त"
    },
    {
        "id": "new_alluvial_khadar",
        "name": "New Alluvial (Khadar)",
        "hindi": "नवीन जलोढ़ मिट्टी (खादर)",
        "label": "New Alluvial - Khadar (नवीन जलोढ़ / खादर)",
        "description": "बाढ़ के मैदानों की ताज़ा उपजाऊ गाद, सब्जी, मक्का और धान हेतु"
    },
    {
        "id": "coastal_alluvial",
        "name": "Coastal Alluvial & Deltaic Soil",
        "hindi": "तटीय जलोढ़ एवं डेल्टाई मिट्टी",
        "label": "Coastal Alluvial (तटीय जलोढ़)",
        "description": "नदियों के डेल्टा और तटीय क्षेत्रों की मिट्टी, धान, नारियल और जूट हेतु"
    },
    {
        "id": "calcareous_alluvial",
        "name": "Calcareous Alluvial Soil",
        "hindi": "चूनायुक्त जलोढ़ मिट्टी",
        "label": "Calcareous Alluvial (चूनायुक्त जलोढ़)",
        "description": "चूने के अंश से युक्त, गन्ना, तंबाकू और दालों के लिए उत्तम (North Bihar, Eastern UP)"
    },
    {
        "id": "tarai_soil",
        "name": "Tarai Alluvial Soil",
        "hindi": "तराई जलोढ़ मिट्टी",
        "label": "Tarai Soil (तराई मिट्टी)",
        "description": "नम एवं समृद्ध जैव पदार्थ, गन्ना और धान हेतु विख्यात (Himalayan Foothills)"
    },
    {
        "id": "red_yellow_soil",
        "name": "Red & Yellow Soil",
        "hindi": "लाल और पीली मिट्टी",
        "label": "Red & Yellow Soil (लाल और पीली मिट्टी)",
        "description": "आयरन ऑक्साइड युक्त, मोटे अनाज, बाजरा, मूंगफली व दालें (Odisha, MP, Chhattisgarh)"
    },
    {
        "id": "red_sandy_loam",
        "name": "Red Sandy Loam",
        "hindi": "लाल बलुई दोमट मिट्टी",
        "label": "Red Sandy Loam (लाल बलुई दोमट)",
        "description": "शीघ्र सूखने वाली, मूंगफली, अरंडी और बाजरा हेतु उपयुक्त"
    },
    {
        "id": "laterite_soil",
        "name": "Laterite Soil",
        "hindi": "लैटेराइट मिट्टी",
        "label": "Laterite Soil (लैटेराइट मिट्टी)",
        "description": "भारी वर्षा वाले क्षेत्रों की निक्षालित मिट्टी, काजू, चाय, कॉफी व रबड़ हेतु"
    },
    {
        "id": "arid_desert_sand",
        "name": "Arid & Desert Sand",
        "hindi": "बलुई / मरुस्थलीय मिट्टी",
        "label": "Arid & Desert Sand (बलुई / मरुस्थलीय)",
        "description": "कम नमी, बाजरा, ग्वार, मोठ और मूंग के लिए अनुकूल (Western Rajasthan, Haryana)"
    },
    {
        "id": "sandy_loam",
        "name": "Sandy Loam (Balu Doomat)",
        "hindi": "बलुई दोमट मिट्टी",
        "label": "Sandy Loam (बलुई दोमट मिट्टी)",
        "description": "हल्की जल निकासी वाली, आलू, मूंगफली, मक्का व सब्जियों हेतु"
    },
    {
        "id": "clayey_loam",
        "name": "Clayey Loam",
        "hindi": "चिकनी दोमट मिट्टी",
        "label": "Clayey Loam (चिकनी दोमट मिट्टी)",
        "description": "जलभराव सहन करने वाली, धान (चावल) और गेहूं की खेती हेतु उत्तम"
    },
    {
        "id": "silt_loam",
        "name": "Silt Loam",
        "hindi": "गाद दोमट मिट्टी",
        "label": "Silt Loam (गाद दोमट मिट्टी)",
        "description": "नदी घाटी की महीन गाद, गेहूं, सरसों व तिलहन हेतु"
    },
    {
        "id": "mountain_forest_soil",
        "name": "Mountain & Forest Soil",
        "hindi": "पर्वतीय एवं वन मिट्टी",
        "label": "Mountain & Forest Soil (पर्वतीय एवं वन मिट्टी)",
        "description": "जीवांश (ह्यूमस) से भरपूर, सेब, बागवानी, चाय और मसाले (Himalayas, Western Ghats)"
    },
    {
        "id": "saline_alkaline_usar",
        "name": "Saline & Alkaline Soil (Usar/Kallar)",
        "hindi": "लवणीय एवं क्षारीय मिट्टी (ऊसर/रेह)",
        "label": "Saline & Alkaline (लवणीय / ऊसर मिट्टी)",
        "description": "जिप्सम सुधार उपरांत धान, बेर और जौ के लिए उपयुक्त"
    },
    {
        "id": "peaty_marshy_soil",
        "name": "Peaty & Marshy Soil (Kari)",
        "hindi": "दलदली एवं जैविक मिट्टी",
        "label": "Peaty & Marshy (दलदली एवं जैविक मिट्टी)",
        "description": "उच्च कार्बनिक पदार्थ युक्त, तटीय धान और दलहनी खेती (Kerala, Sundarbans)"
    },
    {
        "id": "gravelly_skeletal",
        "name": "Gravelly & Skeletal Soil",
        "hindi": "कंकरीली / पथरीली मिट्टी",
        "label": "Gravelly & Skeletal (कंकरीली / पथरीली)",
        "description": "उथली पथरीली मिट्टी, चारागाह और झाड़ीदार फलदार वृक्षों हेतु"
    },
    {
        "id": "other_custom",
        "name": "Other Local Soil Type",
        "hindi": "अन्य स्थानीय मिट्टी",
        "label": "Other Local Soil (अन्य स्थानीय मिट्टी)",
        "description": "क्षेत्रीय या स्थानीय मिश्रित मिट्टी"
    }
]


def get_all_mandi_crops() -> List[Dict[str, Any]]:
    """Return all Indian crops & Mandi commodities with bilingual translations, season, and benchmark rates."""
    return ALL_MANDI_CROPS


def get_all_soil_types() -> List[Dict[str, Any]]:
    """Return 20+ Indian soil classifications with English and Hindi names and agronomic properties."""
    return ALL_SOIL_TYPES

