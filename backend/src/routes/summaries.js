import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT id, date, content FROM summaries ORDER BY date DESC')
    .all();

  const summaries = Object.fromEntries(
    rows.map((row) => [row.date, { id: row.id, content: row.content }]),
  );

  res.json({ summaries });
});

export default router;
