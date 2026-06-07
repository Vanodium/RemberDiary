import nodemailer from 'nodemailer';
import { parseIsoDate } from '../lib/periods.js';

const FROM = process.env.EMAIL_FROM ?? 'Rember <noreply@rember.app>';

const BUILTIN_IGNORED = new Set(['test@data', 'mock@data.rember']);

let transporter;

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
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be set to send email');
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === '1',
    auth: { user, pass },
  });

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (isIgnoredEmail(to)) return;

  await getTransporter().sendMail({
    from: FROM,
    to,
    subject,
    text,
    html,
  });
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
