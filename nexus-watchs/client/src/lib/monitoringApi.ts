type MonitoringFetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

export class MonitoringApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown
  ) {
    super(message);
    this.name = "MonitoringApiError";
  }
}

async function monitoringFetch<T>(path: string, options: MonitoringFetchOptions = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new MonitoringApiError("Unauthorized", 401, null);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new MonitoringApiError(String(message), res.status, data);
  }

  return data as T;
}

export type MonitoringMeResponse = {
  role: "superadmin" | "client";
  client_id: number | null;
  supabase_id: string;
};

export type MonitoringClient = {
  id: number;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  plan: string;
  status: string;
  telegram_token: string;
  telegram_chat_id: string;
  alert_email: string;
  notes: string;
  created_at: string;
};

export type MonitoringDevice = {
  id: number;
  name: string;
  hostname: string | null;
  token: string;
  description: string;
  location: string;
  status: string;
  last_seen: string | null;
  created_at: string;
  device_type: string;
  ip_address: string | null;
  tags: string[];
  snmp_community: string;
  snmp_version: string;
  ssh_user: string | null;
  ssh_port: number;
  monitor_ping: boolean;
  monitor_snmp: boolean;
  monitor_agent: boolean;
  notes: string;
  client_id: number | null;
  client_name?: string | null;
  last_metric?: string | null;
  last_cpu?: number | null;
  last_memory?: number | null;
  last_latency?: number | null;
};

export type MonitoringTrigger = {
  id: number;
  name: string;
  expression: string;
  threshold: number;
  enabled: boolean;
  created_at?: string;
  device_type?: string | null;
  tags?: string[];
  client_id?: number | null;
};

export type MonitoringAlert = {
  id: number;
  trigger_id: number | null;
  device_id: number | null;
  host: string;
  expression: string;
  value: number;
  threshold: number;
  alert_type: string;
  fired_at: string;
  resolved_at: string | null;
  client_id: number | null;
  trigger_name?: string | null;
  device_name?: string | null;
  device_type?: string | null;
  client_name?: string | null;
};

export type MonitoringMetricRow = {
  time: string;
  cpu: number;
  memory: number;
  disk_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  latency_ms: number;
  uptime_seconds: number;
  load_avg: number;
  processes: number;
  temperature: number;
};

export type MonitoringHost = {
  id: number;
  name: string;
  created_at: string;
};

export type MonitoringStats = {
  devices: number;
  online: number;
  offline: number;
  clients: number;
};

export type MonitoringSolarInverter = {
  id: number;
  client_id: number | null;
  name: string;
  brand: string;
  model: string;
  location: string;
  capacity_kwp: number;
  tariff_kwh: number;
  status: string;
  notes: string;
  created_at: string;
  client_name?: string | null;
  last_power?: number | null;
  last_energy_today?: number | null;
  last_revenue_today?: number | null;
  last_energy_total?: number | null;
  last_revenue_total?: number | null;
  last_status?: string | null;
  last_temp?: number | null;
  last_update?: string | null;
};

export type MonitoringSolarSummary = {
  total_inverters: number;
  total_power_w: number;
  energy_today_kwh: number;
  revenue_today: number;
};

export type MonitoringSolarMetricRow = {
  time: string;
  power_w: number;
  energy_today_kwh: number;
  energy_total_kwh: number;
  revenue_today: number;
  revenue_total: number;
  inverter_status: string;
  temperature_c: number;
};

