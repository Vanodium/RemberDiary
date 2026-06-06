import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_ACCENT_ID,
  getStoredAccentId,
  storeAccentId,
} from '../lib/accentColors';

const AccentContext = createContext(null);

export function AccentProvider({ children }) {
  const [accentId, setAccentIdState] = useState(getStoredAccentId);

  const setAccentId = useCallback((nextAccentId) => {
    storeAccentId(nextAccentId);
    setAccentIdState(nextAccentId);
  }, []);

  const value = useMemo(
    () => ({
      accentId,
      setAccentId,
    }),
    [accentId, setAccentId],
  );

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    throw new Error('useAccent must be used within AccentProvider');
  }
  return ctx;
}

export { DEFAULT_ACCENT_ID };
