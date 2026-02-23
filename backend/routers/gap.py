"""Gap score endpoints."""
from fastapi import APIRouter, HTTPException, Query
from cache.file_cache import cache_get, cache_set
from services.census import fetch_tract_data
from services.overpass import fetch_pois
from services.geospatial import fetch_tract_boundaries, get_county_bbox
from services.gap_calculator import compute_gap_scores, compute_news_gap_scores, get_top_tracts
from services.news import get_outlet_density

router = APIRouter(prefix="/gap")

VALID_LAYERS = {"healthcare", "food", "transit", "news"}


async def _build_geojson(fips: str, layer: str) -> dict:
    cache_key = f"gap:{fips}:{layer}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    state_fips = fips[:2]
    county_fips = fips[2:]

    tract_gdf = await fetch_tract_boundaries(state_fips, county_fips)
    if tract_gdf.empty:
        raise HTTPException(status_code=404, detail=f"No tracts found for FIPS {fips}")

    census_rows = await fetch_tract_data(state_fips, county_fips)

    if layer == "news":
        outlet_density, outlet_count = get_outlet_density(fips, census_rows)
        geojson = compute_news_gap_scores(tract_gdf, census_rows, outlet_density, outlet_count)
    else:
        south, west, north, east = get_county_bbox(tract_gdf)
        pois = await fetch_pois(layer, south, west, north, east, fips)
        geojson = compute_gap_scores(tract_gdf, census_rows, pois)

    cache_set(cache_key, geojson)
    return geojson


@router.get("/{fips}")
async def gap_layer(
    fips: str,
    layer: str = Query("healthcare", description="Layer type: healthcare|food|transit|news"),
):
    """Return tract GeoJSON FeatureCollection with gap_score property."""
    if len(fips) != 5 or not fips.isdigit():
        raise HTTPException(status_code=400, detail="FIPS must be 5-digit string")
    if layer not in VALID_LAYERS:
        raise HTTPException(status_code=400, detail=f"layer must be one of {VALID_LAYERS}")

    return await _build_geojson(fips, layer)


@router.get("/{fips}/top-tracts")
async def top_tracts(
    fips: str,
    layer: str = Query("healthcare"),
    n: int = Query(5, ge=1, le=20),
):
    """Return top-n tracts with worst gap scores."""
    if len(fips) != 5 or not fips.isdigit():
        raise HTTPException(status_code=400, detail="FIPS must be 5-digit string")
    if layer not in VALID_LAYERS:
        raise HTTPException(status_code=400, detail=f"layer must be one of {VALID_LAYERS}")

    geojson = await _build_geojson(fips, layer)
    return get_top_tracts(geojson, n)
