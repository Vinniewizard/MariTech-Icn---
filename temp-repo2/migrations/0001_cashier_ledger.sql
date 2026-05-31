CREATE TABLE IF NOT EXISTS credited_deposits (
  tx_hash TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  user_id TEXT NOT NULL,
  credited_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
  withdraw_order_id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  user_id TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  binance_id TEXT
);

