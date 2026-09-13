from fastapi import APIRouter, Query, Depends
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from schemas.contract import Envelope, EnvelopeMeta
from services.agmarknet_client import (
    get_mandi_price, 
    sync_and_get_daily_mandi_rates, 
    get_official_msp_benchmarks,
    get_regional_mandi_summary,
    BENCHMARK_MANDI_PRICES,
    get_all_mandi_crops,
    get_all_soil_types
)

router = APIRouter()

@router.get("/price", response_model=Envelope)
async def get_crop_mandi_price(
    crop: str = Query("wheat", description="Crop name (e.g. wheat, soybean, mustard)"),
    state: str = Query("Madhya Pradesh", description="State name"),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch spot mandi price for a specific crop and state from daily PostgreSQL database cache.
    """
    data = await get_mandi_price(crop, state, db=db)
    return Envelope(
        success=True,
        data=data,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

@router.get("/arrivals", response_model=Envelope)
async def get_mandi_arrivals(
    state: str = Query("Madhya Pradesh", description="State name"),
    search: Optional[str] = Query(None, description="Search by mandi, district, or crop"),
    force_refresh: bool = Query(False, description="Force re-querying Agmarknet today feed"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get multi-crop APMC arrivals and market prices across regional mandis.
    Persists to `mandi_rates` database for the current date, refreshing daily with guaranteed yesterday fallback.
    """
    arrivals = await sync_and_get_daily_mandi_rates(db, state=state, search=search, force_refresh=force_refresh)

    return Envelope(
        success=True,
        data=arrivals,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

@router.get("/benchmarks", response_model=Envelope)
async def get_msp_benchmarks():
    """
    Return official Government of India Minimum Support Price (MSP) benchmarks.
    """
    benchmarks = get_official_msp_benchmarks()
    return Envelope(
        success=True,
        data=benchmarks,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

@router.get("/regional-summary", response_model=Envelope)
async def get_regional_mandi_summary_endpoint(
    state: str = Query("Madhya Pradesh", description="State name"),
    force_refresh: bool = Query(False, description="Force re-querying Agmarknet today feed"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get regional commodity spot rates & MSP benchmarks dynamically adapted to the selected Indian state/region.
    """
    data = await get_regional_mandi_summary(db, state=state, force_refresh=force_refresh)
    return Envelope(
        success=True,
        data=data,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

@router.get("/crops", response_model=Envelope)
async def get_mandi_crops():
    """
    Return all Indian agricultural crops & mandi commodities with bilingual (English/Hindi) names,
    category, season, icon, and benchmark MSP rate.
    """
    crops = get_all_mandi_crops()
    return Envelope(
        success=True,
        data=crops,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

@router.get("/soil-types", response_model=Envelope)
async def get_soil_types():
    """
    Return comprehensive Indian ICAR/PMFBY soil classifications with English and Hindi names,
    display label, and agronomic characteristics.
    """
    soil_types = get_all_soil_types()
    return Envelope(
        success=True,
        data=soil_types,
        meta=EnvelopeMeta(request_id=uuid.uuid4(), timestamp=datetime.utcnow()),
        error=None
    )

