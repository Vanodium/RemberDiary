import { execFile, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const WHISPER_BIN = process.env.WHISPER_BIN ?? 'whisper';
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'base';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE ?? 'en';
const SILENCE_MEAN_DB = Number(process.env.WHISPER_SILENCE_DB ?? -45);

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
        reject(new Error(stderr.trim() || `whisper exited ${code}`));
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

async function transcribeRecordingAsync(audioPath, { id, recordedAt }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rember-whisper-'));
  const wavPath = path.join(tmpDir, 'input.wav');
  const outDir = path.join(tmpDir, 'out');
  fs.mkdirSync(outDir);

  try {
    await convertToWav(audioPath, wavPath);

    const meanVolume = await measureMeanVolume(wavPath);
    if (meanVolume !== null && meanVolume < SILENCE_MEAN_DB) {
      console.log(
        `\n── transcript ${id} (${recordedAt}) ──\n[silent recording — mean ${meanVolume} dB, check microphone permissions/device]\n`,
      );
      return;
    }

    await runWhisper(wavPath, outDir);
    const text = readTranscript(outDir, wavPath);

    if (!text) {
      console.log(`\n── transcript ${id} (${recordedAt}) ──\n[no speech detected]\n`);
      return;
    }

    console.log(`\n── transcript ${id} (${recordedAt}) ──\n${text}\n`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function transcribeRecording(audioPath, meta) {
  void transcribeRecordingAsync(audioPath, meta).catch((err) => {
    console.error(`[transcribe] ${meta.id}: ${err.message}`);
  });
}
