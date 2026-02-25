"""
Accuracy verification probe for the Civic Deserts dashboard.
Tests: scoring sanity, ACS cross-check, distance sanity, normalization edge cases.
"""
import httpx, json, math, sys

API = "http://localhost:8000/api"
CENSUS = "https://api.census.gov/data/2022/acs/acs5"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m⚠\033[0m"
HEAD = "\033[1m\033[94m"
END  = "\033[0m"

results = {"pass": 0, "fail": 0, "warn": 0}

def check(label, ok, warn=False, detail=""):
    sym = WARN if warn else (PASS if ok else FAIL)
    key = "warn" if warn else ("pass" if ok else "fail")
    results[key] += 1
    suffix = f"  ({detail})" if detail else ""
    print(f"  {sym}  {label}{suffix}")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}1. SPOT-CHECK: Known high/low gap counties{END}")

COUNTIES = {
    "LA County, CA":     {"fips": "06037", "layer": "healthcare"},
    "Holmes County, MS": {"fips": "28049", "layer": "healthcare"},
    "Manhattan, NY":     {"fips": "36061", "layer": "food"},
    "Dallas County, TX": {"fips": "48113", "layer": "food"},
}

county_scores = {}
with httpx.Client(timeout=120) as c:
    for name, cfg in COUNTIES.items():
        print(f"\n  {name} ({cfg['layer']})…")
        r = c.get(f"{API}/gap/{cfg['fips']}/top-tracts?layer={cfg['layer']}")
        if r.status_code != 200:
            check(f"HTTP {r.status_code}", False, detail=r.text[:80])
            continue
        tracts = r.json()
        check(f"Returned {len(tracts)} tracts", len(tracts) > 0)
        if tracts:
            scores = [t["gap_score"] for t in tracts]
            max_s, min_s = max(scores), min(scores)
            top = tracts[0]
            check(f"Top score {max_s:.1f}/100 (normalized 0–100)", 0 <= max_s <= 100)
            check(f"All tracts have dist_km > 0", all(t["dist_km"] > 0 for t in tracts),
                  detail=f"min {min(t['dist_km'] for t in tracts):.3f} km")
            check(f"Vulnerability in 0–3 range",
                  all(0 <= t["vulnerability"] <= 3.1 for t in tracts))
            check(f"Centroids present",
                  all(t.get("centroid_lat") and t.get("centroid_lon") for t in tracts))
            county_scores[name] = max_s
            print(f"       Top tract: {top['name'][:60]}")
            print(f"       Gap {top['gap_score']:.1f} | Vuln {top['vulnerability']:.2f} | dist {top['dist_km']:.2f}km")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}2. RELATIVE RANKING: High-gap vs low-gap expectations{END}")
if "Holmes County, MS" in county_scores and "Manhattan, NY" in county_scores:
    holmes = county_scores["Holmes County, MS"]
    manhattan = county_scores["Manhattan, NY"]
    # Holmes County is among the poorest in the US; we expect its top tract
    # to have very high vulnerability even if services exist
    check(f"Holmes County top score ({holmes:.1f}) is meaningful",
          holmes > 30, warn=holmes <= 30,
          detail="rural county should have high gap unless services are nearby")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}3. ACS CROSS-CHECK: Compare our values to Census API directly{END}")

# Fetch one tract from LA County and compare ACS values
with httpx.Client(timeout=60) as c:
    r = c.get(f"{API}/gap/06037/top-tracts?layer=healthcare")
    if r.status_code == 200:
        tracts = r.json()
        if tracts:
            tract = tracts[0]
            geoid = tract["geoid"]          # 11-char: state(2) + county(3) + tract(6)
            state  = geoid[:2]
            county = geoid[2:5]
            tract_code = geoid[5:]
            print(f"\n  Checking GEOID {geoid}")
            print(f"  Our values: poverty={tract['poverty_rate']:.4f} age={tract['age_vulnerability']:.4f} noveh={tract['no_vehicle_rate']:.4f}")

            # Pull the same ACS variables directly
            vars_needed = "B17001_001E,B17001_002E,B01001_001E,B08201_001E,B08201_002E"
            age_buckets = ",".join([
                "B01001_020E","B01001_021E","B01001_022E","B01001_023E","B01001_024E","B01001_025E",
                "B01001_044E","B01001_045E","B01001_046E","B01001_047E","B01001_048E","B01001_049E"
            ])
            url = f"{CENSUS}?get={vars_needed},{age_buckets}&for=tract:{tract_code}&in=state:{state}%20county:{county}"
            cr = c.get(url)
            if cr.status_code == 200:
                rows = cr.json()
                if len(rows) > 1:
                    headers, vals = rows[0], rows[1]
                    def v(name): return int(vals[headers.index(name)] or 0)
                    pov_total   = v("B17001_001E")
                    pov_below   = v("B17001_002E")
                    pop_total   = v("B01001_001E")
                    noveh_total = v("B08201_001E")
                    noveh_zero  = v("B08201_002E")
                    age_65p = sum(v(b) for b in [
                        "B01001_020E","B01001_021E","B01001_022E","B01001_023E","B01001_024E","B01001_025E",
                        "B01001_044E","B01001_045E","B01001_046E","B01001_047E","B01001_048E","B01001_049E"
                    ])

                    pov_direct   = pov_below / max(pov_total, 1)
                    age_direct   = age_65p   / max(pop_total, 1)
                    noveh_direct = noveh_zero / max(noveh_total, 1)

                    print(f"  Census direct: poverty={pov_direct:.4f} age={age_direct:.4f} noveh={noveh_direct:.4f}")

                    check("Poverty rate matches Census ±1%",
                          abs(tract["poverty_rate"] - pov_direct) < 0.01,
                          detail=f"ours={tract['poverty_rate']:.4f} census={pov_direct:.4f}")
                    check("Age vulnerability matches Census ±1%",
                          abs(tract["age_vulnerability"] - age_direct) < 0.01,
                          detail=f"ours={tract['age_vulnerability']:.4f} census={age_direct:.4f}")
                    check("No-vehicle rate matches Census ±1%",
                          abs(tract["no_vehicle_rate"] - noveh_direct) < 0.01,
                          detail=f"ours={tract['no_vehicle_rate']:.4f} census={noveh_direct:.4f}")
            else:
                print(f"  {WARN} Census API returned {cr.status_code}, skipping cross-check")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}4. DISTANCE SANITY: Haversine vs known reference point{END}")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

