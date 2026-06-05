import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { transcribeRecording } from '../services/transcribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(__dirname, '../../data/audio');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, audioDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

const router = Router();

router.get('/', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, mime_type AS mimeType, duration_ms AS durationMs,
              recorded_at AS recordedAt, created_at AS createdAt
       FROM recordings
       ORDER BY recorded_at DESC`,
    )
    .all();

  res.json({ recordings: rows });
});

router.post('/', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const id = randomUUID();
  const durationMs = req.body.durationMs ? Number(req.body.durationMs) : null;
  const recordedAt = req.body.recordedAt ?? new Date().toISOString();

  db.prepare(
    `INSERT INTO recordings (id, filename, mime_type, duration_ms, recorded_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.file.filename, req.file.mimetype, durationMs, recordedAt);

  const row = db
    .prepare(
      `SELECT id, mime_type AS mimeType, duration_ms AS durationMs,
              recorded_at AS recordedAt, created_at AS createdAt
       FROM recordings WHERE id = ?`,
    )
    .get(id);

  res.status(201).json(row);

  transcribeRecording(path.join(audioDir, req.file.filename), { id, recordedAt });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT filename FROM recordings WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Recording not found' });
  }

  db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);

  const filePath = path.join(audioDir, row.filename);
  fs.unlink(filePath, () => {});

  res.status(204).end();
});

export default router;
