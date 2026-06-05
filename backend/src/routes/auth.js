import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendLoginCode, updateUserSettings, verifyLoginCode } from '../services/auth.js';

const router = Router();

router.post('/send-code', async (req, res, next) => {
  try {
    const result = await sendLoginCode(req.body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/verify-code', (req, res, next) => {
  try {
    const result = verifyLoginCode(req.body.email, req.body.code);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid code' || err.message.includes('expired') || err.message.includes('No code')) {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, (req, res, next) => {
  try {
    const user = updateUserSettings(req.user.id, {
      timezone: req.body.timezone,
      endOfWeekDay: req.body.endOfWeekDay,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
