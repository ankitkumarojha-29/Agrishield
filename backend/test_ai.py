import asyncio
import httpx

minimal_jpeg = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x03\x02\x02\x02\x02\x02\x03\x02\x02\x02\x03\x03\x03\x03\x04\x06\x04\x04\x04\x04\x04\x08\x06\x06\x05\x06\t\x08\n\n\t\x08\t\t\n\x0c\x0f\x0c\n\x0b\x0e\x0b\t\t\r\x11\r\x0e\x0f\x10\x10\x11\x10\n\x0c\x12\x13\x12\x10\x13\x0f\x10\x10\x10\xff\xc9\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xcc\x00\x06\x00\x10\x10\x05\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\xcf \xff\xd9'

async def main():
    base_url = "http://localhost:8001"
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. crop health
        print("--- Crop Health ---")
        try:
            r = await client.post(
                f"{base_url}/v1/crop-health/",
                files={"image": ("image.jpg", minimal_jpeg, "image/jpeg")},
                data={"crop": "wheat", "growth_stage": "vegetative"}
            )
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

        # 2. damage assessment
        print("\n--- Damage Assessment ---")
        try:
            r = await client.post(
                f"{base_url}/v1/damage-assessment/",
                files={"images": ("image.jpg", minimal_jpeg, "image/jpeg")},
                data={"crop": "wheat", "event_type": "flood"}
            )
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

        # 3. yield prediction
        print("\n--- Yield Prediction ---")
        try:
            payload = {
                "crop": "wheat", "area_ha": 10.0, "sowing_date": "2026-06-01",
                "rainfall": 80, "rainfall_7d": 20, "rainfall_30d": 80,
                "temp_mean": 25, "temp_max": 32, "temp_min": 18,
                "humidity": 60, "wind_speed": 10,
                "soil_ph": 6.5, "nitrogen": 50, "phosphorus": 25, "potassium": 200, "organic_carbon": 0.5,
                "ndvi_mean": 0.5, "ndvi_min": 0.3, "ndvi_max": 0.7, "ndvi_std": 0.1,
                "ndwi_mean": 0.0, "ndwi_min": -0.2, "ndwi_max": 0.2,
                "ndmi_mean": 0.0, "ndmi_min": -0.2, "ndmi_max": 0.2,
                "boundary_coordinates": [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]],
                "centroid_lat": 0.5, "centroid_lon": 0.5
            }
            r = await client.post(f"{base_url}/v1/yield-prediction/", json=payload)
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

        # 4. risk score
        print("\n--- Risk Score ---")
        try:
            payload = {
                "crop": "wheat", "area_ha": 10.0,
                "weather": {"rainfall": 100, "temp_mean": 25},
                "soil": {"N": 50, "P": 20, "K": 100, "pH": 6.5},
                "satellite": {"ndvi_mean": 0.6},
                "history": {"past_claims": 0},
                "boundary_coordinates": [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]],
                "centroid_lat": 0.5, "centroid_lon": 0.5
            }
            r = await client.post(f"{base_url}/v1/risk-score/", json=payload)
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

        # 5. soil ocr
        print("\n--- Soil OCR ---")
        try:
            r = await client.post(
                f"{base_url}/v1/soil-ocr/",
                files={"file": ("report.pdf", b"dummy pdf bytes", "application/pdf")}
            )
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

        # 6. advisory
        print("\n--- Advisory ---")
        try:
            ctx = {"crop": "wheat", "soil": {"N": 50}, "weather": {"rainfall": 100}}
            r = await client.post(f"{base_url}/v1/advisory/", json=ctx)
            print("Status:", r.status_code)
            print("Output:", r.text)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
