import React, { useState } from 'react';
import type { LayerType } from '../../types';

interface Props {
  activeLayer: LayerType;
}

const LAYER_POI: Record<LayerType, string> = {
  healthcare: 'hospitals, clinics, and pharmacies',
  food: 'supermarkets, grocery stores, and food banks',
  transit: 'train stations, bus stops, and transit hubs',
  news: 'local newspaper and TV news outlets (sTechLab dataset)',
};

export function DataSourcePanel({ activeLayer }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors font-semibold text-gray-600 uppercase tracking-wide"
        onClick={() => setOpen((x) => !x)}
        aria-expanded={open}
      >
        <span>Data Sources &amp; Methodology</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3 text-gray-600 leading-relaxed">
          {/* Vulnerability */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-1">Vulnerability Index</h4>
            <p>
              Built from{' '}
              <a
                href="https://www.census.gov/programs-surveys/acs/about.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 hover:underline"
              >
                Census Bureau ACS 5-Year Estimates
              </a>{' '}
              (most recent vintage) at the Census tract level:
            </p>
            <ul className="mt-1 ml-3 space-y-0.5 list-disc list-inside text-gray-500">
              <li>
                <strong>Poverty rate</strong> — households below the federal poverty line (B17001)
              </li>
              <li>
                <strong>Senior population (65+)</strong> — older residents often have greater
                service needs and less mobility (B01001 age buckets)
              </li>
              <li>
                <strong>Car-free households</strong> — households with no vehicle available,
                limiting access to distant services (B08201)
              </li>
            </ul>
            <p className="mt-1 text-gray-500">
              Each factor is a rate from 0–1; they are summed to a 0–3 vulnerability score.
            </p>
          </section>

          {/* Service distance */}
          {activeLayer !== 'news' && (
            <section>
              <h4 className="font-semibold text-gray-800 mb-1">Service Distance</h4>
              <p>
                Points of interest — {LAYER_POI[activeLayer]} — are queried from{' '}
                <a
                  href="https://www.openstreetmap.org/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 hover:underline"
                >
                  OpenStreetMap
                </a>{' '}
                via the Overpass API. Distance from each tract centroid to the nearest POI is
                calculated using the Haversine formula.
              </p>
            </section>
          )}

          {/* News layer specifics */}
          {activeLayer === 'news' && (
            <section>
              <h4 className="font-semibold text-gray-800 mb-1">Local News Coverage</h4>
              <p>
                Outlet counts are from the{' '}
                <a
                  href="https://localnewsresource.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 hover:underline"
                >
                  sTechLab Local News Resource
                </a>
                , a dataset of ~2,300 counties' newspaper and TV news outlets. Outlet density is
                calculated as outlets per 100,000 county residents (Census ACS population).
              </p>
            </section>
          )}

          {/* Gap score formula */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-1">Gap Score Formula</h4>
            <div className="bg-gray-50 rounded px-2 py-1.5 font-mono text-gray-600">
              {activeLayer === 'news' ? (
                <>
                  <div>gap_raw = vulnerability / max(outlets_per_100k, 0.1)</div>
                  <div className="text-gray-400">Normalized globally: 0 – 100</div>
                </>
              ) : (
                <>
                  <div>gap_raw = vulnerability / max(dist_km, 0.1)</div>
                  <div className="text-gray-400">Normalized within county: 0 – 100</div>
                </>
              )}
            </div>
            <p className="mt-1 text-gray-500">
              A higher score means a tract has more vulnerable residents AND less access to{' '}
              {activeLayer === 'news' ? 'local news' : 'services'}. The floor (0.1) prevents
              division by zero for tracts with a service directly inside them.
            </p>
          </section>

          {/* Accuracy + limitations */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-1">Accuracy &amp; Limitations</h4>
            <ul className="ml-3 space-y-0.5 list-disc list-inside text-gray-500">
              <li>
                ACS estimates carry a margin of error — individual tract scores are indicators,
                not precise measurements.
              </li>
              <li>
                OpenStreetMap coverage is volunteer-contributed and may undercount services in
                less-mapped areas, which can inflate gap scores.
              </li>
              <li>
                Distance is measured centroid-to-centroid (straight line), not travel time.
                Actual access depends on transportation network and service hours.
              </li>
              {activeLayer === 'news' && (
                <li>
                  The sTechLab outlet dataset may lag recent closures or launches; treat county
                  news scores as approximate.
                </li>
              )}
            </ul>
          </section>

          {/* Source links */}
          <div className="border-t border-gray-100 pt-2 space-y-1 text-gray-500">
            <p className="font-semibold text-gray-700">Primary sources:</p>
            <ul className="ml-3 space-y-0.5 list-disc list-inside">
              <li>
                <a
                  href="https://api.census.gov/data/2022/acs/acs5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 hover:underline"
                >
                  Census ACS 5-Year API (2022)
                </a>
              </li>
              <li>
                <a
                  href="https://tigerweb.geo.census.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-700 hover:underline"
                >
                  Census TIGER/Web (tract boundaries)
                </a>
              </li>
              {activeLayer !== 'news' && (
                <li>
                  <a
                    href="https://overpass-api.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:underline"
                  >
                    OpenStreetMap via Overpass API
                  </a>
                </li>
              )}
              {activeLayer === 'news' && (
                <li>
                  <a
                    href="https://localnewsresource.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:underline"
                  >
                    sTechLab Local News Resource
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
