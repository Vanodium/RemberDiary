async function columnNames(pool, table) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return rows.map((col) => col.name);
}

export async function addColumnIfMissing(pool, table, column, definition) {
  if (!(await columnNames(pool, table)).includes(column)) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export async function runMigrations(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
      end_of_week_day VARCHAR(8) NOT NULL DEFAULT 'sun',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      email VARCHAR(255) PRIMARY KEY,
      code_hash VARCHAR(64) NOT NULL,
      expires_at VARCHAR(32) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);

  await addColumnIfMissing(pool, 'recordings', 'recorded_date', 'VARCHAR(10)');
  await addColumnIfMissing(pool, 'recordings', 'transcript', 'TEXT');
  await addColumnIfMissing(
    pool,
    'recordings',
    'transcript_status',
    "VARCHAR(16) NOT NULL DEFAULT 'pending'",
  );
  await addColumnIfMissing(pool, 'recordings', 'user_id', 'VARCHAR(36)');
  await addColumnIfMissing(
    pool,
    'summaries',
    'summary_type',
    "VARCHAR(16) NOT NULL DEFAULT 'daily'",
  );

  await pool.execute(
    `UPDATE recordings
     SET recorded_date = SUBSTRING(recorded_at, 1, 10)
     WHERE recorded_date IS NULL`,
  );
}
