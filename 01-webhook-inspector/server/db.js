import Database from 'better-sqlite3';

const db = new Database('webhooks.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id          TEXT PRIMARY KEY,
    channel_id  TEXT NOT NULL,
    method      TEXT NOT NULL,
    headers     TEXT NOT NULL,
    body        TEXT,
    received_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_channel ON requests(channel_id);
`);

export const saveRequest = db.prepare(
  `INSERT INTO requests (id, channel_id, method, headers, body, received_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

export const getRequests = db.prepare(
  `SELECT * FROM requests WHERE channel_id = ? ORDER BY received_at DESC LIMIT 50`
);

export const getRequest = db.prepare(
  `SELECT * FROM requests WHERE id = ?`
);
