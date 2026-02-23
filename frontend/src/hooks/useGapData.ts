import { useQuery } from '@tanstack/react-query';
import type { GapGeoJSON, LayerType, TopTract } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchGapData(fips: string, layer: LayerType): Promise<GapGeoJSON> {
  const r = await fetch(`${API_BASE}/api/gap/${fips}?layer=${layer}`);
  if (!r.ok) throw new Error(`Gap data fetch failed: ${r.statusText}`);
  return r.json();
}

async function fetchTopTracts(fips: string, layer: LayerType): Promise<TopTract[]> {
  const r = await fetch(`${API_BASE}/api/gap/${fips}/top-tracts?layer=${layer}`);
  if (!r.ok) throw new Error(`Top tracts fetch failed: ${r.statusText}`);
  return r.json();
}

export function useGapData(fips: string | null, layer: LayerType) {
  return useQuery({
    queryKey: ['gap', fips, layer],
    queryFn: () => fetchGapData(fips!, layer),
    enabled: !!fips,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useTopTracts(fips: string | null, layer: LayerType) {
  return useQuery({
    queryKey: ['top-tracts', fips, layer],
    queryFn: () => fetchTopTracts(fips!, layer),
    enabled: !!fips,
    staleTime: 1000 * 60 * 60 * 24,
  });
}
