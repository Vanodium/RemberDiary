const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function buildCalendarMonth(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const day = daysInPrevMonth - startOffset + i + 1;
    const date = new Date(year, month - 1, day);
    cells.push({ date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ date: new Date(year, month + 1, day), inMonth: false });
  }

  return { weekdays: WEEKDAYS, cells };
}

export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatShortDate(date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${monthDay}`;
}

export function formatLongDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthYear(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimezoneDisplay(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
    return offset.toLowerCase();
  } catch {
    return timezone;
  }
}

export const WEEKDAY_OPTIONS = [
  { value: 'mon', label: 'monday' },
  { value: 'tue', label: 'tuesday' },
  { value: 'wed', label: 'wednesday' },
  { value: 'thu', label: 'thursday' },
  { value: 'fri', label: 'friday' },
  { value: 'sat', label: 'saturday' },
  { value: 'sun', label: 'sunday' },
];
