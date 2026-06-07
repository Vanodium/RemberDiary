import db from '../db/index.js';
import {
  getIsoDateInTimezone,
  getLocalTimeParts,
  getServerTimeParts,
  isEndOfWeek,
} from '../lib/periods.js';
import { isIgnoredEmail, sendWeeklySummaryEmail } from './email.js';

const CHECK_INTERVAL_MS = 15_000;
const DEBUG = process.env.WEEKLY_EMAIL_DEBUG === '1';
const IGNORE_DAY_CHECK = process.env.WEEKLY_EMAIL_IGNORE_DAY === '1';
const USE_SERVER_TIME = process.env.WEEKLY_EMAIL_USE_SERVER_TIME === '1';

const sentKeys = new Set();

function padMinute(minute) {
  return String(minute).padStart(2, '0');
}

function getSendTime() {
  return {
    hour: Number(process.env.WEEKLY_EMAIL_HOUR ?? 23),
    minute: Number(process.env.WEEKLY_EMAIL_MINUTE ?? 59),
  };
}

function isSendTime(now, sendHour, sendMinute, timezone) {
  const { hour, minute } = USE_SERVER_TIME
    ? getServerTimeParts(now)
    : getLocalTimeParts(timezone, now);
  return hour === sendHour && minute === sendMinute;
}

async function getWeeklySummary(userId, date) {
  return db
    .prepare(
      `SELECT content FROM summaries
       WHERE user_id = ? AND date = ? AND summary_type = 'weekly'`,
    )
    .get(userId, date);
}

async function processWeeklySummaryEmails() {
  const { hour: sendHour, minute: sendMinute } = getSendTime();
  const now = new Date();

  if (USE_SERVER_TIME && DEBUG) {
    const { hour, minute } = getServerTimeParts(now);
    console.log(
      `[weekly email] server clock ${hour}:${padMinute(minute)} (target ${sendHour}:${padMinute(sendMinute)})`,
    );
  }

  const rows = await db
    .prepare('SELECT id, email, timezone, end_of_week_day FROM users')
    .all();

  if (DEBUG && rows.length === 0) {
    console.log('[weekly email] no users in database');
  }

  for (const row of rows) {
    if (isIgnoredEmail(row.email)) continue;

    const endOfWeekDay = row.end_of_week_day ?? 'sun';
    const timezone = row.timezone ?? 'UTC';
    const todayIso = getIsoDateInTimezone(timezone, now);
    const onEndOfWeekDay = isEndOfWeek(todayIso, endOfWeekDay);

    if (!IGNORE_DAY_CHECK && !onEndOfWeekDay) {
      if (DEBUG) {
        console.log(`[weekly email] ${row.email}: skipped, not end-of-week day (${todayIso})`);
      }
      continue;
    }

    if (!isSendTime(now, sendHour, sendMinute, timezone)) {
      if (DEBUG && !USE_SERVER_TIME) {
        const { hour, minute } = getLocalTimeParts(timezone, now);
        console.log(
          `[weekly email] ${row.email}: skipped, local ${hour}:${padMinute(minute)} != target ${sendHour}:${padMinute(sendMinute)} (${timezone})`,
        );
      }
      continue;
    }

    const sentKey = `${row.id}:${todayIso}`;
    if (sentKeys.has(sentKey)) continue;

    const summary = await getWeeklySummary(row.id, todayIso);
    if (!summary) {
      if (DEBUG) {
        console.log(`[weekly email] ${row.email}: no weekly summary for ${todayIso}`);
      }
      continue;
    }

    await sendWeeklySummaryEmail(row.email, todayIso, summary.content);
    sentKeys.add(sentKey);
  }
}

export function startWeeklySummaryEmailScheduler() {
  const { hour, minute } = getSendTime();
  const timeLabel = `${hour}:${padMinute(minute)}`;
  const clockNote = USE_SERVER_TIME ? ' (server clock)' : ' (per-user timezone)';
  const dayNote = IGNORE_DAY_CHECK ? ', any day' : ' on end-of-week day';
  console.log(`Weekly summary email scheduler started (${timeLabel}${clockNote}${dayNote})`);

  processWeeklySummaryEmails().catch(console.error);
  setInterval(() => {
    processWeeklySummaryEmails().catch(console.error);
  }, CHECK_INTERVAL_MS);
}
