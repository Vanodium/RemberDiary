import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, date, content FROM summaries
       WHERE user_id = ?
       ORDER BY date DESC`,
    )
    .all(req.user.id);

  const summaries = Object.fromEntries(
    rows.map((row) => [row.date, { id: row.id, content: row.content }]),
  );

  res.json({ summaries });
});

export default router;
