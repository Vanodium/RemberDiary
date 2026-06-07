import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import db, { isDbReady } from './db/index.js';
import authRouter from './routes/auth.js';
import recordingsRouter from './routes/recordings.js';
import summariesRouter from './routes/summaries.js';
import { isGroqConfigured } from './services/groq.js';
import { startWeeklySummaryEmailScheduler } from './services/weeklySummaryEmail.js';

function transcriptionProvider() {
  if (isGroqConfigured()) return 'groq';
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  return 'local';
}

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    db: isDbReady(),
    transcription: transcriptionProvider(),
  });
});

app.use((req, res, next) => {
  if (isDbReady()) {
    next();
    return;
  }
  res.status(503).json({ error: 'Service starting up' });
});

app.use('/api/auth', authRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/summaries', summariesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Rember API listening on http://localhost:${PORT}`);
});

try {
  await db.initDb();

  if (
    process.env.RENDER === 'true' &&
    !process.env.GROQ_API_KEY?.trim() &&
    !process.env.OPENAI_API_KEY?.trim()
  ) {
    console.warn(
      '[startup] GROQ_API_KEY (or OPENAI_API_KEY) is not set — transcription will fail on Render',
    );
  }

  startWeeklySummaryEmailScheduler();
} catch (err) {
  console.error(err);
  process.exit(1);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Free it with:`);
    console.error(`  lsof -ti :${PORT} | xargs kill -9`);
    process.exit(1);
  }
  throw err;
});
