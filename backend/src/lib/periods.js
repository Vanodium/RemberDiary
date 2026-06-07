const END_OF_WEEK_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function parseIsoDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayOfWeek(iso) {
  return parseIsoDate(iso).getDay();
}

export function isEndOfWeek(iso, endOfWeekDay) {
  const target = END_OF_WEEK_MAP[endOfWeekDay] ?? END_OF_WEEK_MAP.sun;
  return getDayOfWeek(iso) === target;
}

/** Most recent week-ending date strictly before `todayIso`. */
export function getLastWeekEndingDate(todayIso, endOfWeekDay) {
  const date = parseIsoDate(todayIso);
  for (let i = 1; i <= 7; i += 1) {
    date.setDate(date.getDate() - 1);
    const iso = toIsoDate(date);
    if (isEndOfWeek(iso, endOfWeekDay)) return iso;
  }
  return toIsoDate(date);
}

export function getWeekRange(iso, endOfWeekDay) {
  const end = parseIsoDate(iso);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start: toIsoDate(start), end: iso };
}

export function isLastDayOfMonth(iso) {
  const date = parseIsoDate(iso);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === lastDay;
}

export function isDec31(iso) {
  const date = parseIsoDate(iso);
  return date.getMonth() === 11 && date.getDate() === 31;
}

export function getYear(iso) {
  return parseIsoDate(iso).getFullYear();
}

export function getMonth(iso) {
  return parseIsoDate(iso).getMonth();
}

export function getWeekEndingDatesInMonth(year, month, endOfWeekDay) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIsoDate(new Date(year, month, day, 12, 0, 0));
    if (isEndOfWeek(iso, endOfWeekDay)) dates.push(iso);
  }
  return dates;
}

export function getLastDaysOfMonthsInYear(year) {
  const dates = [];
  for (let month = 0; month < 12; month += 1) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    dates.push(toIsoDate(new Date(year, month, lastDay, 12, 0, 0)));
  }
  return dates;
}

export function getIsoDateInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function getLocalTimeParts(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  };
}

/** Laptop/server clock — for dev overrides only. */
export function getServerTimeParts(now = new Date()) {
  return { hour: now.getHours(), minute: now.getMinutes() };
}

export function datesBetween(startIso, endIso) {
  const dates = [];
  const current = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);

  while (current <= end) {
    dates.push(toIsoDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
