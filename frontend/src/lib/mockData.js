export const mockUser = {
  email: 'you@example.com',
  timezone: 'Europe/Moscow',
  endOfWeekDay: 'sun',
};

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const mockSummaries = {
  [isoDate(year, month, Math.max(1, today.getDate() - 2))]: {
    id: 1,
    content:
      'Spent the morning on a long walk and cleared my head. Met a friend for coffee in the afternoon and we talked about summer plans. Finished the day reading on the couch — quiet, but good.',
  },
  [isoDate(year, month, Math.max(1, today.getDate() - 5))]: {
    id: 2,
    content:
      'Work was dense: back-to-back calls until noon. Took a break to cook something simple for lunch. Evening felt slower — listened to music and wrote a few notes for tomorrow.',
  },
  [isoDate(year, month, Math.max(1, today.getDate() - 12))]: {
    id: 3,
    content:
      'Rain all day. Stayed in and reorganized the desk. Called family briefly. Felt reflective, not restless.',
  },
};

export function hasSummary(iso) {
  return Object.prototype.hasOwnProperty.call(mockSummaries, iso);
}

export function getSummary(iso) {
  return mockSummaries[iso] ?? null;
}
