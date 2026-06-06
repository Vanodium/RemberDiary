export const ACCENT_STORAGE_KEY = 'rember:accent';

export const ACCENT_OPTIONS = [
  { id: 'charcoal', label: 'charcoal', color: '#1a1a1a' },
  { id: 'navy', label: 'navy', color: '#1e3a5f' },
  { id: 'forest', label: 'forest', color: '#1f3d2c' },
  { id: 'plum', label: 'plum', color: '#3d2a4a' },
  { id: 'wine', label: 'wine', color: '#4a2035' },
];

export const DEFAULT_ACCENT_ID = 'charcoal';

export function getAccentOption(accentId) {
  return ACCENT_OPTIONS.find((option) => option.id === accentId) ?? ACCENT_OPTIONS[0];
}

export function applyAccent(accentId) {
  const { color } = getAccentOption(accentId);
  document.documentElement.style.setProperty('--color-accent', color);
}

export function getStoredAccentId() {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored && ACCENT_OPTIONS.some((option) => option.id === stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_ACCENT_ID;
}

export function storeAccentId(accentId) {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accentId);
  } catch {
    // localStorage unavailable
  }
  applyAccent(accentId);
}
