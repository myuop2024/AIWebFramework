-- Migration: Add missing columns to reports table for analytics and reporting
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS polling_station_id INTEGER REFERENCES polling_stations(id),
  ADD COLUMN IF NOT EXISTS description TEXT; 