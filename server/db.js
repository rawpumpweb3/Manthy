const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'manthy.db'));

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

// ===== CREATE TABLES =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    wallet TEXT PRIMARY KEY,
    mthy_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS staked_nfts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    token_id TEXT NOT NULL,
    collection_addr TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    hp INTEGER DEFAULT 100,
    staked_at TEXT DEFAULT (datetime('now')),
    last_fed TEXT DEFAULT (datetime('now')),
    last_earned TEXT DEFAULT (datetime('now')),
    UNIQUE(wallet, token_id, collection_addr),
    FOREIGN KEY (wallet) REFERENCES users(wallet)
  );

  CREATE TABLE IF NOT EXISTS museum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id TEXT NOT NULL,
    collection_addr TEXT NOT NULL,
    name TEXT,
    image_url TEXT,
    original_owner TEXT,
    caught_by TEXT,
    reason TEXT,
    caught_at TEXT DEFAULT (datetime('now')),
    earn_rate REAL DEFAULT 16
  );

  CREATE TABLE IF NOT EXISTS feed_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet TEXT NOT NULL,
    token_id TEXT NOT NULL,
    cost REAL DEFAULT 100,
    fed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_config (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Insert default config if not exists
const insertConfig = db.prepare('INSERT OR IGNORE INTO game_config (key, value) VALUES (?, ?)');
insertConfig.run('earn_rate_per_day', '80');
insertConfig.run('feed_cost', '100');
insertConfig.run('hp_decay_per_day', '20');
insertConfig.run('museum_earn_rate', '16');
insertConfig.run('game_start', new Date().toISOString());
insertConfig.run('max_survivors', '20');

module.exports = db;
