-- Smart Asset PostgreSQL Schema
-- High-integrity asset & equipment reservation persistence

CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  max_duration INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(16) PRIMARY KEY,
  asset_id VARCHAR(16) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_reservations_asset_id ON reservations(asset_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_date, end_date);
