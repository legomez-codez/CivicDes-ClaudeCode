# Service Gap Dashboard — CLAUDE.md

## Project Overview

"Civic Deserts" dashboard that overlays Census ACS vulnerability data with OpenStreetMap infrastructure POIs to compute and display service gap scores at the Census tract level within US counties.

**Target users**: Policy advocates and city planners
**Stack**: Python FastAPI backend + React/Vite/Tailwind/Mapbox GL JS frontend

---

## Directory Layout

```
service-gap-dashboard/
├── backend/           # FastAPI Python backend
├── frontend/          # React + Vite + Mapbox frontend
└── CLAUDE.md
```

---

## Backend

### Commands

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Add CENSUS_API_KEY
uvicorn main:app --reload
```

### Key Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, CORS, router registration |
| `routers/counties.py` | `GET /api/counties/search`, `/api/counties/{fips}/boundary` |
| `routers/gap.py` | `GET /api/gap/{fips}?layer=`, `/api/gap/{fips}/top-tracts` |
| `services/census.py` | ACS 5-year API client (poverty, age, vehicles) |
| `services/overpass.py` | Overpass QL queries for healthcare/food/transit POIs |
| `services/gap_calculator.py` | Haversine distance, vulnerability scoring, normalization |
| `services/geospatial.py` | Census TIGER API tract boundaries + centroids |
| `cache/file_cache.py` | 24-hour TTL JSON file cache |
| `cache/counties.json` | Pre-loaded county FIPS list (3222 counties) |

### Environment Variables

```
CENSUS_API_KEY=   # Optional but helps with rate limits; get at api.census.gov
```

### Gap Score Formula

```
vulnerability = poverty_rate + age_65plus_rate + no_vehicle_rate  (0–3 scale)
gap_score_raw = vulnerability / max(distance_km_to_nearest_poi, 0.1)
gap_score     = normalized 0–100 within county
```

### Layer Types

- `healthcare` — hospitals, clinics, pharmacies
- `food` — supermarkets, groceries, food banks
- `transit` — stations, bus stops

---

## Frontend

### Commands

```bash
cd frontend
npm install
cp .env.example .env    # Add VITE_MAPBOX_TOKEN
npm run dev              # http://localhost:5173
```

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root: state management (county, layer), layout |
| `src/components/Map/MapView.tsx` | Mapbox GL map init, fly-to county |
| `src/components/Map/ChoroplethLayer.tsx` | `fill` + `line` layers, hover popup (hook) |
| `src/components/Sidebar/Sidebar.tsx` | Sidebar shell |
| `src/components/Sidebar/CountySearch.tsx` | Debounced county autocomplete |
| `src/components/Sidebar/TopTracts.tsx` | Top 5 worst tracts list |
| `src/components/Sidebar/ScoreLegend.tsx` | Color gradient legend |
| `src/components/Controls/LayerToggle.tsx` | Healthcare/Food/Transit toggle buttons |
| `src/hooks/useGapData.ts` | TanStack Query hooks for gap data + top tracts |
| `src/hooks/useCountySearch.ts` | Debounced county search hook |
| `src/lib/mapbox.ts` | Token + style constants |
| `src/lib/colors.ts` | 5-stop yellow→purple scale + Mapbox expression builder |

### Environment Variables

```
VITE_MAPBOX_TOKEN=   # Required; get at account.mapbox.com
VITE_API_BASE_URL=http://localhost:8000
```

---

## Verification

```bash
# Backend
curl "http://localhost:8000/api/counties/search?q=Los+Angeles"
curl "http://localhost:8000/api/gap/06037?layer=healthcare"
curl "http://localhost:8000/api/gap/06037/top-tracts?layer=healthcare"

# Frontend: open http://localhost:5173
# 1. Search "Los Angeles" → select LA County
# 2. Verify map flies to county bounds
# 3. Choropleth renders (yellow → purple gradient)
# 4. Top 5 sidebar list populates
# 5. Switch layers → map re-renders
```

---

## Caching

All API responses (Census ACS, Overpass, TIGER boundaries) are cached to `backend/cache/_data/` for 24 hours keyed by FIPS + layer. Delete this directory to bust the cache.

---

## Data Sources

- **Census ACS 5-year**: `https://api.census.gov/data/2022/acs/acs5`
- **Census TIGER**: `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020`
- **OpenStreetMap via Overpass**: `https://overpass-api.de/api/interpreter`
