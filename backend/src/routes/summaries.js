import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .prepare(
        `SELECT id, date, content, summary_type AS summaryType FROM summaries
         WHERE user_id = ?
         ORDER BY date DESC`,
      )
      .all(req.user.id);

    const summaries = Object.fromEntries(
      rows.map((row) => [
        row.date,
        { id: row.id, content: row.content, summaryType: row.summaryType },
      ]),
    );

    res.json({ summaries });
  } catch (err) {
    next(err);
  }
});

export default router;
