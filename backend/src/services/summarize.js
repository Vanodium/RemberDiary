import db from '../db/index.js';
import {
  datesBetween,
  getLastDaysOfMonthsInYear,
  getMonth,
  getWeekEndingDatesInMonth,
  getWeekRange,
  getYear,
  isDec31,
  isEndOfWeek,
  isLastDayOfMonth,
  parseIsoDate,
  toIsoDate,
} from '../lib/periods.js';
import { getUserById } from './auth.js';

const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

const PROMPTS = {
  daily: `You turn today's journal entries into one short first-person recap of what happened.

CRITICAL: Use ONLY facts from the entries below. Do not add people, events, feelings, or details that are not in the input. Ignore anything you know from outside this request.

Style:
- Past tense, first person.
- Chronological: what happened first, then next, then after that. Use "then", "after that", or commas to chain events.
- Plain and factual — a log of the day, not a story. No commentary, no lessons, no wrap-up lines like "overall it was a good day".
- Include feelings only if the entry explicitly states them.
- Skip minor noise; keep the important events.
- Usually 1–4 sentences. Shorter than the input.
- Do not mention recordings, entries, journals, or time of day unless the entry does.

Example input:
- Woke up late, rushed breakfast.
- Leg day at the gym.
- Meeting with my boss about the promotion.
- Coffee with Sara.
- Got an A on the test.

Example output:
Woke up late and rushed breakfast, then did leg day at the gym. Had a meeting with my boss about the promotion, got coffee with Sara, and found out I got an A on the test.`,

  weekly: `You turn this week's daily summaries into one short first-person recap of the week.

CRITICAL: Use ONLY facts from the summaries below. Do not add people, events, feelings, or details that are not in the input. Ignore anything you know from outside this request.

Style:
- Past tense, first person.
- A factual highlight reel, not a reflection or story. No narrative arc, no lessons, no "it was a productive week" framing.
- Combine repeats: count them ("went to the gym 5 times"), list people met by name, name key wins and problems.
- Include feelings only if a daily summary explicitly states them.
- Omit day-by-day play-by-play; keep patterns, totals, and stand-out moments.
- Usually 2–5 sentences.
- Do not mention days, dates, summaries, journals, or recordings.

Example input:
Woke up early, finished the school project, submitted it.
Gym in the morning, lunch with Jacob.
Gym again, worked late on assignments.
Met Bob for dinner, stayed up until 2am.
Gym, then met Jessica for coffee. Barely slept.
Gym and a long study session.
Gym, turned in the last assignment, crashed early.

Example output:
Went to the gym 5 times, met Jacob, Bob, and Jessica, and finished school. Messed up my sleeping schedule from late nights and early mornings.`,

  monthly: `You turn this month's weekly recaps into one first-person recap of the month.

CRITICAL: Use ONLY facts from the recaps below. Do not add people, events, feelings, or details that are not in the input. Ignore anything you know from outside this request.

Style:
- Past tense, first person.
- A factual highlight reel with numbers: totals, counts, how often things happened.
- Combine repeats across weeks ("went to the gym 18 times", "met Sarah 3 times").
- List key people, wins, and problems. No narrative arc, no lessons, no mood wrap-ups unless explicitly stated.
- Usually 4–8 sentences. Longer than a weekly recap, but still concise.
- Do not mention weeks, summaries, journals, or recordings.

Example input:
Went to the gym 5 times, met Jacob and Bob, finished school.
Gym 4 times, started a new job, dinner with family twice.
Gym 6 times, trip to Portland, slept badly most nights.
Gym 3 times, presented at work, met Jessica.

Example output:
Went to the gym 18 times, started a new job, and finished school. Met Jacob, Bob, and Jessica, had family dinners twice, and took a trip to Portland. Presented at work and slept badly for most of the month.`,

  yearly: `You turn this year's monthly recaps into one first-person year-in-review.

CRITICAL: Use ONLY facts from the monthly recaps below. Do not add people, events, feelings, or details that are not in the input. Ignore anything you know from outside this request.

Style:
- Past tense, first person.
- Say something brief about EACH month in the input, in calendar order. One short clause or sentence per month is enough.
- After the month-by-month pass, add year-wide statistics with numbers: totals, counts, streaks, and patterns ("went to the gym every single month", "about 140 gym sessions total").
- Factual highlight reel, not a story. No lessons or dramatic framing.
- Include feelings only if a monthly recap explicitly states them.
- Usually 12–20 sentences.
- Use month names. Do not mention that these came from monthly summaries.

Example input:
--- January ---
Went to the gym 14 times, started a new diet, met Alex.
--- February ---
Gym 12 times, got promoted, traveled to Chicago.
--- March ---
Gym 15 times, finished a certification, met Maya and Tom.

Example output:
In January I went to the gym 14 times, started a new diet, and met Alex. In February I kept up gym 12 times, got promoted, and traveled to Chicago. In March I went to the gym 15 times, finished a certification, and met Maya and Tom. Across the year I went to the gym every single month, about 41 times in those three months, got promoted once, took one trip, and met four people.`,
};

