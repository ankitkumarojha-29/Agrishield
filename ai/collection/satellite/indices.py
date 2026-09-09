import os
import json

import numpy as np
import rasterio
from rasterio.io import MemoryFile
# ============================================================
# AGRISHIELD AI - SATELLITE INDICES
#
# Reads:
#     sentinel_raw.tif
#
# Calculates:
#     NDVI
#     NDWI
#     NDMI
#
# Produces:
#     NDVI / NDWI / NDMI GeoTIFF
#     True-color map
#     NDVI overlay
#     NDWI overlay
#     NDMI overlay
#     analysis_summary.json
# ============================================================


# ============================================================
# IMPORTABLE API (used by data_pipeline — no disk writes, no matplotlib)
# ============================================================

def _calc_index(a: np.ndarray, b: np.ndarray, valid_mask: np.ndarray) -> np.ndarray:
    """(a - b) / (a + b) with NaN for invalid/zero-denominator pixels."""
    result = np.full(a.shape, np.nan, dtype=np.float32)
    denom = a + b
    mask = valid_mask & np.isfinite(denom) & (denom != 0)
    result[mask] = (a[mask] - b[mask]) / denom[mask]
    return result


def _stats(data: np.ndarray) -> dict:
    """Return mean/min/max/std/median of finite values."""
    vals = data[np.isfinite(data)]
    if vals.size == 0:
        return {"mean": None, "min": None, "max": None, "std": None, "median": None}
    return {
        "mean":   float(np.mean(vals)),
        "min":    float(np.min(vals)),
        "max":    float(np.max(vals)),
        "std":    float(np.std(vals)),
        "median": float(np.median(vals)),
    }


def compute_indices(tif_bytes: bytes) -> dict:
    """
    Compute NDVI, NDWI, NDMI from raw Sentinel-2 TIFF bytes (in-memory).

    Args:
        tif_bytes: Raw bytes of a 6-band GeoTIFF (B02 B03 B04 B08 B11 SCL).
                   Produced by fetch_sentinel2().

    Returns:
        {
            "ndvi":  {"mean", "min", "max", "std", "median"},
            "ndwi":  {"mean", "min", "max", "std", "median"},
            "ndmi":  {"mean", "min", "max", "std", "median"},
            "ndvi_mean":  float,   # convenience flat fields for model input
            "ndvi_min":   float,
            "ndvi_max":   float,
            "ndvi_std":   float,
            "ndwi_mean":  float,
            "ndwi_min":   float,
            "ndwi_max":   float,
            "ndmi_mean":  float,
            "ndmi_min":   float,
            "ndmi_max":   float,
            "valid_pixel_pct": float,   # % pixels not masked by cloud/shadow
            "cloud_mask_applied": True,
        }

    Raises:
        RuntimeError: if TIFF doesn't have exactly 6 bands.
    """
    _BAD_SCL = np.array([0, 1, 3, 8, 9, 10, 11], dtype=np.int16)

    with MemoryFile(tif_bytes) as memfile:
        with memfile.open() as src:
            if src.count != 6:
                raise RuntimeError(
                    f"Expected 6 bands, got {src.count}."
                )
            raw = src.read()

    blue  = raw[0].astype(np.float32)
    green = raw[1].astype(np.float32)
    red   = raw[2].astype(np.float32)
    nir   = raw[3].astype(np.float32)
    swir  = raw[4].astype(np.float32)
    scl   = np.rint(raw[5]).astype(np.int16)

    bad_mask   = np.isin(scl, _BAD_SCL)
    valid_mask = ~bad_mask
    valid_pct  = float(100 * np.count_nonzero(valid_mask) / scl.size)

    ndvi = _calc_index(nir,   red,  valid_mask)   # (NIR-RED)/(NIR+RED)
    ndwi = _calc_index(green, nir,  valid_mask)   # (GREEN-NIR)/(GREEN+NIR)
    ndmi = _calc_index(nir,   swir, valid_mask)   # (NIR-SWIR)/(NIR+SWIR)

    ndvi_s = _stats(ndvi)
    ndwi_s = _stats(ndwi)
    ndmi_s = _stats(ndmi)

    def _f(s, k):
        v = s.get(k)
        return round(v, 6) if v is not None else None

    return {
        # Nested stats (for reference / reporting)
        "ndvi": ndvi_s,
        "ndwi": ndwi_s,
        "ndmi": ndmi_s,
        # Flat convenience keys — exactly what the ML models expect
        "ndvi_mean": _f(ndvi_s, "mean"),
        "ndvi_min":  _f(ndvi_s, "min"),
        "ndvi_max":  _f(ndvi_s, "max"),
        "ndvi_std":  _f(ndvi_s, "std"),
        "ndwi_mean": _f(ndwi_s, "mean"),
        "ndwi_min":  _f(ndwi_s, "min"),
        "ndwi_max":  _f(ndwi_s, "max"),
        "ndmi_mean": _f(ndmi_s, "mean"),
        "ndmi_min":  _f(ndmi_s, "min"),
        "ndmi_max":  _f(ndmi_s, "max"),
        "valid_pixel_pct": round(valid_pct, 2),
        "cloud_mask_applied": True,
    }


# ============================================================
# SCRIPT ENTRYPOINT (python indices.py — standalone use only)
# When imported as a module, none of the code below runs.
# ============================================================

