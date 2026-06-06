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
} from '../lib/periods.js';
import { getUserById } from './auth.js';

const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:1b';

const PROMPTS = {
  daily: `You turn raw voice journal transcripts into a short first-person daily highlight.
Depending on how informative the transcript is, you can write 1-4 sentences. Keep it concise and to the point.
Capture the key moments and overall mood. Merge multiple notes into one coherent entry.
Do not mention recording, transcription, or that these were voice notes.`,

  weekly: `You summarize daily journal highlights from one week into a single first-person weekly recap.
Write 3–7 sentences in past tense — capture the most important moments and overall mood.
Do not mention days, recordings, or that these were separate entries. Keep it concise and to the point.`,

  monthly: `You turn weekly journal recaps from one month into a single first-person monthly reflection.
Write 7–12 sentences in past tense capture the most important moments and overall mood. Try to capture themes, growth, and the feel of the month.
Do not mention weeks or that these were separate summaries.`,

  yearly: `You turn monthly journal reflections from one year into a single first-person year-in-review.
Write 12–24 sentences in past tense to capture the things person did, learned or achievedand overall mood. Capture the year's story, turning points, and overall mood.
Do not mention months or that these were separate summaries.`,
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

async function callOllama(tier, texts) {
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
          { role: 'user', content: texts.join('\n\n') },
        ],
        stream: false,
        options: {
          temperature: 0.6,
          num_predict: tier === 'yearly' ? 320 : tier === 'monthly' ? 260 : tier === 'weekly' ? 220 : 180,
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

async function generateSummary(tier, texts) {
  if (texts.length === 0) return '';

  try {
    const content = await callOllama(tier, texts);
    if (content) {
      console.log(`[summarize] ${tier} via ${OLLAMA_MODEL}`);
      return content;
    }
  } catch (err) {
    console.warn(`[summarize] Ollama unavailable (${OLLAMA_MODEL}): ${err.message}`);
    console.warn('[summarize] Fix: open Ollama.app, then run: ollama pull llama3.2:1b');
  }

  console.log(`[summarize] using ${tier} text fallback`);
  return fallbackSummary(texts);
}

function getTranscriptsForDate(userId, date) {
  return db
    .prepare(
      `SELECT transcript FROM recordings
       WHERE user_id = ? AND recorded_date = ? AND transcript_status = 'done' AND transcript IS NOT NULL
       ORDER BY recorded_at ASC`,
    )
    .all(userId, date)
    .map((row) => row.transcript);
}

function getDailySummariesInRange(userId, start, end, todayIso, todayDaily) {
  const dates = datesBetween(start, end);
  const placeholders = dates.map(() => '?').join(', ');

  const rows = db
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

function getWeeklySummariesInMonth(userId, year, month, endOfWeekDay, todayIso, todayWeekly) {
  const weekEndDates = getWeekEndingDatesInMonth(year, month, endOfWeekDay);
  if (weekEndDates.length === 0) return [];

  const placeholders = weekEndDates.map(() => '?').join(', ');
  const rows = db
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

function getMonthlySummariesInYear(userId, year, todayIso, todayMonthly) {
  const monthEndDates = getLastDaysOfMonthsInYear(year);
  const placeholders = monthEndDates.map(() => '?').join(', ');

  const rows = db
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

  return monthEndDates.filter((d) => byDate.has(d)).map((d) => byDate.get(d));
}

function upsertSummary(userId, date, content, summaryType) {
  db.prepare(
    `INSERT INTO summaries (user_id, date, content, summary_type) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET
       content = excluded.content,
       summary_type = excluded.summary_type`,
  ).run(userId, date, content, summaryType);
}

function deleteSummary(userId, date) {
  db.prepare('DELETE FROM summaries WHERE user_id = ? AND date = ?').run(userId, date);
}

export async function updateSummaryForDate(date, userId) {
  const user = getUserById(userId);
  if (!user) return null;

  const endOfWeekDay = user.endOfWeekDay ?? 'sun';
  const transcripts = getTranscriptsForDate(userId, date);

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
    const weekDailies = getDailySummariesInRange(userId, start, end, date, content);
    if (weekDailies.length > 0) {
      content = await generateSummary('weekly', weekDailies);
      summaryType = 'weekly';
    }
  }

  if (lastOfMonth) {
    const year = getYear(date);
    const month = getMonth(date);
    const weeklies = getWeeklySummariesInMonth(
      userId,
      year,
      month,
      endOfWeekDay,
      date,
      summaryType === 'weekly' ? content : null,
    );
    if (weeklies.length > 0) {
      content = await generateSummary('monthly', weeklies);
      summaryType = 'monthly';
    }
  }

  if (yearEnd) {
    const year = getYear(date);
    const monthlies = getMonthlySummariesInYear(
      userId,
      year,
      date,
      summaryType === 'monthly' ? content : null,
    );
    if (monthlies.length > 0) {
      content = await generateSummary('yearly', monthlies);
      summaryType = 'yearly';
    }
  }

  if (!content) {
    deleteSummary(userId, date);
    return null;
  }

  upsertSummary(userId, date, content, summaryType);
  console.log(`\n── ${summaryType} summary ${date} ──\n${content}\n`);
  return content;
}

export async function updateDailySummary(date, userId) {
  return updateSummaryForDate(date, userId);
}
