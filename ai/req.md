# AgriShield AI — Requirements for Backend Team (req.md)

## Owner: AI Developer  
## Target: Integration + App Owner (Backend)  
## Status: **LIVE PIPELINE ACTIVE** — Satellite ✅ Weather ✅ Soil ⚠️ (fallback)

> Last updated: 2026-08-16  
> The AI service is now fully live for yield-prediction and risk-score. The two required
> request field additions (`boundary_coordinates`, `centroid_lat`, `centroid_lon`) are
> **already implemented on the AI side**. Backend just needs to send them.

---

## PRIORITY: BLOCKING — These 3 Fields Must Be Added to Backend Calls

The AI service **requires** `boundary_coordinates`, `centroid_lat`, and `centroid_lon`
in the body of every `/v1/yield-prediction` and `/v1/risk-score` call.
Without them, the AI cannot fetch real satellite or weather data and will use Indian-average
constants for every farm — making predictions identical regardless of actual field conditions.

---

## 1. POST /v1/yield-prediction — Required Payload

### Current backend payload sent (INSUFFICIENT):
```json
{
  "crop": "wheat",
  "area_ha": 1.5,
  "rainfall": 80,
  "temp_mean": 25
}
```

### Required payload (ADD these 3 fields):
```json
{
  "crop": "wheat",
  "area_ha": 1.5,
  "sowing_date": "2026-06-01",
  "boundary_coordinates": [
    [76.8601, 23.0748],
    [76.8712, 23.0748],
    [76.8712, 23.0831],
    [76.8601, 23.0831],
    [76.8601, 23.0748]
  ],
  "centroid_lat": 23.0789,
  "centroid_lon": 76.8656,
  "rainfall": 80,
  "temp_mean": 25,
  "humidity": 60,
  "soil_ph": 6.5,
  "nitrogen": 50,
  "phosphorus": 25,
  "potassium": 200
}
```

All non-geometry fields remain as fallback values — the AI will prefer live satellite/weather/soil
data when available and only use backend values if the external API fails.

---

## 2. POST /v1/risk-score — Required Payload

### Current backend payload sent (INSUFFICIENT):
```json
{
  "crop": "wheat",
  "area_ha": 1.5,
  "weather": { "rainfall": 80, "temp_mean": 28, "humidity": 65 },
  "soil":    { "pH": 6.5, "N": 50, "P": 25, "K": 200 },
  "satellite": { "ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0 },
  "history": { "yield_prediction": 3000 }
}
```

### Required payload (ADD these 3 fields):
```json
{
  "crop": "wheat",
  "area_ha": 1.5,
  "boundary_coordinates": [
    [76.8601, 23.0748],
    [76.8712, 23.0748],
    [76.8712, 23.0831],
    [76.8601, 23.0831],
    [76.8601, 23.0748]
  ],
  "centroid_lat": 23.0789,
  "centroid_lon": 76.8656,
  "weather": { "rainfall": 80, "temp_mean": 28, "humidity": 65 },
  "soil":    { "pH": 6.5, "N": 50, "P": 25, "K": 200 },
  "satellite": { "ndvi_mean": 0.5, "ndwi_mean": 0.0, "ndmi_mean": 0.0 },
  "history": { "yield_prediction": 3000 }
}
```

---

## 3. boundary_coordinates Format Specification

```
Type:    JSON array of [longitude, latitude] pairs — GeoJSON order (lon FIRST)
Format:  [[lon, lat], [lon, lat], ...]
Ring:    MUST be closed (first point == last point)
Min:     4 unique points + 1 closing = 5 elements
CRS:     WGS 84 (EPSG:4326) — same as PostGIS default
```

**Example** (real field near Bhopal used in last test):
```json
[
  [76.86255555555555, 23.075],
  [76.86388888888888, 23.07522222222222],
  [76.86391666666665, 23.074305555555554],
  [76.8628611111111,  23.07425],
  [76.86255555555555, 23.075]
]
```

---

## 4. Where to Extract These Fields in Backend Code

### File: `backend/services/ai_client.py`

Update `get_yield_prediction()` method signature (~line 97):
```python
async def get_yield_prediction(
    self,
    crop: str,
    area_ha: float,
    weather: dict,
    soil: dict,
    satellite: dict,
    boundary_coordinates: list = None,     # ADD
    centroid_lat: float = None,            # ADD
    centroid_lon: float = None,            # ADD
) -> Dict[str, Any]:
    payload = {
        "crop": crop,
        "area_ha": area_ha,
        # ... existing weather/soil/satellite fields ...
        "boundary_coordinates": boundary_coordinates,  # ADD
        "centroid_lat": centroid_lat,                  # ADD
        "centroid_lon": centroid_lon,                  # ADD
    }
```

