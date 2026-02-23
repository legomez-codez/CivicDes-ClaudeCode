"""County search and boundary endpoints."""
import json
import re
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from rapidfuzz import fuzz, process

from services.geospatial import fetch_county_boundary
from services.census import fetch_tract_data
from services.news import get_news_desert_score

router = APIRouter(prefix="/counties")

_COUNTIES_FILE = Path(__file__).parent.parent / "cache" / "counties.json"
_ZIP_FILE = Path(__file__).parent.parent / "cache" / "zip_to_county.json"
_counties: list[dict] = []
_county_by_fips: dict = {}
_zip_to_county: dict = {}


def _load_counties():
    global _counties, _county_by_fips
    if not _counties:
        _counties = json.loads(_COUNTIES_FILE.read_text())
        _county_by_fips = {c["fips"]: c for c in _counties}
    return _counties


def _load_zip_map():
    global _zip_to_county
    if not _zip_to_county:
        _zip_to_county = json.loads(_ZIP_FILE.read_text())
    return _zip_to_county


def _zip_lookup(zip_code: str) -> Optional[dict]:
    """Return county dict for a 5-digit ZIP, or None if not found."""
    _load_counties()
    zip_map = _load_zip_map()
    fips = zip_map.get(zip_code)
    if not fips:
        return None
    county = _county_by_fips.get(fips)
    if not county:
        return None
    return {"fips": county["fips"], "name": county["name"], "state": county["state"], "full": county["full"]}


@router.get("/search")
async def search_counties(q: str = Query(..., min_length=2)):
    """Fuzzy county name search or exact ZIP lookup. Returns [{fips, name, state}]."""
    counties = _load_counties()
    query = q.strip()
    if not query:
        return []

    # ZIP code: exactly 5 digits
    if re.fullmatch(r"\d{5}", query):
        result = _zip_lookup(query)
        return [result] if result else []

    # Fuzzy county name search
    search_pool = [f"{c['name']}, {c['state']}" for c in counties]
    matches = process.extract(
        query.lower(),
        search_pool,
        scorer=fuzz.WRatio,
        limit=10,
        score_cutoff=50,
    )

    results = []
    for _match_str, _score, idx in matches:
        c = counties[idx]
        results.append({
            "fips": c["fips"],
            "name": c["name"],
            "state": c["state"],
            "full": c["full"],
        })

    return results


@router.get("/{fips}/boundary")
async def county_boundary(fips: str):
    """Return county outline as GeoJSON."""
    if len(fips) != 5 or not fips.isdigit():
        raise HTTPException(status_code=400, detail="FIPS must be 5-digit string")
    geojson = await fetch_county_boundary(fips)
    return geojson


@router.get("/{fips}/news-score")
async def county_news_score(fips: str):
    """
    News desert score (0–10) for a county using real census population.
    Ports the news-desert-score.js logic with real ACS population data.
    """
    if len(fips) != 5 or not fips.isdigit():
        raise HTTPException(status_code=400, detail="FIPS must be 5-digit string")
    census_rows = await fetch_tract_data(fips[:2], fips[2:])
    return get_news_desert_score(fips, census_rows)