function fallbackSummary(texts) {
  return texts
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const sentence = t.charAt(0).toUpperCase() + t.slice(1);
      return sentence.endsWith('.') ? sentence : `${sentence}.`;
    })
    .join(' ')
    .trim();
}

function explainOllamaError(err, body = '') {
  if (err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('fetch failed')) {
    return 'Ollama is not running — open the Ollama app from Applications, or run: ollama serve';
  }
  if (body.includes('llama-server binary not found')) {
    return 'Homebrew Ollama is missing runtime binaries — install the app from https://ollama.com/download';
  }
  return err?.message ?? 'unknown error';
}

function formatUserContent(tier, texts, meta = {}) {
  if (tier === 'monthly' && meta.year !== undefined && meta.month !== undefined) {
    const monthLabel = new Date(meta.year, meta.month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const weekCount = meta.weekCount ?? texts.length;
    const body = texts
      .map((text, index) => {
        const label = index < weekCount ? `Week ${index + 1}` : 'Additional days';
        return `--- ${label} ---\n${text}`;
      })
      .join('\n\n');
    return `Summarize ONLY the following weekly recaps. Do not use any other context:\n\nCreate a monthly recap for ${monthLabel}:\n\n${body}`;
  }

  if (tier === 'yearly' && meta.year !== undefined) {
    const labels = meta.monthLabels ?? texts.map((_, index) => `Month ${index + 1}`);
    const body = texts
      .map((text, index) => `--- ${labels[index]} ---\n${text}`)
      .join('\n\n');
    return `Summarize ONLY the following monthly recaps. Do not use any other context:\n\nCreate a year-in-review for ${meta.year}:\n\n${body}`;
  }

  const body = texts.join('\n\n');
  return `Summarize ONLY the following. Do not use any other context:\n\n${body}`;
}

async function callOllama(tier, texts, meta = {}) {
  if (texts.length === 0) return '';

  let res;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PROMPTS[tier] },
          { role: 'user', content: formatUserContent(tier, texts, meta) },
        ],
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: tier === 'yearly' ? 650 : tier === 'monthly' ? 500 : tier === 'weekly' ? 220 : 180,
        },
      }),
    });
  } catch (err) {
    throw new Error(explainOllamaError(err));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(explainOllamaError(null, body));
  }

  const data = await res.json();
  return data.message?.content?.trim() ?? '';
}

async function generateSummary(tier, texts, meta = {}) {
  if (texts.length === 0) return '';

  try {
    const content = await callOllama(tier, texts, meta);
    if (content) {
      console.log(`[summarize] ${tier} via ${OLLAMA_MODEL}`);
      return content;
    }
  } catch (err) {
    console.warn(`[summarize] Ollama unavailable (${OLLAMA_MODEL}): ${err.message}`);
    console.warn(`[summarize] Fix: open Ollama.app, then run: ollama pull ${OLLAMA_MODEL}`);
  }

  console.log(`[summarize] using ${tier} text fallback`);
  return fallbackSummary(texts);
}

