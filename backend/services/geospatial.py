"""Fetch Census TIGER tract boundaries and compute centroids."""
import httpx
import geopandas as gpd
from io import BytesIO
from cache.file_cache import cache_get, cache_set

TIGER_BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer"
# Layer 6 = Census Tracts, Layer 8 = Census Block Groups (wrong)
TRACT_LAYER = 6


async def fetch_tract_boundaries(state_fips: str, county_fips: str) -> gpd.GeoDataFrame:
    """Return GeoDataFrame with tract polygons + GEOID."""
    key = f"tiger:{state_fips}:{county_fips}"
    cached = cache_get(key)
    if cached is not None:
        import json
        return gpd.GeoDataFrame.from_features(cached["features"], crs="EPSG:4326")

    where = f"STATE='{state_fips}' AND COUNTY='{county_fips}'"
    params = {
        "where": where,
        "outFields": "GEOID,TRACT,STATE,COUNTY,NAME",
        "outSR": "4326",
        "f": "geojson",
        "returnGeometry": "true",
    }

    url = f"{TIGER_BASE}/{TRACT_LAYER}/query"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()

    geojson = r.json()
    cache_set(key, geojson)
    return gpd.GeoDataFrame.from_features(geojson["features"], crs="EPSG:4326")


async def fetch_county_boundary(fips: str) -> dict:
    """Return county outline as GeoJSON FeatureCollection."""
    key = f"tiger:county:{fips}"
    cached = cache_get(key)
    if cached is not None:
        return cached

    state_fips = fips[:2]
    county_fips = fips[2:]
    where = f"STATE='{state_fips}' AND COUNTY='{county_fips}'"
    # County layer = 82 (84 = Zip Code Tabulation Areas)
    url = f"{TIGER_BASE}/82/query"
    params = {
        "where": where,
        "outFields": "GEOID,NAME,STATE,COUNTY",
        "outSR": "4326",
        "f": "geojson",
        "returnGeometry": "true",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()

    geojson = r.json()
    cache_set(key, geojson)
    return geojson


def get_county_bbox(gdf: gpd.GeoDataFrame) -> tuple[float, float, float, float]:
    """Return (south, west, north, east) bounding box from GeoDataFrame."""
    bounds = gdf.total_bounds  # (minx, miny, maxx, maxy)
    return bounds[1], bounds[0], bounds[3], bounds[2]
