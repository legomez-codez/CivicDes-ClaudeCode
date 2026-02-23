"""ACS 5-year Census API client."""
import os
import httpx
from cache.file_cache import cache_get, cache_set

ACS_YEAR = 2022
ACS_BASE = f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5"

# Poverty: total / in poverty
# Age 65+: male buckets B01001_020E-025E, female B01001_044E-049E
# No vehicle: households with 0 vehicles
ACS_VARS = [
    "NAME",
    "B17001_001E", "B17001_002E",          # poverty total, below poverty
    "B01001_001E",                          # total population
    "B01001_020E", "B01001_021E", "B01001_022E",  # male 65-66, 67-69, 70-74
    "B01001_023E", "B01001_024E", "B01001_025E",  # male 75-79, 80-84, 85+
    "B01001_044E", "B01001_045E", "B01001_046E",  # female 65-66, 67-69, 70-74
    "B01001_047E", "B01001_048E", "B01001_049E",  # female 75-79, 80-84, 85+
    "B08201_001E", "B08201_002E",           # households total, no vehicle
]


async def fetch_tract_data(state_fips: str, county_fips: str) -> list[dict]:
    """Return list of tract-level vulnerability metrics."""
    key = f"acs:{state_fips}:{county_fips}:{ACS_YEAR}"
    cached = cache_get(key)
    if cached is not None:
        return cached

    api_key = os.getenv("CENSUS_API_KEY", "")
    params = {
        "get": ",".join(ACS_VARS),
        "for": "tract:*",
        "in": f"state:{state_fips} county:{county_fips}",
    }
    if api_key:
        params["key"] = api_key

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(ACS_BASE, params=params)
        r.raise_for_status()

    raw = r.json()
    headers = raw[0]
    rows = []
    for row in raw[1:]:
        d = dict(zip(headers, row))
        rows.append(_parse_row(d))

    cache_set(key, rows)
    return rows


def _safe_float(val, default=0.0) -> float:
    try:
        v = float(val)
        return v if v >= 0 else default
    except (TypeError, ValueError):
        return default


def _parse_row(d: dict) -> dict:
    pop = _safe_float(d.get("B01001_001E"), 1)
    poverty_total = _safe_float(d.get("B17001_001E"), 1)
    poverty_below = _safe_float(d.get("B17001_002E"))
    poverty_rate = poverty_below / max(poverty_total, 1)

    age_65_plus = sum(
        _safe_float(d.get(v))
        for v in [
            "B01001_020E", "B01001_021E", "B01001_022E",
            "B01001_023E", "B01001_024E", "B01001_025E",
            "B01001_044E", "B01001_045E", "B01001_046E",
            "B01001_047E", "B01001_048E", "B01001_049E",
        ]
    )
    age_vulnerability = age_65_plus / max(pop, 1)

    hh_total = _safe_float(d.get("B08201_001E"), 1)
    hh_no_vehicle = _safe_float(d.get("B08201_002E"))
    no_vehicle_rate = hh_no_vehicle / max(hh_total, 1)

    tract_id = d.get("tract", "")
    return {
        "tract": tract_id,
        "state": d.get("state", ""),
        "county": d.get("county", ""),
        "geoid": d.get("state", "") + d.get("county", "") + tract_id,
        "name": d.get("NAME", ""),
        "population": int(pop),
        "poverty_rate": round(poverty_rate, 4),
        "age_vulnerability": round(age_vulnerability, 4),
        "no_vehicle_rate": round(no_vehicle_rate, 4),
        "vulnerability": round(poverty_rate + age_vulnerability + no_vehicle_rate, 4),
    }
