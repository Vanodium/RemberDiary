import db from '../db/index.js';

const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:1b';

const SYSTEM_PROMPT = `You turn raw voice journal transcripts into a short first-person daily highlight.
Write 2–3 sentences in past tense — warm, reflective, like the person wrote it themselves.
Capture the key moments and overall mood. Merge multiple notes into one coherent entry.
Do not mention recording, transcription, or that these were voice notes.`;

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

function explainOllamaError(err, body = '') {
  if (err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('fetch failed')) {
    return 'Ollama is not running — open the Ollama app from Applications, or run: ollama serve';
  }
  if (body.includes('llama-server binary not found')) {
    return 'Homebrew Ollama is missing runtime binaries — install the app from https://ollama.com/download';
  }
  return err?.message ?? 'unknown error';
}

async function callOllama(transcripts) {
  let res;
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcripts.join('\n\n') },
      ],
      stream: false,
      options: {
        temperature: 0.6,
        num_predict: 180,
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

async function generateSummary(transcripts) {
  if (transcripts.length === 0) return '';

  try {
    const content = await callOllama(transcripts);
    if (content) {
      console.log(`[summarize] ${OLLAMA_MODEL} via Ollama`);
      return content;
    }
  } catch (err) {
    console.warn(`[summarize] Ollama unavailable (${OLLAMA_MODEL}): ${err.message}`);
    console.warn('[summarize] Fix: open Ollama.app, then run: ollama pull llama3.2:1b');
  }

  console.log('[summarize] using text fallback');
  return fallbackSummary(transcripts);
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
