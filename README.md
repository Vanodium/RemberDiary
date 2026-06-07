# Rember — Smart Diary With Highlights
**Demo video:** https://youtu.be/GZJuoHioMI0 

---

**Rember** is a voice-only journaling web application. Users record short spoken chaotic entries from the browser; the backend transcribes them and uses a LLM to produce concise first-person recaps. Summaries roll up automatically into weekly, monthly, and yearly views. A calendar timeline lets users browse past entries, and optional weekly recap emails are sent at the end of each week.

The system consists of:

- **Frontend** — React 19 + Vite, deployed on Vercel
- **Backend** — Node.js / Express REST API, deployed on Render
- **Database** — MySQL 8 (Aiven in production; Docker locally)
- **AI services** — Groq (Whisper transcription + LLM summarization) in production; local Whisper + Ollama as development fallbacks
- **Email** — Brevo API for OTP login codes and weekly recap emails

---
