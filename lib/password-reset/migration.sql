-- Ejecutar una sola vez en la base de datos de ecos (Cloud SQL Postgres)
-- psql -h 127.0.0.1 -U usuario_dash -d postgres -f migration.sql

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email_active
  ON password_resets (LOWER(email), expires_at)
  WHERE used_at IS NULL;
