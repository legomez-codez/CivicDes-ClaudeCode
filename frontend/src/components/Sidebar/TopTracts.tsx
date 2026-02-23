import React, { useState } from 'react';
import type { TopTract, LayerType } from '../../types';
import { scoreToColor } from '../../lib/colors';
import { useGeocode } from '../../hooks/useGeocode';

interface Props {
  tracts: TopTract[];
  isLoading: boolean;
  activeLayer: LayerType;
}

const LAYER_SERVICE: Record<LayerType, string> = {
  healthcare: 'healthcare facility',
  food: 'food source',
  transit: 'transit stop',
  news: 'local news outlet',
};

function factorLevel(value: number, high = 0.35, mid = 0.15): 'high' | 'mid' | 'low' {
  if (value >= high) return 'high';
  if (value >= mid) return 'mid';
  return 'low';
}

const LEVEL_COLORS: Record<'high' | 'mid' | 'low', string> = {
  high: 'bg-red-500',
  mid: 'bg-amber-400',
  low: 'bg-green-400',
};
const LEVEL_LABELS: Record<'high' | 'mid' | 'low', string> = {
  high: 'High',
  mid: 'Mod',
  low: 'Low',
};

function buildExplanation(tract: TopTract, layer: LayerType): string {
  const { poverty_rate: pov, age_vulnerability: age, no_vehicle_rate: veh, dist_km } = tract;

  const factors: [string, number][] = [
    [`${(pov * 100).toFixed(0)}% poverty rate`, pov],
    [`${(age * 100).toFixed(0)}% senior (65+) population`, age],
    [`${(veh * 100).toFixed(0)}% car-free households`, veh],
  ];
  const top = factors.sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topStr = top.map(([label]) => label).join(' and ');

  if (layer === 'news') {
    const density = tract.outlet_density ?? 0;
    const coverageDesc =
      density < 1
        ? 'virtually no local news coverage'
        : density < 3
        ? 'very sparse local news coverage'
        : `limited coverage (${density.toFixed(1)} outlets per 100k)`;
    return `With ${topStr}, residents here are especially dependent on local information. The county has ${coverageDesc}, amplifying this vulnerability.`;
  }

  const service = LAYER_SERVICE[layer];
  const distDesc =
    dist_km < 0.5
      ? `a ${service} within walking distance (${(dist_km * 1000).toFixed(0)}m)`
      : dist_km < 2
      ? `the nearest ${service} ${(dist_km * 1000).toFixed(0)}m away`
      : `the nearest ${service} ${dist_km.toFixed(1)}km away`;

  return `This tract has ${topStr}, with ${distDesc}. The combination of resident vulnerability and service distance drives this gap score.`;
}

interface FactorBarProps {
  label: string;
  value: number;
  max?: number;
  highThreshold?: number;
  midThreshold?: number;
}

function FactorBar({ label, value, max = 1, highThreshold = 0.35, midThreshold = 0.15 }: FactorBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const level = factorLevel(value, highThreshold, midThreshold);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${LEVEL_COLORS[level]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium text-gray-700">
        {(value * 100).toFixed(0)}%
      </span>
      <span className={`w-7 text-right font-semibold text-xs ${
        level === 'high' ? 'text-red-600' : level === 'mid' ? 'text-amber-600' : 'text-green-600'
      }`}>
        {LEVEL_LABELS[level]}
      </span>
    </div>
  );
}

interface TractCardProps {
  tract: TopTract;
  rank: number;
  activeLayer: LayerType;
}

