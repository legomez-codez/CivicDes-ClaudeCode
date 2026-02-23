import React, { useState } from 'react';
import { SCALE } from '../../lib/colors';
import type { LayerType } from '../../types';

const TIERS: Record<LayerType, Array<{ min: number; max: number; label: string; desc: string }>> = {
  healthcare: [
    { min: 0,  max: 24,  label: 'Sufficient',   desc: 'Services are accessible relative to need' },
    { min: 25, max: 49,  label: 'Moderate gap',  desc: 'Some residents face access challenges' },
    { min: 50, max: 74,  label: 'Elevated gap',  desc: 'Meaningful barriers to service access' },
    { min: 75, max: 89,  label: 'High gap',      desc: 'Severe vulnerability with few nearby services' },
    { min: 90, max: 100, label: 'Critical',      desc: 'Extreme need with very distant services' },
  ],
  food: [
    { min: 0,  max: 24,  label: 'Sufficient',   desc: 'Food retail accessible relative to need' },
    { min: 25, max: 49,  label: 'Moderate gap',  desc: 'Some residents face food access challenges' },
    { min: 50, max: 74,  label: 'Food gap',      desc: 'Significant barriers to food access' },
    { min: 75, max: 89,  label: 'Food desert',   desc: 'High vulnerability, distant food retail' },
    { min: 90, max: 100, label: 'Critical',      desc: 'Extreme food insecurity risk' },
  ],
  transit: [
    { min: 0,  max: 24,  label: 'Sufficient',   desc: 'Transit accessible relative to need' },
    { min: 25, max: 49,  label: 'Moderate gap',  desc: 'Some residents face transit challenges' },
    { min: 50, max: 74,  label: 'Transit gap',   desc: 'Meaningful barriers to transit access' },
    { min: 75, max: 89,  label: 'Transit desert', desc: 'High vulnerability, distant transit' },
    { min: 90, max: 100, label: 'Critical',      desc: 'Extreme transit isolation' },
  ],
  news: [
    { min: 0,  max: 24,  label: 'Covered',       desc: 'County has relatively strong local news coverage' },
    { min: 25, max: 49,  label: 'Moderate gap',  desc: 'Thin local news coverage for the population' },
    { min: 50, max: 74,  label: 'News gap',      desc: 'Few local outlets serving a vulnerable population' },
    { min: 75, max: 89,  label: 'News desert',   desc: 'High vulnerability with very scarce local news' },
    { min: 90, max: 100, label: 'Critical',      desc: 'Near-total news void with highly vulnerable residents' },
  ],
};

const LAYER_LABELS: Record<LayerType, { pois: string; vars: string }> = {
  healthcare: {
    pois: 'Hospitals, clinics, pharmacies',
    vars: 'Poverty rate · Elderly population · No-vehicle households',
  },
  food: {
    pois: 'Supermarkets, grocery stores, food banks',
    vars: 'Poverty rate · Elderly population · No-vehicle households',
  },
  transit: {
    pois: 'Train stations, bus stops',
    vars: 'Poverty rate · Elderly population · No-vehicle households',
  },
  news: {
    pois: 'Local news outlets (sTechLab dataset)',
    vars: 'Poverty rate · Elderly population · No-vehicle households',
  },
};

interface Props {
  activeLayer: LayerType;
}

export function ScoreLegend({ activeLayer }: Props) {
  const [expanded, setExpanded] = useState(false);
  const layerInfo = LAYER_LABELS[activeLayer];
  const tiers = TIERS[activeLayer];
  const isNews = activeLayer === 'news';

  return (
    <div className="space-y-3">
      {/* Color gradient bar */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Gap Score
        </p>
        <div
          className="h-3 rounded-full w-full"
          style={{
            background: `linear-gradient(to right, ${SCALE.map(([, c]) => c).join(', ')})`,
          }}
        />
        <div className="relative flex justify-between mt-1">
          {SCALE.map(([val]) => (
            <span key={val} className="text-xs text-gray-400">{val}</span>
          ))}
        </div>
        {isNews && (
          <p className="text-xs text-amber-600 mt-1">
            Scores compare counties nationally, not just within the selected county.
          </p>
        )}
      </div>

      {/* Score tier table */}
      <div className="space-y-1">
        {tiers.map(({ min, max, label }, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: SCALE[i][1] as string }}
            />
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-700">{label} </span>
              <span className="text-xs text-gray-400">({min}–{max === 100 ? '100' : max})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsible methodology */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span>How scores are calculated</span>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="px-3 py-3 text-xs text-gray-600 space-y-3 bg-white">
            <div>
              <p className="font-semibold text-gray-700 mb-1">Formula</p>
              {isNews ? (
                <>
                  <code className="block bg-gray-50 rounded p-2 text-xs leading-relaxed font-mono text-purple-800">
                    gap = vulnerability ÷ outlets_per_100k
                  </code>
                  <p className="mt-1 text-gray-500">
                    Normalized globally against a theoretical maximum (3 ÷ 0.1 = 30), so scores reflect both how vulnerable a tract is <em>and</em> how news-scarce its county is compared to all US counties.
                  </p>
                </>
              ) : (
                <>
                  <code className="block bg-gray-50 rounded p-2 text-xs leading-relaxed font-mono text-purple-800">
                    gap = vulnerability ÷ distance_km
                  </code>
                  <p className="mt-1 text-gray-500">
                    Scores are normalized 0–100 within the selected county so you can compare tracts relative to each other.
                  </p>
                </>
              )}
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">Vulnerability (0–3 scale)</p>
              <p className="text-gray-500">Sum of three ACS 5-year estimates per Census tract:</p>
              <ul className="mt-1 space-y-0.5 text-gray-500 list-disc list-inside">
                <li>Poverty rate (% below poverty line)</li>
                <li>Age vulnerability (% population 65+)</li>
                <li>No-vehicle rate (% households without a car)</li>
              </ul>
            </div>

            {isNews ? (
              <div>
                <p className="font-semibold text-gray-700 mb-1">News access</p>
                <p className="text-gray-500">
                  County-level local news outlet count divided by population (per 100k residents). Sourced from the sTechLab Local News Dataset. Floored at 0.1 to avoid division by zero.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-700 mb-1">Distance</p>
                <p className="text-gray-500">
                  Haversine distance from the tract centroid to the nearest OSM point of interest. Floored at 0.1 km to avoid division by zero.
                </p>
              </div>
            )}

            <div>
              <p className="font-semibold text-gray-700 mb-1">
                {activeLayer.charAt(0).toUpperCase() + activeLayer.slice(1)} layer sources
              </p>
              <p className="text-gray-500">{layerInfo.pois}</p>
            </div>

            <div className="text-gray-400 border-t border-gray-100 pt-2">
              <p className="font-medium text-gray-500 mb-0.5">Data sources</p>
              <p>
                Census ACS 5-year (2022) · Census TIGER 2020 boundaries
                {isNews
                  ? ' · sTechLab Local News Outlets Dataset'
                  : ' · OpenStreetMap via Overpass API'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
