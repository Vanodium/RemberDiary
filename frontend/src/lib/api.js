import { clearToken, getToken } from './authStorage';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event('rember:unauthorized'));
  }

  return parseJson(res);
}

export async function sendLoginCode(email) {
  return apiFetch('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyLoginCode(email, code) {
  return apiFetch('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function fetchMe() {
  return apiFetch('/auth/me');
}

export async function updateUserSettings(settings) {
  return apiFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function uploadRecording({ blob, mimeType, durationMs, recordedAt, recordedDate }) {
  const form = new FormData();
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'audio';
  form.append('audio', blob, `recording.${ext}`);
  form.append('durationMs', String(durationMs));
  form.append('recordedAt', recordedAt);
  form.append('recordedDate', recordedDate ?? recordedAt.slice(0, 10));

  return apiFetch('/recordings', {
    method: 'POST',
    body: form,
  });
}

export async function fetchRecordings() {
  return apiFetch('/recordings');
}

export async function fetchSummaries() {
  return apiFetch('/summaries');
}
