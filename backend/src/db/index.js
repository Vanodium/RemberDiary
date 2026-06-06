import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, 'audio'), { recursive: true });

const poolConfig = {
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? 'rember',
  password: process.env.MYSQL_PASSWORD ?? 'rember',
  database: process.env.MYSQL_DATABASE ?? 'rember',
  waitForConnections: true,
  connectionLimit: 10,
};

let pool;

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    password: poolConfig.password,
  });

  await connection.execute(
    `CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

export function prepare(sql) {
  return {
    async run(...params) {
      const [result] = await pool.execute(sql, params);
      return result;
    },
    async get(...params) {
      const [rows] = await pool.execute(sql, params);
      return rows[0] ?? undefined;
    },
    async all(...params) {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
  };
}

export async function exec(sql) {
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.execute(statement);
  }
}

export async function initDb() {
  await ensureDatabase();
  pool = mysql.createPool(poolConfig);

  await exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id VARCHAR(36) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      duration_ms INT,
      recorded_at VARCHAR(32) NOT NULL,
      recorded_date VARCHAR(10),
      transcript TEXT,
      transcript_status VARCHAR(16) NOT NULL DEFAULT 'pending',
      user_id VARCHAR(36),
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      date VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      summary_type VARCHAR(16) NOT NULL DEFAULT 'daily',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY summaries_user_date (user_id, date)
    )
  `);

  await runMigrations(pool);
}

const db = { prepare, exec, initDb };

export default db;
