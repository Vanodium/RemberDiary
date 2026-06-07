import fs from 'fs';
import path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';
const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE ?? 'en';

export function isGroqConfigured() {
  return Boolean(GROQ_API_KEY);
}

export function getGroqChatModel() {
  return GROQ_CHAT_MODEL;
}

export function getGroqWhisperModel() {
  return GROQ_WHISPER_MODEL;
}

async function groqFetch(pathname, init = {}) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const res = await fetch(`${GROQ_BASE}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq request failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function groqTranscribe(audioPath, mimeType) {
  const audioBuffer = fs.readFileSync(audioPath);
  const file = new File([audioBuffer], path.basename(audioPath), {
    type: mimeType ?? 'audio/webm',
  });
  const form = new FormData();
  form.append('file', file);
  form.append('model', GROQ_WHISPER_MODEL);
  form.append('language', WHISPER_LANGUAGE);
  form.append('response_format', 'json');

  const data = await groqFetch('/audio/transcriptions', {
    method: 'POST',
    body: form,
  });

  return data.text?.trim() ?? '';
}

export async function groqChat({ system, user, maxTokens = 300, temperature = 0.3 }) {
  const data = await groqFetch('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const choice = data.choices?.[0];
  const raw = choice?.message?.content?.trim() ?? '';

  if (choice?.finish_reason === 'length' && raw) {
    console.warn(`[groq] ${GROQ_CHAT_MODEL} hit token limit (${maxTokens})`);
  }

  return raw;
}
