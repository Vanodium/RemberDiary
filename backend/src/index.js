import cors from 'cors';
import express from 'express';
import recordingsRouter from './routes/recordings.js';
import summariesRouter from './routes/summaries.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/recordings', recordingsRouter);
app.use('/api/summaries', summariesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Rember API listening on http://localhost:${PORT}`);
});
