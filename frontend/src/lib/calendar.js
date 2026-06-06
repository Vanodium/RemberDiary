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

function isTimelineWorkday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/** Month grid for timeline: each row is one week (max 5 workdays + 2 weekend days). */
export function buildTimelineMonthRows(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = [];

  let day = 1;
  while (day <= daysInMonth) {
    const workdays = [];
    const weekends = [];

    while (day <= daysInMonth) {
      const date = new Date(year, month, day);
      if (isTimelineWorkday(date)) {
        workdays.push(date);
      } else {
        weekends.push(date);
      }

      const endedWeek = date.getDay() === 0;
      day += 1;
      if (endedWeek) break;
    }

    rows.push({ workdays, weekends });
  }

  return rows;
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

export function formatDateLines(date) {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

export function formatMonthYearLines(year, month) {
  const value = new Date(year, month, 1);
  return {
    month: value.toLocaleDateString('en-US', { month: 'short' }),
    year: value.toLocaleDateString('en-US', { year: 'numeric' }),
  };
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

const END_OF_WEEK_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function getWeekRange(dateIso, endOfWeekDay = 'sun') {
  const endDow = END_OF_WEEK_MAP[endOfWeekDay] ?? 0;
  const date = new Date(`${dateIso}T12:00:00`);
  const dow = date.getDay();
  const daysToEnd = (endDow - dow + 7) % 7;

  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() + daysToEnd);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);

  return { start: toIsoDate(weekStart), end: toIsoDate(weekEnd) };
}

export function weekKey(dateIso, endOfWeekDay = 'sun') {
  return getWeekRange(dateIso, endOfWeekDay).start;
}

export function monthKey(dateIso) {
  return dateIso.slice(0, 7);
}

export function formatWeekRange(startIso, endIso) {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(monthKeyValue) {
  const [year, month] = monthKeyValue.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
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