function TractCard({ tract, rank, activeLayer }: TractCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasCoords = tract.centroid_lat != null && tract.centroid_lon != null;
  const { data: geo, isLoading: geoLoading } = useGeocode(
    tract.centroid_lat,
    tract.centroid_lon,
    expanded && hasCoords,
  );

  const isNews = activeLayer === 'news';
  const displayName = tract.name.replace(/, [^,]+$/, '') || `Tract ${tract.geoid.slice(-6)}`;

  // Location line: "South Central (90011), Los Angeles" or just city if no neighbourhood
  const locationLine = geo
    ? [
        geo.neighbourhood && geo.postcode
          ? `${geo.neighbourhood} (${geo.postcode})`
          : geo.neighbourhood || geo.postcode || null,
        geo.city,
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const censusReporterUrl = `https://censusreporter.org/profiles/${tract.geoid}/`;

  return (
    <li className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Main row — always visible */}
      <button
        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((x) => !x)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{rank}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-400">GEOID {tract.geoid}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: scoreToColor(tract.gap_score) }}
            >
              {tract.gap_score.toFixed(0)}
            </span>
            <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${tract.gap_score}%`, backgroundColor: scoreToColor(tract.gap_score) }}
          />
        </div>

        {/* Compact breakdown */}
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs text-gray-500">
          <span title="Poverty rate">Pov: {(tract.poverty_rate * 100).toFixed(0)}%</span>
          <span title="65+ population rate">Age: {(tract.age_vulnerability * 100).toFixed(0)}%</span>
          <span title="No-vehicle households">NoVeh: {(tract.no_vehicle_rate * 100).toFixed(0)}%</span>
        </div>

        {!isNews && (
          <p className="text-xs text-gray-400 mt-0.5">
            {tract.dist_km < 1
              ? `${(tract.dist_km * 1000).toFixed(0)}m to nearest ${LAYER_SERVICE[activeLayer]}`
              : `${tract.dist_km.toFixed(1)}km to nearest ${LAYER_SERVICE[activeLayer]}`}
          </p>
        )}
        {isNews && tract.outlet_density != null && (
          <p className="text-xs text-gray-400 mt-0.5">
            {tract.outlet_density.toFixed(1)} outlets per 100k residents
          </p>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-3 space-y-3">
          {/* Location */}
          <div className="flex items-start gap-1.5">
            <span className="text-gray-400 mt-0.5">📍</span>
            <div className="text-xs text-gray-600">
              {geoLoading ? (
                <span className="text-gray-400 italic">Looking up location…</span>
              ) : locationLine ? (
                <span className="font-medium">{locationLine}</span>
              ) : (
                <span className="text-gray-400 italic">Location not found</span>
              )}
            </div>
          </div>

          {/* Factor breakdown bars */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Vulnerability Factors
            </p>
            <div className="space-y-1.5">
              <FactorBar label="Poverty" value={tract.poverty_rate} highThreshold={0.30} midThreshold={0.15} />
              <FactorBar label="Age 65+" value={tract.age_vulnerability} highThreshold={0.20} midThreshold={0.10} />
              <FactorBar label="No vehicle" value={tract.no_vehicle_rate} highThreshold={0.25} midThreshold={0.10} />
            </div>
          </div>

          {/* Score explanation */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Why this score?
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {buildExplanation(tract, activeLayer)}
            </p>
          </div>

          {/* Score math */}
          <div className="bg-gray-50 rounded-md px-2 py-1.5 text-xs font-mono text-gray-500 space-y-0.5">
            <div>Vulnerability: {tract.vulnerability.toFixed(2)} / 3.0</div>
            {isNews ? (
              <div>Outlets/100k: {(tract.outlet_density ?? 0).toFixed(2)}</div>
            ) : (
              <div>Distance: {tract.dist_km.toFixed(2)} km</div>
            )}
            <div className="border-t border-gray-200 pt-0.5 font-semibold text-gray-700">
              Gap score: {tract.gap_score.toFixed(1)} / 100
            </div>
          </div>

          {/* Links */}
          <a
            href={censusReporterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-medium"
          >
            <span>Explore tract on Census Reporter</span>
            <span>↗</span>
          </a>
        </div>
      )}
    </li>
  );
}

export function TopTracts({ tracts, isLoading, activeLayer }: Props) {
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
          <TractCard key={tract.geoid} tract={tract} rank={i + 1} activeLayer={activeLayer} />
        ))}
      </ol>
    </div>
  );
}
