"""Compute gap scores by joining Census tracts with OSM POIs."""
import math
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, MultiPoint
from shapely.ops import nearest_points


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_gap_scores(
    tract_gdf: gpd.GeoDataFrame,
    census_rows: list[dict],
    pois: list[dict],
) -> dict:
    """
    Join vulnerability data + nearest POI distance → gap scores.
    Returns GeoJSON FeatureCollection with gap_score property.
    """
    # Build vulnerability lookup keyed by GEOID
    vuln_lookup: dict[str, dict] = {row["geoid"]: row for row in census_rows}

    # Build POI MultiPoint for nearest_points search (lon, lat order for Shapely)
    if pois:
        poi_points = MultiPoint([(p["lon"], p["lat"]) for p in pois])
    else:
        poi_points = None

    # Compute centroids in EPSG:4326
    tract_gdf = tract_gdf.copy()
    tract_gdf = tract_gdf.set_crs("EPSG:4326", allow_override=True)

    results = []
    for _, row in tract_gdf.iterrows():
        geoid = str(row.get("GEOID", row.get("geoid", "")))
        vuln = vuln_lookup.get(geoid, {})
        vulnerability = vuln.get("vulnerability", 0.0)

        centroid = row.geometry.centroid
        cx, cy = centroid.x, centroid.y  # lon, lat

        if poi_points is not None:
            nearest_poi, _ = nearest_points(Point(cx, cy), poi_points)
            dist_km = haversine_km(cy, cx, nearest_poi.y, nearest_poi.x)
        else:
            dist_km = 999.0

        gap_score_raw = vulnerability / max(dist_km, 0.1)

        results.append({
            "geoid": geoid,
            "geometry": row.geometry,
            "vulnerability": vulnerability,
            "poverty_rate": vuln.get("poverty_rate", 0.0),
            "age_vulnerability": vuln.get("age_vulnerability", 0.0),
            "no_vehicle_rate": vuln.get("no_vehicle_rate", 0.0),
            "dist_km": round(dist_km, 3),
            "gap_score_raw": gap_score_raw,
            "name": vuln.get("name", row.get("NAME", geoid)),
            "centroid_lat": round(cy, 5),
            "centroid_lon": round(cx, 5),
        })

    if not results:
        return {"type": "FeatureCollection", "features": []}

    # Normalize gap scores 0–100 within county
    scores = [r["gap_score_raw"] for r in results]
    min_s, max_s = min(scores), max(scores)
    score_range = max_s - min_s if max_s > min_s else 1.0

    features = []
    for r in results:
        norm = round((r["gap_score_raw"] - min_s) / score_range * 100, 2)
        features.append({
            "type": "Feature",
            "geometry": r["geometry"].__geo_interface__,
            "properties": {
                "geoid": r["geoid"],
                "name": r["name"],
                "gap_score": norm,
                "vulnerability": r["vulnerability"],
                "poverty_rate": r["poverty_rate"],
                "age_vulnerability": r["age_vulnerability"],
                "no_vehicle_rate": r["no_vehicle_rate"],
                "dist_km": r["dist_km"],
                "centroid_lat": r["centroid_lat"],
                "centroid_lon": r["centroid_lon"],
            },
        })

    return {"type": "FeatureCollection", "features": features}


def compute_news_gap_scores(
    tract_gdf,
    census_rows: list[dict],
    outlet_density: float,
    outlet_count: int,
) -> dict:
    """
    Gap scores for the news layer.
    gap_score_raw = vulnerability / max(outlet_density, 0.1)
    Normalized globally (0–100) using theoretical max of 3.0 / 0.1 = 30.
    This preserves cross-county signal: news deserts stay dark even after normalization.
    """
    import geopandas as gpd

    vuln_lookup: dict[str, dict] = {row["geoid"]: row for row in census_rows}

    GLOBAL_MAX = 30.0  # vulnerability(3) / floor(0.1)

    features = []
    for _, row in tract_gdf.iterrows():
        geoid = str(row.get("GEOID", row.get("geoid", "")))
        vuln = vuln_lookup.get(geoid, {})
        vulnerability = vuln.get("vulnerability", 0.0)

        gap_raw = vulnerability / max(outlet_density, 0.1)
        gap_score = round(min(gap_raw / GLOBAL_MAX * 100, 100), 2)

        centroid = row.geometry.centroid
        features.append({
            "type": "Feature",
            "geometry": row.geometry.__geo_interface__,
            "properties": {
                "geoid": geoid,
                "name": vuln.get("name", row.get("NAME", geoid)),
                "gap_score": gap_score,
                "vulnerability": vulnerability,
                "poverty_rate": vuln.get("poverty_rate", 0.0),
                "age_vulnerability": vuln.get("age_vulnerability", 0.0),
                "no_vehicle_rate": vuln.get("no_vehicle_rate", 0.0),
                "dist_km": 0.0,
                "outlet_density": outlet_density,
                "outlet_count": outlet_count,
                "centroid_lat": round(centroid.y, 5),
                "centroid_lon": round(centroid.x, 5),
            },
        })

    return {"type": "FeatureCollection", "features": features}


def get_top_tracts(geojson: dict, n: int = 5) -> list[dict]:
    """Return top-n tracts sorted by gap_score descending."""
    features = geojson.get("features", [])
    ranked = sorted(features, key=lambda f: f["properties"]["gap_score"], reverse=True)
    results = []
    for f in ranked[:n]:
        p = f["properties"]
        entry = {
            "geoid": p["geoid"],
            "name": p["name"],
            "gap_score": p["gap_score"],
            "vulnerability": p["vulnerability"],
            "poverty_rate": p["poverty_rate"],
            "age_vulnerability": p["age_vulnerability"],
            "no_vehicle_rate": p["no_vehicle_rate"],
            "dist_km": p["dist_km"],
            "centroid_lat": p.get("centroid_lat"),
            "centroid_lon": p.get("centroid_lon"),
        }
        if "outlet_density" in p:
            entry["outlet_density"] = p["outlet_density"]
            entry["outlet_count"] = p["outlet_count"]
        results.append(entry)
    return results
