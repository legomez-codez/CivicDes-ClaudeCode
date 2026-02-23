"""Overpass API client for OSM POI queries."""
import httpx
from cache.file_cache import cache_get, cache_set

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

LAYER_QUERIES: dict[str, str] = {
    "healthcare": """
(
  node["amenity"~"^(hospital|clinic|pharmacy)$"]({bbox});
  way["amenity"~"^(hospital|clinic|pharmacy)$"]({bbox});
);
out center;
""",
    "food": """
(
  node["shop"~"^(supermarket|grocery)$"]({bbox});
  way["shop"~"^(supermarket|grocery)$"]({bbox});
  node["amenity"="food_bank"]({bbox});
  way["amenity"="food_bank"]({bbox});
);
out center;
""",
    "transit": """
(
  node["public_transport"~"^(station|stop_position)$"]({bbox});
  node["highway"="bus_stop"]({bbox});
  way["public_transport"="station"]({bbox});
);
out center;
""",
}


async def fetch_pois(
    layer: str,
    south: float,
    west: float,
    north: float,
    east: float,
    fips: str,
) -> list[dict]:
    """Return list of {lat, lon} dicts for POIs of the given layer type."""
    key = f"overpass:{fips}:{layer}"
    cached = cache_get(key)
    if cached is not None:
        return cached

    bbox = f"{south},{west},{north},{east}"
    template = LAYER_QUERIES.get(layer)
    if not template:
        raise ValueError(f"Unknown layer: {layer}")

    query = f"[out:json][timeout:60];\n{template.format(bbox=bbox)}"

    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post(OVERPASS_URL, data={"data": query})
        r.raise_for_status()

    elements = r.json().get("elements", [])
    pois = []
    for el in elements:
        if el["type"] == "node":
            pois.append({"lat": el["lat"], "lon": el["lon"]})
        elif el["type"] == "way" and "center" in el:
            pois.append({"lat": el["center"]["lat"], "lon": el["center"]["lon"]})

    cache_set(key, pois)
    return pois
