/**
 * Seeds mock voice transcripts and generates summaries through the real pipeline
 * (daily → weekly → monthly) using the app's Ollama prompts.
 *
 * Usage:
 *   npm run seed:mock --prefix backend
 *   MOCK_USER_EMAIL=mock@data.rember npm run seed:mock --prefix backend
 *
 * Log in as that user, open Timeline → June 2026.
 * Requires MySQL + Ollama (falls back to text concat if Ollama is offline).
 */

import { randomUUID } from 'crypto';
import db from '../src/db/index.js';
import { getWeekEndingDatesInMonth } from '../src/lib/periods.js';
import { updateSummaryForDate } from '../src/services/summarize.js';
import { JUNE_2026_TRANSCRIPTS } from './mock-transcripts.js';

const MOCK_USER_EMAIL = (process.env.MOCK_USER_EMAIL ?? 'mock@data.rember').trim().toLowerCase();
const YEAR = Number(process.env.MOCK_YEAR ?? 2026);
const END_OF_WEEK_DAY = process.env.MOCK_END_OF_WEEK ?? 'sun';

async function findOrCreateUser(email) {
  let row = await db
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .get(email);

  if (!row) {
    const id = randomUUID();
    await db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);
    row = { id, email };
    console.log(`Created user ${email}`);
  } else {
    console.log(`Using user ${email}`);
  }

  return row;
}

async function clearUserData(userId) {
  await db.prepare('DELETE FROM summaries WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM recordings WHERE user_id = ?').run(userId);
}

async function insertTranscript(userId, date, transcript, index) {
  const id = randomUUID();
  const hour = 8 + (index % 10);
  const minute = (index * 17) % 60;
  const recordedAt = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;

  await db
    .prepare(
      `INSERT INTO recordings
         (id, filename, mime_type, duration_ms, recorded_at, recorded_date, transcript_status, user_id, transcript)
       VALUES (?, ?, 'audio/webm', ?, ?, ?, 'done', ?, ?)`,
    )
    .run(id, `${id}.webm`, 45_000 + index * 12_000, recordedAt, date, userId, transcript);
}

async function seedTranscripts(userId, transcriptMap) {
  let count = 0;
  for (const [date, notes] of Object.entries(transcriptMap)) {
    for (let i = 0; i < notes.length; i += 1) {
      await insertTranscript(userId, date, notes[i], count);
      count += 1;
    }
  }
  console.log(`  inserted ${count} mock recordings across ${Object.keys(transcriptMap).length} days`);
}

async function generateSummariesForDates(userId, dates) {
  const sorted = [...dates].sort();
  for (const date of sorted) {
    console.log(`  summarizing ${date}…`);
    await updateSummaryForDate(date, userId);
  }
}

async function main() {
  await db.initDb();

  const user = await findOrCreateUser(MOCK_USER_EMAIL);
  await clearUserData(user.id);

  console.log('\nSeeding voice transcripts for June…');
  await seedTranscripts(user.id, JUNE_2026_TRANSCRIPTS);

  const dates = Object.keys(JUNE_2026_TRANSCRIPTS);
  console.log('\nGenerating summaries via app prompts (daily → weekly → monthly)…');
  await generateSummariesForDates(user.id, dates);

  const counts = await db
    .prepare(
      `SELECT summary_type AS type, COUNT(*) AS count
       FROM summaries WHERE user_id = ?
       GROUP BY summary_type`,
    )
    .all(user.id);

  const weekEnds = getWeekEndingDatesInMonth(YEAR, 5, END_OF_WEEK_DAY);

  console.log('\n── seed complete ──');
  console.log(`User: ${MOCK_USER_EMAIL}`);
  console.log('Counts:', Object.fromEntries(counts.map((r) => [r.type, r.count])));
  console.log('\nLog in with this email, then open Timeline:');
  console.log(`  • June ${YEAR} — daily dots Mon–Sat, weekly on ${weekEnds.join(', ')}`);
  console.log(`  • June 30 — monthly summary`);
  console.log('OTP prints in the backend console after send-code.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
