import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryView, setSummaryView] = useState(null);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const openSummary = useCallback((date) => {
    setSummaryView({ type: 'day', key: date });
  }, []);

  const openPeriodSummary = useCallback((type, key) => {
    setSummaryView({ type, key });
  }, []);

  const closeSummary = useCallback(() => setSummaryView(null), []);

  const value = useMemo(
    () => ({
      settingsOpen,
      summaryView,
      openSettings,
      closeSettings,
      openSummary,
      openPeriodSummary,
      closeSummary,
    }),
    [settingsOpen, summaryView, openSettings, closeSettings, openSummary, openPeriodSummary, closeSummary],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error('useOverlay must be used within OverlayProvider');
  }
  return ctx;
}