export const monitoringApi = {
  me: () => monitoringFetch<MonitoringMeResponse>("/monitoring/auth/me"),

  stats: (clientId?: number | null) =>
    monitoringFetch<MonitoringStats>(`/monitoring/stats${clientId ? `?client_id=${clientId}` : ""}`),

  hosts: () => monitoringFetch<MonitoringHost[]>("/monitoring/hosts"),
  metricsByHost: (host: string, hours: number = 1) =>
    monitoringFetch<MonitoringMetricRow[]>(`/monitoring/metrics/${encodeURIComponent(host)}?hours=${Math.min(Math.max(1, hours), 168)}`),

  alerts: () => monitoringFetch<MonitoringAlert[]>("/monitoring/alerts"),

  triggers: () => monitoringFetch<MonitoringTrigger[]>("/monitoring/triggers"),
  createTrigger: (data: Partial<MonitoringTrigger> & { name: string; expression: string; threshold: number }) =>
    monitoringFetch<MonitoringTrigger>("/monitoring/triggers", { method: "POST", body: data }),
  updateTrigger: (id: number, data: Partial<MonitoringTrigger>) =>
    monitoringFetch<MonitoringTrigger>(`/monitoring/triggers/${id}`, { method: "PUT", body: data }),
  deleteTrigger: (id: number) => monitoringFetch<{ ok: true }>(`/monitoring/triggers/${id}`, { method: "DELETE" }),

  deviceTypes: () => monitoringFetch<Array<{ value: string; label: string; icon: string }>>("/monitoring/device-types"),
  tags: () => monitoringFetch<string[]>("/monitoring/tags"),

  devices: (filters?: Record<string, string | number | boolean | undefined | null>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return monitoringFetch<MonitoringDevice[]>(`/monitoring/devices${qs ? `?${qs}` : ""}`);
  },
  createDevice: (data: Record<string, unknown>) =>
    monitoringFetch<MonitoringDevice>("/monitoring/devices", { method: "POST", body: data }),
  updateDevice: (id: number, data: Record<string, unknown>) =>
    monitoringFetch<MonitoringDevice>(`/monitoring/devices/${id}`, { method: "PUT", body: data }),
  deleteDevice: (id: number) => monitoringFetch<{ ok: true }>(`/monitoring/devices/${id}`, { method: "DELETE" }),
  regenerateDeviceToken: (id: number) =>
    monitoringFetch<{ token: string }>(`/monitoring/devices/${id}/regenerate-token`, { method: "POST" }),

  clients: () => monitoringFetch<MonitoringClient[]>("/monitoring/clients"),
  createClient: (data: Partial<MonitoringClient> & { name: string }) =>
    monitoringFetch<MonitoringClient>("/monitoring/clients", { method: "POST", body: data }),
  updateClient: (id: number, data: Partial<MonitoringClient>) =>
    monitoringFetch<MonitoringClient>(`/monitoring/clients/${id}`, { method: "PUT", body: data }),
  deleteClient: (id: number) => monitoringFetch<{ ok: true }>(`/monitoring/clients/${id}`, { method: "DELETE" }),
  clientStats: (clientId: number) => monitoringFetch<{ devices: number; online: number; offline: number; alerts_24h: number }>(`/monitoring/clients/${clientId}/stats`),

  solarBrands: () =>
    monitoringFetch<Array<{ value: string; label: string; icon: string; method: string; fields: string[] }>>("/monitoring/solar/brands"),
  solarInverters: (clientId?: number | null) =>
    monitoringFetch<MonitoringSolarInverter[]>(`/monitoring/solar/inverters${clientId ? `?client_id=${clientId}` : ""}`),
  createSolarInverter: (data: Record<string, unknown>) =>
    monitoringFetch<MonitoringSolarInverter>("/monitoring/solar/inverters", { method: "POST", body: data }),
  updateSolarInverter: (id: number, data: Record<string, unknown>) =>
    monitoringFetch<MonitoringSolarInverter>(`/monitoring/solar/inverters/${id}`, { method: "PUT", body: data }),
  deleteSolarInverter: (id: number) => monitoringFetch<{ ok: true }>(`/monitoring/solar/inverters/${id}`, { method: "DELETE" }),
  solarMetrics: (id: number, hours: number = 24) =>
    monitoringFetch<MonitoringSolarMetricRow[]>(`/monitoring/solar/inverters/${id}/metrics?hours=${Math.min(Math.max(1, hours), 168)}`),
  solarSummary: (clientId?: number | null) =>
    monitoringFetch<MonitoringSolarSummary>(`/monitoring/solar/summary${clientId ? `?client_id=${clientId}` : ""}`),
};
