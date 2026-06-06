import { createHash, randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { sendOtpEmail } from './email.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '30d';
const OTP_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function hashCode(code) {
  return createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    timezone: row.timezone,
    endOfWeekDay: row.end_of_week_day,
  };
}

export async function sendLoginCode(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required');
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await db
    .prepare(
      `INSERT INTO otp_codes (email, code_hash, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         code_hash = VALUES(code_hash),
         expires_at = VALUES(expires_at),
         created_at = CURRENT_TIMESTAMP(3)`,
    )
    .run(email, hashCode(code), expiresAt);

  await sendOtpEmail(email, code);
  return { email };
}

async function findOrCreateUser(email) {
  let row = await db
    .prepare(
      `SELECT id, email, timezone, end_of_week_day
       FROM users WHERE email = ?`,
    )
    .get(email);

  if (!row) {
    const id = randomUUID();
    await db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(id, email);
    row = await db
      .prepare(
        `SELECT id, email, timezone, end_of_week_day
         FROM users WHERE id = ?`,
      )
      .get(id);
  }

  return formatUser(row);
}

export async function verifyLoginCode(rawEmail, rawCode) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();

  if (!email || !code) {
    throw new Error('Email and code are required');
  }

  const otp = await db
    .prepare('SELECT code_hash, expires_at FROM otp_codes WHERE email = ?')
    .get(email);

  if (!otp) {
    throw new Error('No code sent for this email');
  }

  if (new Date(otp.expires_at) < new Date()) {
    await db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);
    throw new Error('Code expired — request a new one');
  }

  if (otp.code_hash !== hashCode(code)) {
    throw new Error('Invalid code');
  }

  await db.prepare('DELETE FROM otp_codes WHERE email = ?').run(email);

  const user = await findOrCreateUser(email);
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token, user };
}

export async function getUserById(id) {
  const row = await db
    .prepare(
      `SELECT id, email, timezone, end_of_week_day
       FROM users WHERE id = ?`,
    )
    .get(id);
  return formatUser(row);
}

export async function updateUserSettings(id, { timezone, endOfWeekDay }) {
  const row = await db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!row) throw new Error('User not found');

  if (timezone !== undefined) {
    await db.prepare('UPDATE users SET timezone = ? WHERE id = ?').run(timezone, id);
  }
  if (endOfWeekDay !== undefined) {
    await db.prepare('UPDATE users SET end_of_week_day = ? WHERE id = ?').run(endOfWeekDay, id);
  }

  return getUserById(id);
}

export async function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  return getUserById(payload.sub);
}
