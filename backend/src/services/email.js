import nodemailer from 'nodemailer';
import { parseIsoDate } from '../lib/periods.js';

const FROM = process.env.EMAIL_FROM ?? 'Rember <noreply@rember.app>';

const BUILTIN_IGNORED = new Set(['test@data', 'mock@data.rember']);

let transporter;

function parseFrom(from) {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: 'Rember', email: from.trim() };
}

function ignoredEmails() {
  const fromEnv = (process.env.EMAIL_IGNORE ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILTIN_IGNORED, ...fromEnv]);
}

export function isIgnoredEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (ignoredEmails().has(normalized)) return true;
  if (normalized.endsWith('@data.rember')) return true;
  return false;
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Email is not configured. Set BREVO_API_KEY (Render free tier), RESEND_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS.',
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === '1',
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return transporter;
}

async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(FROM),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo failed (${res.status}): ${body}`);
  }
}

async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}

async function sendViaSmtp({ to, subject, text, html }) {
  await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    text,
    html,
  });
}

async function sendMail({ to, subject, text, html }) {
  if (isIgnoredEmail(to)) return;

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to, subject, text, html });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend({ to, subject, text, html });
    return;
  }

  await sendViaSmtp({ to, subject, text, html });
}

function formatWeekEndingDate(iso) {
  return parseIsoDate(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function sendOtpEmail(email, code) {
  const subject = 'Your Rember login code';
  const text = [
    `Your login code is ${code}.`,
    '',
    'It expires in 10 minutes. If you did not request this, you can ignore this email.',
  ].join('\n');

  await sendMail({
    to: email,
    subject,
    text,
    html: `<p>Your login code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendWeeklySummaryEmail(email, weekEndingDate, content) {
  const formattedDate = formatWeekEndingDate(weekEndingDate);
  const subject = `Your weekly recap — ${formattedDate}`;
  const text = [`Week ending ${formattedDate}`, '', content].join('\n');
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  await sendMail({
    to: email,
    subject,
    text,
    html: `<p><strong>Week ending ${formattedDate}</strong></p><p>${escaped}</p>`,
  });
}
