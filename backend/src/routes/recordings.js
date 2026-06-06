import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
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

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .prepare(
        `SELECT id, mime_type AS mimeType, duration_ms AS durationMs,
                recorded_at AS recordedAt, created_at AS createdAt
         FROM recordings
         WHERE user_id = ?
         ORDER BY recorded_at DESC`,
      )
      .all(req.user.id);

    res.json({ recordings: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const id = randomUUID();
    const durationMs = req.body.durationMs ? Number(req.body.durationMs) : null;
    const recordedAt = req.body.recordedAt ?? new Date().toISOString();
    const recordedDate = req.body.recordedDate ?? recordedAt.slice(0, 10);

    await db
      .prepare(
        `INSERT INTO recordings
           (id, filename, mime_type, duration_ms, recorded_at, recorded_date, transcript_status, user_id)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(
        id,
        req.file.filename,
        req.file.mimetype,
        durationMs,
        recordedAt,
        recordedDate,
        req.user.id,
      );

    const row = await db
      .prepare(
        `SELECT id, mime_type AS mimeType, duration_ms AS durationMs,
                recorded_at AS recordedAt, created_at AS createdAt
         FROM recordings WHERE id = ?`,
      )
      .get(id);

    res.status(201).json(row);

    transcribeRecording(path.join(audioDir, req.file.filename), {
      id,
      recordedAt,
      recordedDate,
      userId: req.user.id,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const row = await db
      .prepare('SELECT filename FROM recordings WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    await db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);

    const filePath = path.join(audioDir, row.filename);
    fs.unlink(filePath, () => {});

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