async function getTranscriptsForDate(userId, date) {
  const rows = await db
    .prepare(
      `SELECT transcript FROM recordings
       WHERE user_id = ? AND recorded_date = ? AND transcript_status = 'done' AND transcript IS NOT NULL
       ORDER BY recorded_at ASC`,
    )
    .all(userId, date);
  return rows.map((row) => row.transcript);
}

async function getDailySummariesInRange(userId, start, end, todayIso, todayDaily) {
  const dates = datesBetween(start, end);
  const placeholders = dates.map(() => '?').join(', ');

  const rows = await db
    .prepare(
      `SELECT date, content FROM summaries
       WHERE user_id = ? AND date IN (${placeholders}) AND summary_type = 'daily'
       ORDER BY date ASC`,
    )
    .all(userId, ...dates);

  const byDate = new Map(rows.map((row) => [row.date, row.content]));

  if (todayDaily && dates.includes(todayIso)) {
    byDate.set(todayIso, todayDaily);
  }

  return dates.filter((d) => byDate.has(d)).map((d) => byDate.get(d));
}

async function getWeeklySummariesInMonth(userId, year, month, endOfWeekDay, todayIso, todayWeekly) {
  const weekEndDates = getWeekEndingDatesInMonth(year, month, endOfWeekDay);
  if (weekEndDates.length === 0) return [];

  const placeholders = weekEndDates.map(() => '?').join(', ');
  const rows = await db
    .prepare(
      `SELECT date, content FROM summaries
       WHERE user_id = ? AND date IN (${placeholders}) AND summary_type = 'weekly'
       ORDER BY date ASC`,
    )
    .all(userId, ...weekEndDates);

  const byDate = new Map(rows.map((row) => [row.date, row.content]));

  if (todayWeekly && weekEndDates.includes(todayIso)) {
    byDate.set(todayIso, todayWeekly);
  }

  return weekEndDates.filter((d) => byDate.has(d)).map((d) => byDate.get(d));
}

async function getAllDailySummariesInMonth(userId, year, month, todayIso, todayDaily) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    toIsoDate(new Date(year, month, i + 1, 12, 0, 0)),
  );
  const placeholders = dates.map(() => '?').join(', ');

  const rows = await db
    .prepare(
      `SELECT date, content FROM summaries
       WHERE user_id = ? AND date IN (${placeholders}) AND summary_type = 'daily'
       ORDER BY date ASC`,
    )
    .all(userId, ...dates);

  const byDate = new Map(rows.map((row) => [row.date, row.content]));

  if (todayDaily && dates.includes(todayIso)) {
    byDate.set(todayIso, todayDaily);
  }

  return dates.filter((d) => byDate.has(d)).map((d) => byDate.get(d));
}

async function getOrphanDailiesAfterLastWeekEnd(
  userId,
  year,
  month,
  endOfWeekDay,
  todayIso,
  todayDaily,
  todayType,
) {
  const weekEndDates = getWeekEndingDatesInMonth(year, month, endOfWeekDay);
  const lastWeekEnd = weekEndDates.at(-1);
  if (!lastWeekEnd) return [];

  const monthEndIso = toIsoDate(new Date(year, month + 1, 0, 12, 0, 0));
  if (lastWeekEnd >= monthEndIso) return [];

  const dayAfter = parseIsoDate(lastWeekEnd);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const startIso = toIsoDate(dayAfter);

  return getDailySummariesInRange(
    userId,
    startIso,
    monthEndIso,
    todayIso,
    todayType === 'daily' ? todayDaily : null,
  );
}

