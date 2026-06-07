import { execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import db from '../db/index.js';
import { getGroqWhisperModel, groqTranscribe, isGroqConfigured } from './groq.js';
import { updateDailySummary } from './summarize.js';

const execFileAsync = promisify(execFile);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_WHISPER_MODEL = process.env.OPENAI_WHISPER_MODEL ?? 'whisper-1';
const WHISPER_BIN = process.env.WHISPER_BIN ?? 'whisper';
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'small';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE ?? 'en';
const SILENCE_MEAN_DB = Number(process.env.WHISPER_SILENCE_DB ?? -45);

function explainWhisperError(stderr = '') {
  if (stderr.includes('SHA256 checksum')) {
    return `Whisper model "${WHISPER_MODEL}" download is corrupt — run: rm ~/.cache/whisper/${WHISPER_MODEL}.pt, then retry`;
  }
  return stderr.trim() || 'whisper failed';
}

async function saveTranscript(id, status, text = null) {
  await db
    .prepare(`UPDATE recordings SET transcript_status = ?, transcript = ? WHERE id = ?`)
    .run(status, text, id);
}

async function convertToWav(inputPath, outputPath) {
  await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', outputPath]);
}

async function measureMeanVolume(wavPath) {
  const { stderr } = await execFileAsync('ffmpeg', [
    '-i',
    wavPath,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  const match = stderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
  return match ? Number(match[1]) : null;
}

function runWhisper(wavPath, outputDir) {
  return new Promise((resolve, reject) => {
    const args = [
      wavPath,
      '--model',
      WHISPER_MODEL,
      '--language',
      WHISPER_LANGUAGE,
      '--output_format',
      'txt',
      '--output_dir',
      outputDir,
      '--verbose',
      'False',
      '--condition_on_previous_text',
      'False',
      '--no_speech_threshold',
      '0.6',
    ];

    const child = spawn(WHISPER_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let spawnFailed = false;

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      spawnFailed = true;
      if (err.code === 'ENOENT') {
        reject(new Error('whisper not found — install with: brew install openai-whisper'));
        return;
      }
      reject(err);
    });

    child.on('close', (code) => {
      if (spawnFailed) return;
      if (code !== 0) {
        reject(new Error(explainWhisperError(stderr) || `whisper exited ${code}`));
        return;
      }
      resolve();
    });
  });
}

function readTranscript(outputDir, wavPath) {
  const basename = path.basename(wavPath, path.extname(wavPath));
  const txtPath = path.join(outputDir, `${basename}.txt`);
  return fs.readFileSync(txtPath, 'utf8').trim();
}

async function transcribeWithOpenAI(audioPath, mimeType) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const file = new File([audioBuffer], path.basename(audioPath), {
    type: mimeType ?? 'audio/webm',
  });
  const form = new FormData();
  form.append('file', file);
  form.append('model', OPENAI_WHISPER_MODEL);
  form.append('language', WHISPER_LANGUAGE);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI transcription failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.text?.trim() ?? '';
}

async function transcribeWithLocalWhisper(audioPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rember-whisper-'));
  const wavPath = path.join(tmpDir, 'input.wav');
  const outDir = path.join(tmpDir, 'out');
  fs.mkdirSync(outDir);

  try {
    await convertToWav(audioPath, wavPath);

    const meanVolume = await measureMeanVolume(wavPath);
    if (meanVolume !== null && meanVolume < SILENCE_MEAN_DB) {
      return { status: 'silent', text: null, detail: `mean ${meanVolume} dB` };
    }

    await runWhisper(wavPath, outDir);
    return { status: 'done', text: readTranscript(outDir, wavPath) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function finishTranscript({ id, recordedAt, recordedDate, userId, text, status, detail }) {
  const date = recordedDate ?? recordedAt.slice(0, 10);

  if (status === 'silent') {
    await saveTranscript(id, 'silent');
    console.log(`\n── transcript ${id} (${recordedAt}) ──\n[silent recording — ${detail}]\n`);
    return;
  }

  if (!text) {
    await saveTranscript(id, 'empty');
    console.log(`\n── transcript ${id} (${recordedAt}) ──\n[no speech detected]\n`);
    return;
  }

  await saveTranscript(id, 'done', text);
  console.log(`\n── transcript ${id} (${recordedAt}) ──\n${text}\n`);

  if (userId) {
    await updateDailySummary(date, userId);
  }
}

async function transcribeRecordingAsync(audioPath, { id, recordedAt, recordedDate, userId, mimeType }) {
  try {
    if (isGroqConfigured()) {
      const text = await groqTranscribe(audioPath, mimeType);
      console.log(`[transcribe] ${id} via ${getGroqWhisperModel()}`);
      await finishTranscript({ id, recordedAt, recordedDate, userId, text, status: 'done' });
      return;
    }

    if (OPENAI_API_KEY) {
      const text = await transcribeWithOpenAI(audioPath, mimeType);
      console.log(`[transcribe] ${id} via ${OPENAI_WHISPER_MODEL}`);
      await finishTranscript({ id, recordedAt, recordedDate, userId, text, status: 'done' });
      return;
    }

    const result = await transcribeWithLocalWhisper(audioPath);
    await finishTranscript({
      id,
      recordedAt,
      recordedDate,
      userId,
      text: result.text,
      status: result.status,
      detail: result.detail,
    });
  } catch (err) {
    await saveTranscript(id, 'failed');
    throw err;
  }
}

export function transcribeRecording(audioPath, meta) {
  void transcribeRecordingAsync(audioPath, meta).catch((err) => {
    console.error(`[transcribe] ${meta.id}: ${err.message}`);
  });
}
