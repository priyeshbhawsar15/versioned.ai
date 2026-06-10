'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export function useApi<T>(endpoint: string, refreshKey?: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        setData(null);
        setError(json.error || json.message || null);
      }
      setLoading(false);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  return { data, loading, error, refetch: fetchData };
}