async function buildMonthlySources(userId, year, month, endOfWeekDay, todayIso, content, summaryType) {
  const todayWeekly = summaryType === 'weekly' ? content : null;
  const todayDaily = summaryType === 'daily' ? content : null;

  const weeklies = await getWeeklySummariesInMonth(
    userId,
    year,
    month,
    endOfWeekDay,
    todayIso,
    todayWeekly,
  );

  if (weeklies.length === 0) {
    return {
      sources: await getAllDailySummariesInMonth(userId, year, month, todayIso, todayDaily),
      weekCount: 0,
    };
  }

  const orphans = await getOrphanDailiesAfterLastWeekEnd(
    userId,
    year,
    month,
    endOfWeekDay,
    todayIso,
    todayDaily,
    summaryType,
  );

  return { sources: [...weeklies, ...orphans], weekCount: weeklies.length };
}

async function getMonthlySummariesInYear(userId, year, todayIso, todayMonthly) {
  const monthEndDates = getLastDaysOfMonthsInYear(year);
  const placeholders = monthEndDates.map(() => '?').join(', ');

  const rows = await db
    .prepare(
      `SELECT date, content FROM summaries
       WHERE user_id = ? AND date IN (${placeholders}) AND summary_type = 'monthly'
       ORDER BY date ASC`,
    )
    .all(userId, ...monthEndDates);

  const byDate = new Map(rows.map((row) => [row.date, row.content]));

  if (todayMonthly && monthEndDates.includes(todayIso)) {
    byDate.set(todayIso, todayMonthly);
  }

  return monthEndDates
    .filter((d) => byDate.has(d))
    .map((d) => ({
      monthLabel: parseIsoDate(d).toLocaleDateString('en-US', { month: 'long' }),
      content: byDate.get(d),
    }));
}

async function upsertSummary(userId, date, content, summaryType) {
  await db
    .prepare(
      `INSERT INTO summaries (user_id, date, content, summary_type) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         content = VALUES(content),
         summary_type = VALUES(summary_type)`,
    )
    .run(userId, date, content, summaryType);
}

async function deleteSummary(userId, date) {
  await db.prepare('DELETE FROM summaries WHERE user_id = ? AND date = ?').run(userId, date);
}

export async function updateSummaryForDate(date, userId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const endOfWeekDay = user.endOfWeekDay ?? 'sun';
  const transcripts = await getTranscriptsForDate(userId, date);

  let content = null;
  let summaryType = 'daily';

  if (transcripts.length > 0) {
    content = await generateSummary('daily', transcripts);
  }

  const endOfWeek = isEndOfWeek(date, endOfWeekDay);
  const lastOfMonth = isLastDayOfMonth(date);
  const yearEnd = isDec31(date);

  if (endOfWeek) {
    const { start, end } = getWeekRange(date, endOfWeekDay);
    const weekDailies = await getDailySummariesInRange(userId, start, end, date, content);
    if (weekDailies.length > 0) {
      content = await generateSummary('weekly', weekDailies);
      summaryType = 'weekly';
    }
  }

  if (lastOfMonth) {
    const year = getYear(date);
    const month = getMonth(date);
    const { sources: monthlySources, weekCount } = await buildMonthlySources(
      userId,
      year,
      month,
      endOfWeekDay,
      date,
      content,
      summaryType,
    );
    if (monthlySources.length > 0) {
      content = await generateSummary('monthly', monthlySources, { year, month, weekCount });
      summaryType = 'monthly';
    }
  }

  if (yearEnd) {
    const year = getYear(date);
    const monthlies = await getMonthlySummariesInYear(
      userId,
      year,
      date,
      summaryType === 'monthly' ? content : null,
    );
    if (monthlies.length > 0) {
      content = await generateSummary('yearly', monthlies.map((m) => m.content), {
        year,
        monthLabels: monthlies.map((m) => m.monthLabel),
      });
      summaryType = 'yearly';
    }
  }

  if (!content) {
    await deleteSummary(userId, date);
    return null;
  }

  await upsertSummary(userId, date, content, summaryType);
  console.log(`\n── ${summaryType} summary ${date} ──\n${content}\n`);
  return content;
}

export async function updateDailySummary(date, userId) {
  return updateSummaryForDate(date, userId);
}
