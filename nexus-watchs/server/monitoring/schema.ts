import type { Pool } from "pg";

async function tryQuery(pool: Pool, sql: string, params: unknown[] = []) {
  try {
    await pool.query(sql, params);
    return true;
  } catch {
    return false;
  }
}

export async function ensureMonitoringSchema(pool: Pool) {
  await tryQuery(pool, "CREATE EXTENSION IF NOT EXISTS timescaledb");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hosts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      hostname TEXT UNIQUE,
      token TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      location TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      last_seen TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS metrics (
      time TIMESTAMPTZ NOT NULL,
      host_id INT REFERENCES hosts(id) ON DELETE CASCADE,
      host TEXT NOT NULL,
      device_id INT REFERENCES devices(id) ON DELETE SET NULL,
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
    )
  `);

  await tryQuery(pool, "SELECT create_hypertable('metrics', 'time', if_not_exists => TRUE)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_metrics_host_time ON metrics (host, time DESC)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS triggers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      expression TEXT NOT NULL,
      threshold FLOAT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      trigger_id INT REFERENCES triggers(id) ON DELETE CASCADE,
      device_id INT REFERENCES devices(id) ON DELETE SET NULL,
      host TEXT NOT NULL,
      expression TEXT NOT NULL,
      value FLOAT NOT NULL,
      threshold FLOAT NOT NULL,
      alert_type TEXT NOT NULL DEFAULT 'threshold',
      fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_alerts_fired ON alerts (fired_at DESC)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_queue (
      id SERIAL PRIMARY KEY,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON alert_queue(status, created_at)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      document TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      plan TEXT DEFAULT 'basic',
      status TEXT DEFAULT 'active',
      telegram_token TEXT DEFAULT '',
      telegram_chat_id TEXT DEFAULT '',
      alert_email TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE devices ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)");
  await pool.query("ALTER TABLE triggers ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE");

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'superadmin'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitoring_identities (
      id SERIAL PRIMARY KEY,
      supabase_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'client',
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_monitoring_identities_client ON monitoring_identities(client_id)");

  await pool.query(`
    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'other',
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS snmp_community TEXT DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS snmp_version TEXT DEFAULT '2c',
      ADD COLUMN IF NOT EXISTS ssh_user TEXT,
      ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22,
      ADD COLUMN IF NOT EXISTS monitor_ping BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS monitor_snmp BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS monitor_agent BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''
  `);

  await pool.query(`
    ALTER TABLE triggers
      ADD COLUMN IF NOT EXISTS device_type TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_alerts_client ON alerts(client_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_triggers_client ON triggers(client_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_devices_tags ON devices USING GIN(tags)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip_address)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solar_inverters (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT DEFAULT '',
      location TEXT DEFAULT '',
      capacity_kwp FLOAT DEFAULT 0,
      tariff_kwh FLOAT DEFAULT 0.85,
      status TEXT DEFAULT 'active',
      growatt_user TEXT DEFAULT '',
      growatt_pass TEXT DEFAULT '',
      growatt_plant_id TEXT DEFAULT '',
      fronius_ip TEXT DEFAULT '',
      fronius_device_id INTEGER DEFAULT 1,
      solarman_token TEXT DEFAULT '',
      solarman_app_id TEXT DEFAULT '',
      solarman_logger_sn TEXT DEFAULT '',
      sma_user TEXT DEFAULT '',
      sma_pass TEXT DEFAULT '',
      sma_plant_id TEXT DEFAULT '',
      goodwe_user TEXT DEFAULT '',
      goodwe_pass TEXT DEFAULT '',
      goodwe_station_id TEXT DEFAULT '',
      huawei_user TEXT DEFAULT '',
      huawei_pass TEXT DEFAULT '',
      huawei_station_id TEXT DEFAULT '',
      api_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      api_type TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solar_metrics (
      time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      inverter_id INTEGER REFERENCES solar_inverters(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id),
      power_w FLOAT DEFAULT 0,
      energy_today_kwh FLOAT DEFAULT 0,
      energy_month_kwh FLOAT DEFAULT 0,
      energy_total_kwh FLOAT DEFAULT 0,
      voltage_pv FLOAT DEFAULT 0,
      voltage_ac FLOAT DEFAULT 0,
      current_ac FLOAT DEFAULT 0,
      frequency_hz FLOAT DEFAULT 50,
      temperature_c FLOAT DEFAULT 0,
      revenue_today FLOAT DEFAULT 0,
      revenue_month FLOAT DEFAULT 0,
      revenue_total FLOAT DEFAULT 0,
      inverter_status TEXT DEFAULT 'unknown',
      fault_code TEXT DEFAULT '',
      last_update TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await tryQuery(pool, "SELECT create_hypertable('solar_metrics', 'time', if_not_exists => TRUE)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_solar_inverters_client ON solar_inverters(client_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_solar_metrics_inverter ON solar_metrics(inverter_id, time DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_solar_metrics_client ON solar_metrics(client_id, time DESC)");

  await pool.query(`
    CREATE OR REPLACE VIEW latest_metrics AS
    SELECT DISTINCT ON (m.host)
      m.host, m.cpu, m.memory, m.disk_percent,
      m.net_rx_bytes, m.net_tx_bytes, m.latency_ms,
      m.uptime_seconds, m.load_avg, m.processes,
      m.temperature, m.time, m.device_id,
      d.name as device_name, d.location, d.description
    FROM metrics m
    LEFT JOIN devices d ON m.device_id = d.id
    WHERE m.time > NOW() - INTERVAL '5 minutes'
    ORDER BY m.host, m.time DESC
  `);

  await pool.query(`
    INSERT INTO triggers (name, expression, threshold)
    SELECT v.name, v.expression, v.threshold
    FROM (
      VALUES
        ('High CPU', 'cpu', 80::float),
        ('High Memory', 'memory', 85::float),
        ('High Disk', 'disk_percent', 90::float),
        ('High Latency', 'latency_ms', 500::float),
        ('High Load', 'load_avg', 5::float)
    ) AS v(name, expression, threshold)
    WHERE NOT EXISTS (SELECT 1 FROM triggers t WHERE t.name = v.name)
  `);

  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_name_unique ON clients (name)");

  await pool.query(`
    INSERT INTO clients (name, plan, status, notes)
    VALUES ('Minha Empresa', 'enterprise', 'active', 'Cliente padrão — dispositivos existentes')
    ON CONFLICT (name) DO NOTHING
  `);

  await pool.query(`
    UPDATE devices SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL
  `);
  await pool.query(`
    UPDATE triggers SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL
  `);
  await pool.query(`
    UPDATE users SET role = 'superadmin' WHERE client_id IS NULL
  `);
}
