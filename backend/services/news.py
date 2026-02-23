"""Local news outlet density service."""
import json
from pathlib import Path
from typing import Optional

_NEWS_FILE = Path(__file__).parent.parent / "cache" / "county_news_counts.json"
_news_data: Optional[dict] = None


def _load() -> dict:
    global _news_data
    if _news_data is None:
        _news_data = json.loads(_NEWS_FILE.read_text())
    return _news_data


def get_outlet_density(fips: str, census_rows: list[dict]) -> tuple[float, int]:
    """
    Returns (outlets_per_100k, raw_outlet_count) for the county.
    Uses tract-level census populations to compute county total.
    """
    data = _load()
    outlet_count = data.get(fips, 0)

    total_pop = sum(row.get("population", 0) for row in census_rows)
    if total_pop <= 0:
        return 0.0, outlet_count

    per_100k = outlet_count / (total_pop / 100_000)
    return round(per_100k, 4), outlet_count


def get_news_desert_score(fips: str, census_rows: list[dict]) -> dict:
    """
    Port of news-desert-score.js scoring logic using real census population.
    Returns score (0–10), label, color, outlet_count, outlets_per_100k, explanation.
    """
    outlets_per_100k, outlet_count = get_outlet_density(fips, census_rows)
    total_pop = sum(row.get("population", 0) for row in census_rows)

    tier = _calculate_tier(outlet_count, outlets_per_100k)
    explanation = _build_explanation(outlet_count, outlets_per_100k, total_pop, tier["score"])

    return {
        "fips": fips,
        "score": tier["score"],
        "label": tier["label"],
        "color": tier["color"],
        "outlet_count": outlet_count,
        "outlets_per_100k": round(outlets_per_100k, 1),
        "population": total_pop,
        "explanation": explanation,
    }


def _calculate_tier(outlet_count: int, outlets_per_100k: float) -> dict:
    if outlet_count == 0:
        return {"score": 0,  "label": "Full News Desert",   "color": "#d32f2f"}
    if outlet_count == 1 or outlets_per_100k < 1:
        return {"score": 2,  "label": "Severe Desert",      "color": "#e64a19"}
    if outlets_per_100k < 2:
        return {"score": 4,  "label": "At Risk",            "color": "#f57c00"}
    if outlets_per_100k < 4:
        return {"score": 6,  "label": "Underserved",        "color": "#fbc02d"}
    if outlets_per_100k < 8:
        return {"score": 8,  "label": "Adequately Served",  "color": "#388e3c"}
    return {"score": 10, "label": "Well Served",         "color": "#1976d2"}


def _build_explanation(outlet_count: int, per_100k: float, population: int, score: int) -> str:
    pop_str = f"{population:,}" if population else "unknown population"
    if outlet_count == 0:
        return f"No local news outlets found in this county ({pop_str} residents)."
    if score <= 2:
        return (
            f"{outlet_count} outlet(s) for {pop_str} residents "
            f"({per_100k:.1f}/100k). Severely underserved."
        )
    if score <= 4:
        return (
            f"{outlet_count} outlet(s) for {pop_str} residents "
            f"({per_100k:.1f}/100k). Coverage is thin relative to population."
        )
    if score <= 6:
        return (
            f"{outlet_count} outlet(s) for {pop_str} residents "
            f"({per_100k:.1f}/100k). Some coverage, but the area is underserved."
        )
    if score <= 8:
        return (
            f"{outlet_count} outlet(s) for {pop_str} residents "
            f"({per_100k:.1f}/100k). Local news coverage appears adequate."
        )
    return (
        f"{outlet_count} outlet(s) for {pop_str} residents "
        f"({per_100k:.1f}/100k). Well served by local news."
    )