Apply same change to `get_risk_score()` (~line 134).

### File: `backend/api/farms.py`

In `farm_yield_predict()` (~line 184) and `farm_risk_score()` (~line 207):
```python
from geoalchemy2.shape import to_shape

# Extract geometry from the farm boundary (same pattern as farm_weather_current)
boundary_coords = None
centroid_lat = None
centroid_lon = None
try:
    shape = to_shape(farm.boundary)
    centroid_lat = shape.centroid.y
    centroid_lon = shape.centroid.x
    boundary_coords = [[lon, lat] for lon, lat in shape.exterior.coords]
except Exception:
    pass  # AI will handle missing coords gracefully — no crash

result = await ai.get_yield_prediction(
    crop=crop,
    area_ha=area_ha,
    weather={...existing...},
    soil={...existing...},
    satellite={...existing...},
    boundary_coordinates=boundary_coords,  # ADD
    centroid_lat=centroid_lat,             # ADD
    centroid_lon=centroid_lon,             # ADD
)
```

---

## 5. No OpenAPI Contract Changes Needed

`boundary_coordinates`, `centroid_lat`, and `centroid_lon` are **additional optional fields**
in the AI service's internal request body — they are NOT in `contracts/openapi.yaml` (which
defines the Backend↔App/Web contract, not the Backend↔AI internal call).

The response envelope and shapes visible to the app/web are unchanged.

---

## 6. What Happens Without These Fields

If the AI does not receive boundary coordinates:
- It **will not crash** — it returns a valid response
- `data_sources` will show `"satellite": "fallback"`, `"weather": "fallback"`
- The model runs on the hardcoded constants you sent (e.g., `rainfall=80`, `temp_mean=25`)
- Every farm gets the **same prediction** regardless of actual location/conditions
- Response includes `"warning": "No geometry provided — using backend fallback values"`

---

## 7. What Happens With These Fields (Verified in Live Test)

Last verified test run (2026-08-16):
```json
"data_sources": { "satellite": "live", "weather": "live", "soil": "fallback" },
"yield_value": 4.5,
"confidence": 0.926,
"inference_ms": 89
```

- **Satellite**: ✅ Real NDVI/NDWI/NDMI from Copernicus Sentinel-2 (Copernicus credentials in `.env`)
- **Weather**: ✅ Real temperature, rainfall, humidity from OpenWeatherMap
- **Soil**: ⚠️ Currently falling back — `openepi-client` not installed in the AI venv.
  Will be fixed with `pip install openepi-client`.

---

## 8. Known AI-Side Issues (For Backend Awareness)

| Issue | Impact on Backend | Fix Owner |
|---|---|---|
| Yield output `4.5 kg/ha` (should be ~3000 kg/ha) | Backend may show wrong premium estimates | AI Developer — retrain model |
| Risk score always `1.0 critical` | Insurance logic may block all policies | AI Developer — retrain risk model |
| Soil OCR returns fallback (`easyocr` missing) | Soil data from reports is hardcoded | AI Developer — `pip install easyocr` |
| Crop-health & damage on mock | Detection features not real yet | AI Developer — wire `.pt` models |

> None of these block backend integration — API shapes and fallback behaviour are stable.
> Backend can integrate and display `data_sources` + `warnings` to the user as-is.

---

## 9. Display Recommendations for Web / App

The AI response always includes:
- `model_version` — show as tooltip or badge (e.g., "AI: yield-v1.0.0")
- `confidence` — show as % (e.g., "92.6% confidence")
- `low_confidence: true` — show a warning banner ("Low confidence — result may be inaccurate")
- `data_sources` — optionally show "Live satellite data used" vs "Estimated data"
- `warnings[]` — surface as info alerts to the farmer or insurer

Per `AGENTS.md`: every AI result on screen must show confidence % and model_version/timestamp,
and hackathon insurance decisions must be labeled **"Demo / AI-assisted"**.

---

## 10. Integration Checklist

- [ ] `backend/services/ai_client.py` — add `boundary_coordinates`, `centroid_lat`, `centroid_lon` to `get_yield_prediction()` and `get_risk_score()` signatures and payloads
- [ ] `backend/api/farms.py` — extract geometry from `farm.boundary` using `to_shape()` and pass to ai_client calls
- [ ] Verify `farm.boundary` is populated in DB (PostGIS polygon stored after `/farms/{id}/validate-boundary`)
- [ ] Test with a real farm polygon — confirm AI returns `"satellite": "live"` and `"weather": "live"` in `data_sources`
- [ ] Display `warnings[]` from AI response in UI (info-level, not error)
- [ ] Display `confidence` and `model_version` for every AI result in UI
