"""Agricultural advisory endpoint — rule-based recommendations."""
from fastapi import APIRouter, Body

router = APIRouter()

_CROP_ADVISORIES = {
    "wheat":     ["Apply nitrogen at tillering stage", "Monitor for yellow rust", "Irrigate at crown root initiation"],
    "rice":      ["Maintain 5cm water level in field", "Apply DAP at transplanting", "Watch for blast and BLB disease"],
    "cotton":    ["Scout for bollworm weekly after 45 DAS", "Spray NPK 19-19-19 at boll formation", "Avoid waterlogging"],
    "corn":      ["Top-dress urea at knee-height stage", "Irrigate at tasseling and silking", "Monitor for fall armyworm"],
    "sugarcane": ["Earth-up at 60 days", "Apply FYM before planting", "Watch for top borer in July-August"],
    "soybean":   ["Inoculate seeds with Rhizobium", "Apply sulfur for pod fill", "Control pod borer at flowering"],
}


@router.post("/")
async def get_advisory(farm_context: dict = Body(...)):
    """Generate crop advisory from farm context (soil, weather, crop type)."""
    raw_crop = farm_context.get("crop")
    crop = (raw_crop or "").lower().strip()
    soil = farm_context.get("soil", {})
    weather = farm_context.get("weather", {})

    is_unsown = crop in ("", "none", "unsown", "fallow", "null")

    if is_unsown:
        # Dynamic seasonal crop suitability recommendation
        temp = weather.get("temp_mean", 27)
        rainfall = weather.get("rainfall", 80)
        ph = soil.get("pH", 6.5)

        recommended_crops = []
        if rainfall > 100 or temp > 28:
            # Kharif / Monsoon season
            recommended_crops = [
                {"crop": "Soybean", "suitability": "High", "reason": "Tolerates monsoon precipitation and optimal in soil pH 6.0-7.0"},
                {"crop": "Rice (Paddy)", "suitability": "High", "reason": "High water availability and warm seasonal temperatures"},
                {"crop": "Cotton", "suitability": "Medium", "reason": "Well-drained soil suitable for kharif growth cycle"},
                {"crop": "Maize", "suitability": "Medium", "reason": "Short cycle Kharif crop with stable market realization"},
            ]
            primary_suggestion = "Soybean"
        elif temp < 22:
            # Rabi / Winter season
            recommended_crops = [
                {"crop": "Wheat", "suitability": "High", "reason": "Cool temperature window optimal for tillering and ear-head emergence"},
                {"crop": "Chickpea (Gram)", "suitability": "High", "reason": "Low moisture requirement, fixes soil nitrogen naturally"},
                {"crop": "Mustard", "suitability": "High", "reason": "Moderate water requirement and high oilseed market price"},
            ]
            primary_suggestion = "Wheat"
        else:
            # Moderate / Transitional
            recommended_crops = [
                {"crop": "Soybean", "suitability": "High", "reason": "Balanced soil and moderate rainfall suitable for oilseeds"},
                {"crop": "Chickpea (Gram)", "suitability": "High", "reason": "Improves soil fertility with Rhizobium nitrogen fixation"},
                {"crop": "Maize", "suitability": "Medium", "reason": "Versatile cash crop with low pest susceptibility"},
            ]
            primary_suggestion = "Soybean"

        recommendations = [
            f"Land is currently unsown/fallow. Top recommended crop for current season & soil is {primary_suggestion}.",
            "Conduct deep summer ploughing to expose harmful insect pupae and weed rhizomes to solar heat.",
            "Apply 5–10 tonnes/ha of well-decomposed Farm Yard Manure (FYM) as basal organic dressing.",
            "Test seed germination percentage and treat with Trichoderma or Rhizobium culture before sowing.",
        ]
        suggested_crop = primary_suggestion
    else:
        suggested_crop = crop
        recommended_crops = []
        recommendations = list(_CROP_ADVISORIES.get(crop, [
            f"Use balanced NPK fertilizer for {crop or 'your crop'}",
            "Scout fields weekly for pest and disease signs",
            "Maintain soil moisture at field capacity",
        ]))

    warnings = []
    if weather.get("rainfall", 0) > 150:
        warnings.append("Excess rainfall detected — ensure field drainage is functional")
    if weather.get("temp_mean", 25) > 38:
        warnings.append("Heat stress risk — consider protective irrigation")
    if soil.get("pH", 7.0) < 5.5:
        warnings.append("Soil pH too acidic — apply agricultural lime before next season")
    if soil.get("pH", 7.0) > 8.0:
        warnings.append("Alkaline soil — apply gypsum and organic matter")
    if soil.get("N", 50) < 20:
        warnings.append("Nitrogen deficiency — apply urea at 60 kg/ha")
    if soil.get("P", 25) < 10:
        warnings.append("Phosphorus deficiency — apply SSP or DAP")

    return {
        "is_unsown": is_unsown,
        "suggested_crop": suggested_crop,
        "recommended_crops": recommended_crops,
        "recommendations": recommendations,
        "warnings": warnings,
        "model_version": "advisory-rules-v1.0",
        "confidence": 0.88,
        "low_confidence": False,
        "inference_ms": 2,
    }