# Cedars-Sinai Medical Center: 34.0752, -118.3802
# UCLA Medical Center:          34.0659, -118.4457
# Distance between them:
known_dist = haversine(34.0752, -118.3802, 34.0659, -118.4457)
print(f"\n  Cedars-Sinai → UCLA: our formula gives {known_dist:.3f} km")
google_approx = 5.8  # straight-line ~5.8 km
check("Haversine formula produces plausible distance",
      abs(known_dist - google_approx) < 0.5,
      detail=f"expected ~{google_approx}km, got {known_dist:.2f}km")

# Verify top LA tract dist_km is >= 0 and < 100 (no wild values)
with httpx.Client(timeout=60) as c:
    r = c.get(f"{API}/gap/06037/top-tracts?layer=healthcare")
    if r.status_code == 200:
        tracts = r.json()
        dists = [t["dist_km"] for t in tracts]
        check("All distances 0–100km", all(0 < d < 100 for d in dists),
              detail=f"range {min(dists):.2f}–{max(dists):.2f} km")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}5. NORMALIZATION: Score range is 0–100, top is 100{END}")

with httpx.Client(timeout=120) as c:
    for fips, label in [("06037","LA County"), ("36061","Manhattan")]:
        r = c.get(f"{API}/gap/{fips}?layer=healthcare")
        if r.status_code == 200:
            features = r.json().get("features", [])
            scores = [f["properties"]["gap_score"] for f in features]
            if scores:
                check(f"{label}: max score == 100",
                      max(scores) == 100.0, detail=f"actual max={max(scores)}")
                check(f"{label}: min score == 0",
                      min(scores) == 0.0, detail=f"actual min={min(scores)}")
                check(f"{label}: no NaN/null scores",
                      all(isinstance(s, (int, float)) for s in scores))

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}6. GEOCODE: Reverse geocoder returns plausible results{END}")

GEOCODE_TESTS = [
    (34.0522, -118.2437, "Los Angeles", "LA downtown centroid"),
    (40.7128, -74.0060,  "New York",    "Manhattan centroid"),
    (41.8827, -87.6233,  "Chicago",     "Chicago Loop centroid"),
]
with httpx.Client(timeout=30) as c:
    for lat, lon, expected_city, label in GEOCODE_TESTS:
        r = c.get(f"{API}/tracts/geocode?lat={lat}&lon={lon}")
        if r.status_code == 200:
            geo = r.json()
            city = geo.get("city") or ""
            check(f"{label}: city contains '{expected_city}'",
                  expected_city.lower() in city.lower(),
                  detail=f"got city='{city}' postcode='{geo.get('postcode')}'")
        else:
            check(f"{label}: HTTP {r.status_code}", False)

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{HEAD}7. NEWS LAYER: Outlet density and score plausibility{END}")

with httpx.Client(timeout=120) as c:
    for fips, label, expect_score_above in [
        ("06037", "LA County (large market, expect moderate score)", 0),
        ("28049", "Holmes County MS (rural, expect high score)",    30),
    ]:
        r = c.get(f"{API}/gap/{fips}/top-tracts?layer=news")
        if r.status_code == 200:
            tracts = r.json()
            if tracts:
                t = tracts[0]
                density = t.get("outlet_density", -1)
                check(f"{label}: outlet_density present",
                      density >= 0, detail=f"{density:.2f} outlets/100k")
                check(f"{label}: gap score > {expect_score_above}",
                      t["gap_score"] > expect_score_above,
                      warn=t["gap_score"] <= expect_score_above,
                      detail=f"score={t['gap_score']:.1f}")
        r2 = c.get(f"{API}/counties/{fips}/news-score")
        if r2.status_code == 200:
            ns = r2.json()
            check(f"{label}: news-score 0–10",
                  0 <= ns["score"] <= 10,
                  detail=f"{ns['score']:.1f}/10 '{ns['label']}'")

# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'─'*60}")
total = results["pass"] + results["fail"] + results["warn"]
print(f"  Results: {results['pass']} passed  {results['fail']} failed  {results['warn']} warnings  ({total} total)\n")
sys.exit(0 if results["fail"] == 0 else 1)
