import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState(null);
  const [settingsSheetPresent, setSettingsSheetPresent] = useState(false);
  const [summarySheetPresent, setSummarySheetPresent] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openSummary = useCallback((date) => setSummaryDate(date), []);
  const closeSummary = useCallback(() => setSummaryDate(null), []);

  const contentDimmed = settingsSheetPresent || summarySheetPresent;

  const value = useMemo(
    () => ({
      settingsOpen,
      summaryDate,
      contentDimmed,
      openSettings,
      closeSettings,
      openSummary,
      closeSummary,
      setSettingsSheetPresent,
      setSummarySheetPresent,
    }),
    [
      settingsOpen,
      summaryDate,
      contentDimmed,
      openSettings,
      closeSettings,
      openSummary,
      closeSummary,
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
