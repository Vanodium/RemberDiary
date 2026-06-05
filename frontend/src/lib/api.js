const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function uploadRecording({ blob, mimeType, durationMs, recordedAt, recordedDate }) {
  const form = new FormData();
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'audio';
  form.append('audio', blob, `recording.${ext}`);
  form.append('durationMs', String(durationMs));
  form.append('recordedAt', recordedAt);
  form.append('recordedDate', recordedDate ?? recordedAt.slice(0, 10));

  const res = await fetch(`${API_BASE}/recordings`, {
    method: 'POST',
    body: form,
  });

  return parseJson(res);
}

export async function fetchRecordings() {
  const res = await fetch(`${API_BASE}/recordings`);
  return parseJson(res);
}

export async function fetchSummaries() {
  const res = await fetch(`${API_BASE}/summaries`);
  return parseJson(res);
}
