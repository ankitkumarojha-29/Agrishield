import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from geoalchemy2.shape import to_shape

from db.models import Farm, User, UserRole, Notification, NotificationType
from services.weather_client import get_current_weather
from services.satellite_service import get_live_satellite_indices

logger = logging.getLogger(__name__)


async def notify_admins(
    db: AsyncSession,
    title: str,
    message: str,
    notif_type: NotificationType = NotificationType.SYSTEM_ALERT,
    ref_id: Optional[uuid.UUID] = None
) -> int:
    """
    Dispatches a system/administrative alert to all active/approved administrators.
    Used for: new farmer registration, new admin approval requests, new claim filed, regional hazards.
    """
    try:
        stmt = select(User).where(User.role == UserRole.ADMIN, User.is_approved == True)
        res = await db.execute(stmt)
        admins = res.scalars().all()
        if not admins:
            return 0

        full_msg = f"{title}: {message}" if title not in message else message
        created_count = 0
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                type=notif_type,
                message=full_msg,
                ref_id=ref_id,
                read=False,
                created_at=datetime.utcnow()
            )
            db.add(notif)
            created_count += 1

        await db.commit()
        return created_count
    except Exception as e:
        logger.error("Failed to notify admins: %s", e)
        return 0


async def evaluate_farm_and_notify(
    farm: Farm, 
    db: AsyncSession,
    force_check: bool = False
) -> Optional[Notification]:
    """
    Evaluates real-time agro-meteorological, soil moisture, and Sentinel-2 satellite telemetry
    for a single registered farm. Automatically generates high-priority actionable alerts
    for the farmer owning this farm.
    
    Hazards covered:
    1. Cyclone & Severe Storm (>45 km/h winds, torrential gusts)
    2. Flood & Inundation (>15mm precipitation in 48h, thunderstorm codes)
    3. Satellite Vegetation Index Drop (NDVI fall < 0.38, crop canopy stress)
    4. Irrigation Deficit / Drought (soil moisture below critical threshold)
    5. Heat Stress (>38°C extreme ambient heat)
    6. Frost Hazard (≤4°C freezing threat for Rabi crops)
    7. Fungal Spore & Rust Outbreak (relative humidity >80% with fog)
    8. Normal Health Confirmation (when force_check is requested)
    """
    if not farm.user_id:
        return None

    # Determine farm centroid coordinates
    lat, lon = 18.5204, 73.8567  # Default fallback centroid
    if farm.boundary is not None:
        try:
            shape = to_shape(farm.boundary)
            centroid = shape.centroid
            lat, lon = centroid.y, centroid.x
        except Exception as e:
            logger.warning("Centroid calculation fallback for farm %s: %s", farm.id, e)

    crop = farm.crop or "Wheat"
    soil_type = getattr(farm, "soil_type", "Medium Black (Loam)")
    irrigation_type = getattr(farm, "irrigation_type", "Tubewell")

    # 1. Fetch real-time weather & irrigation telemetry
    weather_data = None
    try:
        weather_data = await get_current_weather(
            lat, lon, 
            crop=crop, 
            soil_type=soil_type, 
            irrigation_type=irrigation_type
        )
    except Exception as e:
        logger.warning("Error fetching weather for farm %s: %s", farm.id, e)

    # 2. Fetch live Sentinel-2 satellite indices
    satellite_data = None
    try:
        satellite_data = await get_live_satellite_indices(lat, lon, crop=crop)
    except Exception as e:
        logger.warning("Error fetching satellite telemetry for farm %s: %s", farm.id, e)

    if not weather_data and not satellite_data:
        return None

    weather_data = weather_data or {}
    satellite_data = satellite_data or {}

    decision = weather_data.get("irrigation_decision", {})
    status = decision.get("status", "hold")
    soil_moisture = decision.get("soil_moisture_pct", 42.0)
    rain_48h = decision.get("rain_next_48h_mm", 0.0)
    temp = weather_data.get("temp", 28.0)
    wind_speed = weather_data.get("wind_speed", 12.0)
    humidity = weather_data.get("humidity", 55.0)
    weather_code = weather_data.get("weather_code", 0)
    run_hours = decision.get("run_hours", 2.0)

    ndvi_val = satellite_data.get("ndvi_mean", 0.65)
    is_unsown = (crop or "").strip().lower() in ("unsown", "fallow", "none", "", "empty")

    alert_title = ""
    alert_message = ""
    notif_type = NotificationType.WEATHER_ALERT

    # EVALUATE REAL-LIFE HAZARDS (Ordered by urgency)

    # A) Cyclone & Extreme Storm Threat
    if wind_speed >= 45.0 or weather_code in (96, 99):
        alert_title = "🌀 चक्रवात व भीषण आंधी चेतावनी (Cyclone & Storm Warning)"
        alert_message = (
            f"आपके खेत '{farm.name}' ({crop}) क्षेत्र में {wind_speed} km/h की रफ्तार से चक्रवाती हवाएं और आंधी चलने की संभावना है। "
            f"फसलें गिरने (lodging) से बचाने के लिए सिंचाई तुरंत रोकें, दवा छिड़काव स्थगित रखें और कटी हुई उपज को तिरपाल से सुरक्षित ढकें।"
        )
    # B) Flood & Heavy Rain Inundation
    elif rain_48h >= 15.0 or weather_code in (65, 82, 95):
        alert_title = "⚠️ बाढ़ व जलभराव चेतावनी (Flood & Inundation Alert)"
        alert_message = (
            f"आगामी 48 घंटों में आपके खेत '{farm.name}' में {rain_48h}mm भारी बारिश का पूर्वानुमान है। "
            f"सिंचाई मोटर तुरंत बंद रखें और मेड़ों से पानी निकासी की नालियां खुली रखें ताकि खेत में जलभराव से जड़ें न गलें।"
        )
    # C) Satellite NDVI / Vegetation Index Drop (Crop Health Deterioration)
    elif not is_unsown and ndvi_val < 0.38:
        alert_title = "🛰️ फसल स्वास्थ्य गिरावट चेतावनी (Satellite NDVI Drop Alert)"
        alert_message = (
            f"यूरोपीय उपग्रह (Sentinel-2) निगरानी अनुसार आपके खेत '{farm.name}' ({crop}) का वनस्पति सूचकांक (NDVI) गिरकर {ndvi_val} दर्ज हुआ है। "
            f"फसल में पीलापन या पोषण की कमी का संकेत है। खेत का निरीक्षण करें और नैनो यूरिया (4ml/L) अथवा सूक्ष्म पोषक तत्वों (Zinc/Sulphur) का पर्णीय छिड़काव करें।"
        )
    # D) Extreme Heat Stress / Heat Wave
    elif temp >= 38.0:
        alert_title = "🔥 भीषण गर्मी व लू चेतावनी (Heat Stress Alert)"
        alert_message = (
            f"आपके खेत '{farm.name}' पर तापमान {temp}°C दर्ज हुआ है। अत्यधिक ताप से फूल व फलियां झड़ने की आशंका है। "
            f"फसल को जल-तनाव से बचाने के लिए आज शाम 5 बजे के बाद हल्की फव्वारा या ड्रिप सिंचाई अवश्य करें।"
        )
    # E) Frost / Cold Freeze Hazard (Winter Rabi Crops)
    elif temp <= 4.0:
        alert_title = "❄️ पाला व शीत लहर चेतावनी (Frost Risk Alert)"
        alert_message = (
            f"रात में तापमान {temp}°C तक गिरने से खेत '{farm.name}' ({crop}) पर पाला पड़ने का गंभीर खतरा है। "
            f"पाले से फसल को बचाने के लिए आज शाम हल्की सिंचाई करें और मेड़ों की उत्तरी दिशा में धुआं करें।"
        )
    # F) Soil Moisture Deficit / Irrigation Needed
    elif status == "water" or soil_moisture <= 25.0:
        alert_title = f"💧 {crop} में सिंचाई की तत्काल आवश्यकता (Irrigation Needed)"
        alert_message = (
            f"खेत '{farm.name}' में जड़ों के पास मिट्टी की नमी घटकर {soil_moisture}% रह गई है। "
            f"पैदावार सुरक्षित रखने के लिए आज शाम 4:30 बजे से {run_hours} घंटे के लिए मोटर चलाएं।"
        )
        notif_type = NotificationType.WEATHER_ALERT
    # G) Yellow Rust / Fungal Blight Risk (High Humidity + Dense Fog)
    elif humidity >= 80.0 and weather_code in (45, 48):
        alert_title = "🦠 फफूंद व कीट प्रकोप चेतावनी (Disease Risk Alert)"
        alert_message = (
            f"सुबह अत्यधिक कोहरा और {humidity}% आर्द्रता खेत '{farm.name}' ({crop}) में फंगल संक्रमण (रतुआ/झुलसा) के लिए अनुकूल है। "
            f"पत्तियों की निचली सतह की जांच करें और आवश्यकतानुसार प्रोपिकोनाज़ोल (Propiconazole 25% EC) @ 1ml/L का छिड़काव करें।"
        )
    # H) High Winds (>32 km/h - Hold Spraying)
    elif wind_speed >= 32.0:
        alert_title = "💨 तेज हवा चेतावनी (High Wind Warning)"
        alert_message = (
            f"खेत '{farm.name}' क्षेत्र में {wind_speed} km/h हवा की गति दर्ज हुई है। कीटनाशक व खाद का छिड़काव न करें क्योंकि तेज हवा में दवा उड़ जाएगी।"
        )
    # I) Reassurance Report when force_check is requested and farm is healthy
    elif force_check:
        alert_title = f"🌾 {farm.name} - 24x7 फसल व मौसम रिपोर्ट"
        alert_message = (
            f"खेत '{farm.name}' ({crop}) में मिट्टी की नमी {soil_moisture}% और उपग्रह NDVI ({ndvi_val}) संतुलित है। "
            f"अगले 48 घंटे में कोई आपदा खतरा नहीं है और पानी देने की आवश्यकता नहीं है। बिजली व पानी की बचत करें।"
        )
        notif_type = NotificationType.WEATHER_ALERT
    else:
        return None

    # Deduplication: Check if an identical alert title was generated for this farm in the last 12 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=12)
    stmt = (
        select(Notification)
        .where(
            Notification.user_id == farm.user_id,
            Notification.ref_id == farm.id,
            Notification.created_at >= cutoff_time
        )
        .order_by(Notification.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    existing_notif = res.scalar_one_or_none()

    if existing_notif:
        if alert_title in existing_notif.message:
            logger.debug("Skipping duplicate alert for farm %s: %s", farm.id, alert_title)
            return existing_notif

    # Automatically persist notification in database for this farmer
    full_message = f"{alert_title}: {alert_message}"
    new_notif = Notification(
        user_id=farm.user_id,
        type=notif_type,
        message=full_message,
        ref_id=farm.id,
        read=False,
        created_at=datetime.utcnow()
    )
    db.add(new_notif)
    await db.commit()
    await db.refresh(new_notif)

    logger.info("Automated alert generated for farmer %s on farm %s: %s", farm.user_id, farm.name, alert_title)
    return new_notif


async def auto_monitor_farmer_farms(
    user_id: uuid.UUID, 
    db: AsyncSession,
    force_recheck: bool = False
) -> List[Notification]:
    """
    Scans all registered farms for a specific farmer and automatically generates
    real-time alerts for flood, cyclone, vegetation index fall, drought/irrigation, and pests.
    """
    stmt = select(Farm).where(Farm.user_id == user_id)
    res = await db.execute(stmt)
    farms = res.scalars().all()

    generated_alerts = []
    for farm in farms:
        notif = await evaluate_farm_and_notify(farm, db, force_check=force_recheck)
        if notif:
            generated_alerts.append(notif)

    return generated_alerts


async def auto_monitor_all_registered_farms(db: AsyncSession) -> int:
    """
    Background worker: Periodically evaluates every registered farm across all farmers
    and generates automated notifications wherever hazards or needs are detected.
    """
    stmt = select(Farm)
    res = await db.execute(stmt)
    all_farms = res.scalars().all()

    created_count = 0
    for farm in all_farms:
        try:
            notif = await evaluate_farm_and_notify(farm, db, force_check=False)
            if notif:
                created_count += 1
        except Exception as e:
            logger.error("Error in automated monitor for farm %s: %s", farm.id, e)

    return created_count
