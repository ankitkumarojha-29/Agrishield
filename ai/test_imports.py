#!/usr/bin/env python
"""Test script to verify all imports work."""

import sys
import os

print(f"Python: {sys.version}")
print(f"Executable: {sys.executable}")
print(f"Path: {sys.path[:3]}")

try:
    import fastapi
    print("✓ fastapi OK")
except ImportError as e:
    print(f"✗ fastapi FAILED: {e}")

try:
    import uvicorn
    print("✓ uvicorn OK")
except ImportError as e:
    print(f"✗ uvicorn FAILED: {e}")

try:
    import pydantic
    print("✓ pydantic OK")
except ImportError as e:
    print(f"✗ pydantic FAILED: {e}")

try:
    import shapely
    print("✓ shapely OK")
except ImportError as e:
    print(f"✗ shapely FAILED: {e}")

try:
    import torch
    print("✓ torch OK")
except ImportError as e:
    print(f"✗ torch FAILED: {e}")

try:
    import sklearn
    print("✓ sklearn OK")
except ImportError as e:
    print(f"✗ sklearn FAILED: {e}")

try:
    from app.main import app
    print("✓ FastAPI app imports OK")
except ImportError as e:
    print(f"✗ FastAPI app FAILED: {e}")

print("\n=== Testing individual modules ===\n")

try:
    from collection.geometry import farm_geometry
    print("✓ farm_geometry imports OK")
except Exception as e:
    print(f"✗ farm_geometry FAILED: {e}")

try:
    from app.routes import health, crop_health
    print("✓ routes import OK")
except Exception as e:
    print(f"✗ routes FAILED: {e}")

try:
    from app.services import crop_health_service
    print("✓ services import OK")
except Exception as e:
    print(f"✗ services FAILED: {e}")

print("\nTest complete!")
