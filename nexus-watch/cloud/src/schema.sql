CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hostname TEXT,
  token TEXT NOT NULL UNIQUE,
  ingest_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  host TEXT NOT NULL,
  device_id INT REFERENCES devices(id) ON DELETE SET NULL,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  source_product TEXT NOT NULL DEFAULT 'nexus-watch',
  source_agent_name TEXT,
  signature TEXT,
  signature_ts BIGINT,
  cpu DOUBLE PRECISION NOT NULL DEFAULT 0,
  memory DOUBLE PRECISION NOT NULL DEFAULT 0,
  disk_used DOUBLE PRECISION NOT NULL DEFAULT 0,
  disk_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  disk_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_rx_bytes BIGINT NOT NULL DEFAULT 0,
  net_tx_bytes BIGINT NOT NULL DEFAULT 0,
  latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  uptime_seconds BIGINT NOT NULL DEFAULT 0,
  load_avg DOUBLE PRECISION NOT NULL DEFAULT 0,
  processes INT NOT NULL DEFAULT 0,
  temperature DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_metrics_host_time ON metrics(host, time DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_device_time ON metrics(device_id, time DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'devices'
      AND column_name = 'ingest_secret'
  ) THEN
    ALTER TABLE devices ADD COLUMN ingest_secret TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'metrics'
      AND column_name = 'source_product'
  ) THEN
    ALTER TABLE metrics ADD COLUMN source_product TEXT NOT NULL DEFAULT 'nexus-watch';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'metrics'
      AND column_name = 'source_agent_name'
  ) THEN
    ALTER TABLE metrics ADD COLUMN source_agent_name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'metrics'
      AND column_name = 'signature'
  ) THEN
    ALTER TABLE metrics ADD COLUMN signature TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'metrics'
      AND column_name = 'signature_ts'
  ) THEN
    ALTER TABLE metrics ADD COLUMN signature_ts BIGINT;
  END IF;
END $$;

