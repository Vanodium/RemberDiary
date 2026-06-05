import db from '../db/index.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `You turn raw voice journal transcripts into a concise first-person daily journal entry.
Write 2–4 sentences in past tense, warm and reflective — like the person wrote it themselves.
Merge multiple notes from the same day into one coherent entry. Do not mention recording or transcription.`;

function fallbackSummary(transcripts) {
  const text = transcripts
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const sentence = t.charAt(0).toUpperCase() + t.slice(1);
      return sentence.endsWith('.') ? sentence : `${sentence}.`;
    })
    .join(' ');

  return text.trim();
}

async function generateSummary(transcripts) {
  if (transcripts.length === 0) return '';

  if (!OPENAI_API_KEY) {
    return fallbackSummary(transcripts);
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcripts.join('\n\n') },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  return content || fallbackSummary(transcripts);
}

export async function updateDailySummary(date) {
  const rows = db
    .prepare(
      `SELECT transcript FROM recordings
       WHERE recorded_date = ? AND transcript_status = 'done' AND transcript IS NOT NULL
       ORDER BY recorded_at ASC`,
    )
    .all(date);

  if (rows.length === 0) {
    db.prepare('DELETE FROM summaries WHERE date = ?').run(date);
    return null;
  }

  const transcripts = rows.map((row) => row.transcript);
  const content = await generateSummary(transcripts);

  if (!content) {
    db.prepare('DELETE FROM summaries WHERE date = ?').run(date);
    return null;
  }

  db.prepare(
    `INSERT INTO summaries (date, content) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET content = excluded.content`,
  ).run(date, content);

  console.log(`\n── summary ${date} ──\n${content}\n`);
  return content;
}
