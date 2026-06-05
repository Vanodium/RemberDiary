import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchSummaries } from '../lib/api';

const SummariesContext = createContext(null);

const POLL_MS = 5000;

export function SummariesProvider({ children }) {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummaries({});
      setLoading(false);
      return;
    }

    try {
      const data = await fetchSummaries();
      setSummaries(data.summaries ?? {});
    } catch {
      // Keep last known summaries on transient errors.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSummaries({});
      return undefined;
    }

    setLoading(true);
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [user, refresh]);

  const value = useMemo(
    () => ({
      summaries,
      loading,
      refresh,
      hasSummary: (iso) => Object.prototype.hasOwnProperty.call(summaries, iso),
      getSummary: (iso) => summaries[iso] ?? null,
    }),
    [summaries, loading, refresh],
  );

  return <SummariesContext.Provider value={value}>{children}</SummariesContext.Provider>;
}

export function useSummaries() {
  const ctx = useContext(SummariesContext);
  if (!ctx) {
    throw new Error('useSummaries must be used within SummariesProvider');
  }
  return ctx;
}
