import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState(null);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSummary = useCallback((date) => {
    setSummaryDate(date);
    setSummaryOpen(true);
  }, []);
  const closeSummary = useCallback(() => setSummaryOpen(false), []);
  const clearSummaryDate = useCallback(() => setSummaryDate(null), []);

  const contentDimmed = settingsOpen || summaryOpen;

  const value = useMemo(
    () => ({
      settingsOpen,
      summaryOpen,
      summaryDate,
      contentDimmed,
      openSettings,
      closeSettings,
      openSummary,
      closeSummary,
      clearSummaryDate,
    }),
    [
      settingsOpen,
      summaryOpen,
      summaryDate,
      contentDimmed,
      openSettings,
      closeSettings,
      openSummary,
      closeSummary,
      clearSummaryDate,
    ],
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
