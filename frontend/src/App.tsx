import React, { useState } from 'react';
import type { County, LayerType } from './types';
import { MapView } from './components/Map/MapView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useGapData } from './hooks/useGapData';

export default function App() {
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('healthcare');

  const { data: gapData, isFetching } = useGapData(
    selectedCounty?.fips || null,
    activeLayer
  );

  function handleCountySelect(county: County) {
    if (!county.fips) {
      setSelectedCounty(null);
    } else {
      setSelectedCounty(county);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Sidebar
        selectedCounty={selectedCounty}
        activeLayer={activeLayer}
        onCountySelect={handleCountySelect}
        onLayerChange={setActiveLayer}
        isLoadingGap={isFetching}
      />
      <main className="flex-1 relative">
        <MapView
          selectedCounty={selectedCounty}
          gapData={gapData ?? null}
        />
        {isFetching && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-gray-700">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Loading gap scores…
          </div>
        )}
      </main>
    </div>
  );
}
