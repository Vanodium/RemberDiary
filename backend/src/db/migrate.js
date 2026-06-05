function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

export function addColumnIfMissing(db, table, column, definition) {
  if (!columnNames(db, table).includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function runMigrations(db) {
  addColumnIfMissing(db, 'recordings', 'recorded_date', 'TEXT');
  addColumnIfMissing(db, 'recordings', 'transcript', 'TEXT');
  addColumnIfMissing(db, 'recordings', 'transcript_status', "TEXT NOT NULL DEFAULT 'pending'");

  db.prepare(
    `UPDATE recordings
     SET recorded_date = substr(recorded_at, 1, 10)
     WHERE recorded_date IS NULL`,
  ).run();
}
