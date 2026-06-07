import { clearToken, getToken } from './authStorage';

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? 'https://rember-api.onrender.com/api' : '/api');

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

function normalizeUploadMimeType(mimeType) {
  const type = mimeType.toLowerCase();
  if (type.startsWith('audio/')) return type;
  if (type === 'video/mp4') return 'audio/mp4';
  if (type === 'video/webm') return 'audio/webm';
  return mimeType;
}

export async function uploadRecording({ blob, mimeType, durationMs, recordedAt, recordedDate }) {
  const uploadMimeType = normalizeUploadMimeType(mimeType);
  const form = new FormData();
  const ext = uploadMimeType.includes('webm')
    ? 'webm'
    : uploadMimeType.includes('mp4')
      ? 'm4a'
      : 'audio';
  form.append('audio', new Blob([blob], { type: uploadMimeType }), `recording.${ext}`);
  form.append('durationMs', String(durationMs));
  form.append('recordedAt', recordedAt);
  form.append('recordedDate', recordedDate ?? recordedAt.slice(0, 10));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    return await apiFetch('/recordings', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRecordings() {
  return apiFetch('/recordings');
}

export async function fetchSummaries() {
  return apiFetch('/summaries');
}
