import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState(null);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSummary = useCallback((date) => setSummaryDate(date), []);
  const closeSummary = useCallback(() => setSummaryDate(null), []);

  const value = useMemo(
    () => ({
      settingsOpen,
      summaryDate,
      openSettings,
      closeSettings,
      openSummary,
      closeSummary,
    }),
    [settingsOpen, summaryDate, openSettings, closeSettings, openSummary, closeSummary],
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
