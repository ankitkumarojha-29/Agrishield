import os
import json
import requests

import rasterio
from rasterio.io import MemoryFile
from dotenv import load_dotenv


# ============================================================
# AGRISHIELD AI - SENTINEL-2 DATA COLLECTOR
#
# Reads:
#     ai/data/processed/farm/farm.json
#
# Downloads:
#     B02 = Blue
#     B03 = Green
#     B04 = Red
#     B08 = NIR
#     B11 = SWIR
#     SCL = Scene Classification
#
# Output:
#     ai/data/processed/satellite/output/sentinel_raw.tif
# ============================================================


# ============================================================
# IMPORTABLE API (used by data_pipeline — no disk writes)
# ============================================================

_EVALSCRIPT = """
//VERSION=3
function setup() {
    return {
        input: [{
            bands: ["B02", "B03", "B04", "B08", "B11", "SCL"],
            units: "DN"
        }],
        output: {
            bands: 6,
            sampleType: SampleType.FLOAT32
        }
    };
}

function evaluatePixel(sample) {
    return [
        sample.B02,
        sample.B03,
        sample.B04,
        sample.B08,
        sample.B11,
        sample.SCL
    ];
}
"""

_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)

_PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1"


def _get_copernicus_token(client_id: str, client_secret: str) -> str:
    """Exchange client credentials for an access token."""
    response = requests.post(
        _TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=10,
    )

    response.raise_for_status()

    try:
        return response.json()["access_token"]
    except (ValueError, KeyError) as exc:
        raise RuntimeError(
            "Copernicus authentication succeeded, but no access token "
            "was returned."
        ) from exc


def fetch_sentinel2(
    geometry: dict,
    from_date: str,
    to_date: str,
    width: int = 700,
    height: int = 700,
) -> bytes:
    """
    Fetch Sentinel-2 L2A imagery for a farm polygon in-memory.

    Args:
        geometry: GeoJSON Polygon dict
            {"type": "Polygon", "coordinates": [...]}
        from_date: ISO datetime string, e.g. "2026-07-01T00:00:00Z"
        to_date: ISO datetime string, e.g. "2026-08-15T23:59:59Z"
        width: Output raster width in pixels.
        height: Output raster height in pixels.

    Returns:
        Raw TIFF bytes (6 bands: B02, B03, B04, B08, B11, SCL).

    Raises:
        RuntimeError: If credentials are missing or the API call fails.
    """
    base_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..")
    )
    load_dotenv(os.path.join(base_dir, ".env"))

    client_id = os.getenv("COPERNICUS_CLIENT_ID")
    client_secret = os.getenv("COPERNICUS_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise RuntimeError(
            "COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET "
            "missing from ai/.env"
        )

    token = _get_copernicus_token(client_id, client_secret)

    request_body = {
        "input": {
            "bounds": {
                "properties": {
                    "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                },
                "geometry": geometry,
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": from_date,
                            "to": to_date,
                        },
                        "maxCloudCoverage": 80,
                        "mosaickingOrder": "leastCC",
                    },
                    "processing": {
                        "harmonizeValues": "true"
                    },
                }
            ],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [
                {
                    "identifier": "default",
                    "format": {"type": "image/tiff"},
                }
            ],
        },
        "evalscript": _EVALSCRIPT,
    }

    response = requests.post(
        _PROCESS_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "image/tiff",
        },
        json=request_body,
        timeout=18,
    )

    if response.status_code != 200:
        try:
            detail = response.json()
        except ValueError:
            detail = response.text

        raise RuntimeError(
            f"Copernicus API error {response.status_code}: {detail}"
        )

    tif_bytes = response.content

    try:
        with MemoryFile(tif_bytes) as memfile:
            with memfile.open() as src:
                if src.count != 6:
                    raise RuntimeError(
                        f"Expected 6 bands from Copernicus, got {src.count}."
                    )
    except Exception as exc:
        if isinstance(exc, RuntimeError):
            raise
        raise RuntimeError(
            "Copernicus returned data, but it is not a valid TIFF."
        ) from exc

    return tif_bytes


# ============================================================
# SCRIPT ENTRYPOINT
# ============================================================

