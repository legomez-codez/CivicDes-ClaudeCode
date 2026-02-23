import React from 'react';
import type { TopTract } from '../../types';
import { scoreToColor } from '../../lib/colors';

interface Props {
  tracts: TopTract[];
  isLoading: boolean;
}

export function TopTracts({ tracts, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!tracts.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Top 5 Underserved Tracts
      </p>
      <ol className="space-y-2">
        {tracts.map((tract, i) => (
          <li
            key={tract.geoid}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {tract.name.replace(/, [^,]+$/, '') || `Tract ${tract.geoid.slice(-6)}`}
                  </p>
                  <p className="text-xs text-gray-500">GEOID: {tract.geoid}</p>
                </div>
              </div>
              <span
                className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: scoreToColor(tract.gap_score) }}
              >
                {tract.gap_score.toFixed(0)}
              </span>
            </div>
            {/* Score bar */}
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${tract.gap_score}%`,
                  backgroundColor: scoreToColor(tract.gap_score),
                }}
              />
            </div>
            {/* Breakdown */}
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs text-gray-500">
              <span title="Poverty rate">
                Pov: {(tract.poverty_rate * 100).toFixed(0)}%
              </span>
              <span title="65+ population rate">
                Age: {(tract.age_vulnerability * 100).toFixed(0)}%
              </span>
              <span title="No-vehicle households">
                NoVeh: {(tract.no_vehicle_rate * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {tract.dist_km < 1
                ? `${(tract.dist_km * 1000).toFixed(0)}m to nearest service`
                : `${tract.dist_km.toFixed(1)}km to nearest service`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
