function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

export function addColumnIfMissing(db, table, column, definition) {
  if (!columnNames(db, table).includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrateSummariesForUsers(db) {
  if (columnNames(db, 'summaries').includes('user_id')) return;

  db.exec(`
    CREATE TABLE summaries_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );
    DROP TABLE summaries;
    ALTER TABLE summaries_user RENAME TO summaries;
  `);
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      end_of_week_day TEXT NOT NULL DEFAULT 'sun',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  addColumnIfMissing(db, 'recordings', 'recorded_date', 'TEXT');
  addColumnIfMissing(db, 'recordings', 'transcript', 'TEXT');
  addColumnIfMissing(db, 'recordings', 'transcript_status', "TEXT NOT NULL DEFAULT 'pending'");
  addColumnIfMissing(db, 'recordings', 'user_id', 'TEXT');

  migrateSummariesForUsers(db);
  addColumnIfMissing(db, 'summaries', 'summary_type', "TEXT NOT NULL DEFAULT 'daily'");

  db.prepare(
    `UPDATE recordings
     SET recorded_date = substr(recorded_at, 1, 10)
     WHERE recorded_date IS NULL`,
  ).run();
}
