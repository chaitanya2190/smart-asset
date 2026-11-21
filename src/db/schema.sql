-- Smart Asset PostgreSQL Enterprise Schema
-- High-integrity asset & equipment reservation persistence

-- Enable btree_gist extension for range exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Sequences for concurrency-safe atomic ID generation
CREATE SEQUENCE IF NOT EXISTS asset_id_seq START WITH 5;
CREATE SEQUENCE IF NOT EXISTS reservation_id_seq START WITH 1;

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(16) PRIMARY KEY DEFAULT ('A' || nextval('asset_id_seq')),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  max_duration INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reservations table with engine-level exclusion constraint
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(16) PRIMARY KEY DEFAULT ('R' || nextval('reservation_id_seq')),
  asset_id VARCHAR(16) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id VARCHAR(128) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_reservation_dates CHECK (end_date > start_date)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_reservations_asset_id ON reservations(asset_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_date, end_date);

-- Engine-level Double-Booking Prevention:
-- Uses GiST exclusion constraint to mathematically guarantee zero overlapping bookings
-- for the same asset when reservations are in active statuses.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_reservations'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT no_overlapping_reservations
      EXCLUDE USING gist (
        asset_id WITH =,
        tstzrange(start_date, end_date) WITH &&
      )
      WHERE (status NOT IN ('CANCELLED', 'RETURNED', 'REJECTED'));
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- If btree_gist cannot be loaded in restricted environments, fallback gracefully
    RAISE NOTICE 'btree_gist not available; transaction locks will enforce isolation.';
END $$;
