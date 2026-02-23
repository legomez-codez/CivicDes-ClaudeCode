import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { County } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchCountySearch(q: string): Promise<County[]> {
  if (!q || q.length < 2) return [];
  const r = await fetch(`${API_BASE}/api/counties/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error('County search failed');
  return r.json();
}

export function useCountySearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['county-search', debouncedQuery],
    queryFn: () => fetchCountySearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return { query, setQuery, results, isLoading };
}
