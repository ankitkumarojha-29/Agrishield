from shapely.geometry import Polygon
import pyproj
from shapely.ops import transform
from schemas.contract import GeoPolygon, PolygonValidationResult, PolygonValidationResultReason

def validate_farm_boundary(geo_polygon: GeoPolygon) -> PolygonValidationResult:
    if geo_polygon.type != "Polygon" or not geo_polygon.coordinates:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.TOO_FEW_VERTICES, area_m2=0.0)
    
    ring = geo_polygon.coordinates[0]
    
    if len(ring) < 4:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.TOO_FEW_VERTICES, area_m2=0.0)
        
    if ring[0] != ring[-1]:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.NOT_CLOSED, area_m2=0.0)
        
    try:
        poly = Polygon(ring)
    except ValueError:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.TOO_FEW_VERTICES, area_m2=0.0)
        
    if not poly.is_valid:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.SELF_INTERSECTING, area_m2=0.0)
        
    # Calculate true geodesic area in square meters on WGS84 ellipsoid
    geod = pyproj.Geod(ellps="WGS84")
    area = abs(geod.geometry_area_perimeter(poly)[0])
    
    # Sensible defaults for area: 100 sqm to 100,000,000 sqm (10,000 Ha) for hackathon demo
    if area < 100:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.AREA_TOO_SMALL, area_m2=area)
    if area > 100_000_000:
        return PolygonValidationResult(valid=False, reason=PolygonValidationResultReason.AREA_TOO_LARGE, area_m2=area)
        
    return PolygonValidationResult(valid=True, reason=None, area_m2=area)
