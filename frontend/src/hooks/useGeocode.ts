import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface GeocodeResult {
  neighbourhood: string | null;
  postcode: string | null;
  city: string | null;
  state: string | null;
}

async function fetchGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  const r = await fetch(`${API_BASE}/api/tracts/geocode?lat=${lat}&lon=${lon}`);
  if (!r.ok) throw new Error('Geocode failed');
  return r.json();
}

export function useGeocode(
  lat: number | null | undefined,
  lon: number | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['geocode', lat != null ? lat.toFixed(2) : null, lon != null ? lon.toFixed(2) : null],
    queryFn: () => fetchGeocode(lat!, lon!),
    enabled: enabled && lat != null && lon != null,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });
}
