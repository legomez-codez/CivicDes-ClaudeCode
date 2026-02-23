import React from 'react';
import type { County, LayerType } from '../../types';
import { CountySearch } from './CountySearch';
import { ScoreLegend } from './ScoreLegend';
import { TopTracts } from './TopTracts';
import { AboutPanel } from './AboutPanel';
import { NewsDesertBadge } from './NewsDesertBadge';
import { LayerToggle } from '../Controls/LayerToggle';
import { useTopTracts } from '../../hooks/useGapData';
import { useNewsScore } from '../../hooks/useNewsScore';

interface Props {
  selectedCounty: County | null;
  activeLayer: LayerType;
  onCountySelect: (county: County) => void;
  onLayerChange: (layer: LayerType) => void;
  isLoadingGap: boolean;
}

export function Sidebar({
  selectedCounty,
  activeLayer,
  onCountySelect,
  onLayerChange,
  isLoadingGap,
}: Props) {
  const { data: topTracts = [], isLoading: loadingTop } = useTopTracts(
    selectedCounty?.fips || null,
    activeLayer
  );
  const { data: newsScore, isLoading: loadingNews } = useNewsScore(
    selectedCounty?.fips || null
  );

  return (
    <aside className="w-80 shrink-0 h-full bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden shadow-md z-10">
      {/* Header */}
      <div className="bg-purple-900 text-white px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight">Civic Deserts</h1>
        <p className="text-xs text-purple-200 mt-0.5">Service gap analysis by Census tract</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* County selector */}
        <CountySearch selectedCounty={selectedCounty} onSelect={onCountySelect} />

        {/* News desert badge — always shown when a county is selected */}
        {selectedCounty?.fips && (newsScore || loadingNews) && (
          <NewsDesertBadge score={newsScore!} isLoading={loadingNews} />
        )}

        {/* Layer toggle */}
        {selectedCounty?.fips && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Service Layer
            </p>
            <LayerToggle
              active={activeLayer}
              onChange={onLayerChange}
              disabled={isLoadingGap}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoadingGap && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Computing gap scores…
          </div>
        )}

        {/* Top tracts */}
        {selectedCounty?.fips && !isLoadingGap && (
          <TopTracts tracts={topTracts} isLoading={loadingTop} />
        )}

        {/* Legend */}
        {selectedCounty?.fips && !isLoadingGap && (
          <ScoreLegend activeLayer={activeLayer} />
        )}

        {/* About panel — shown when no county is selected */}
        {!selectedCounty?.fips && <AboutPanel />}
      </div>

      <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400">
        Data: ACS 5-year · OpenStreetMap
      </div>
    </aside>
  );
}
