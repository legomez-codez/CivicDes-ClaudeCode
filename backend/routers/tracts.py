"""Tract-level enrichment endpoints."""
import httpx
from fastapi import APIRouter, Query
from cache.file_cache import cache_get, cache_set

router = APIRouter(prefix="/tracts")

# Photon (komoot) — OSM-based reverse geocoder, no auth required, no rate-limit issues
PHOTON_URL = "https://photon.komoot.io/reverse"
HEADERS = {"User-Agent": "CivicDeserts-Dashboard/1.0 (civic-deserts@example.com)"}

_NULL_RESULT = {
    "neighbourhood": None,
    "postcode": None,
    "city": None,
    "state": None,
}


@router.get("/geocode")
async def reverse_geocode(
    lat: float = Query(...),
    lon: float = Query(...),
):
    """
    Reverse geocode a tract centroid via Photon (komoot OSM geocoder).
    Returns neighbourhood/district, postcode, city, state.
    Cached by coordinates rounded to 2 decimal places (~1km grid).
    On any error, returns null fields so the UI degrades gracefully.
    """
    cache_key = f"photon:{round(lat, 2)}:{round(lon, 2)}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        timeout = httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout, headers=HEADERS) as client:
            r = await client.get(PHOTON_URL, params={"lat": lat, "lon": lon})
            r.raise_for_status()
    except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.RequestError):
        return _NULL_RESULT

    data = r.json()
    features = data.get("features", [])
    if not features:
        return _NULL_RESULT

    props = features[0].get("properties", {})
    # When Photon returns a city/place boundary feature, the city name is in "name"
    # rather than the "city" field. Use it as fallback.
    city = (props.get("city") or props.get("town") or props.get("village")
            or (props.get("name") if props.get("osm_key") == "place" else None)
            or None)
    result = {
        "neighbourhood": props.get("district") or None,
        "postcode": props.get("postcode") or None,
        "city": city,
        "state": props.get("state") or None,
    }

    cache_set(cache_key, result)
    return result
