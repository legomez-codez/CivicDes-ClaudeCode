import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface NewsScore {
  fips: string;
  score: number;
  label: string;
  color: string;
  outlet_count: number;
  outlets_per_100k: number;
  population: number;
  explanation: string;
}

async function fetchNewsScore(fips: string): Promise<NewsScore> {
  const r = await fetch(`${API_BASE}/api/counties/${fips}/news-score`);
  if (!r.ok) throw new Error('News score fetch failed');
  return r.json();
}

export function useNewsScore(fips: string | null) {
  return useQuery({
    queryKey: ['news-score', fips],
    queryFn: () => fetchNewsScore(fips!),
    enabled: !!fips,
    staleTime: 1000 * 60 * 60 * 24,
  });
}
