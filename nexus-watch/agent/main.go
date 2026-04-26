package main

import (
  "bytes"
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "log"
  "net/http"
  "os"
  "strconv"
  "time"

  "github.com/shirou/gopsutil/v3/cpu"
  "github.com/shirou/gopsutil/v3/disk"
  "github.com/shirou/gopsutil/v3/host"
  "github.com/shirou/gopsutil/v3/load"
  "github.com/shirou/gopsutil/v3/mem"
  "github.com/shirou/gopsutil/v3/net"
  "github.com/shirou/gopsutil/v3/process"
)

type Metric struct {
  Host          string  `json:"host"`
  SourceProduct string  `json:"source_product"`
  SourceAgent   string  `json:"source_agent_name"`
  CPU           float64 `json:"cpu"`
  Memory        float64 `json:"memory"`
  DiskUsed      float64 `json:"disk_used"`
  DiskTotal     float64 `json:"disk_total"`
  DiskPercent   float64 `json:"disk_percent"`
  NetRxBytes    uint64  `json:"net_rx_bytes"`
  NetTxBytes    uint64  `json:"net_tx_bytes"`
  LatencyMs     float64 `json:"latency_ms"`
  UptimeSeconds int64   `json:"uptime_seconds"`
  LoadAvg       float64 `json:"load_avg"`
  Processes     int     `json:"processes"`
  Temperature   float64 `json:"temperature"`
}

func getenv(key, fallback string) string {
  if v := os.Getenv(key); v != "" {
    return v
  }
  return fallback
}

func measureLatency(apiURL string) float64 {
  start := time.Now()
  client := &http.Client{Timeout: 3 * time.Second}
  resp, err := client.Get(apiURL + "/health")
  if err != nil {
    return 9999
  }
  _ = resp.Body.Close()
  return float64(time.Since(start).Milliseconds())
}

func sendMetric(client *http.Client, apiURL, deviceToken, ingestSecret string, metric Metric) error {
  ts := strconv.FormatInt(time.Now().Unix(), 10)
  body, _ := json.Marshal(metric)
  if ingestSecret == "" {
    return &httpError{StatusCode: 401}
  }
  sig := signMetric(ingestSecret, ts, body)

  req, err := http.NewRequest("POST", apiURL+"/metrics", bytes.NewBuffer(body))
  if err != nil {
    return err
  }
  req.Header.Set("Content-Type", "application/json")
  if deviceToken == "" {
    return &httpError{StatusCode: 401}
  }
  req.Header.Set("X-Device-Token", deviceToken)
  req.Header.Set("X-NX-Timestamp", ts)
  req.Header.Set("X-NX-Signature", sig)
  resp, err := client.Do(req)
  if err != nil {
    return err
  }
  defer resp.Body.Close()
  if resp.StatusCode >= 400 {
    return &httpError{StatusCode: resp.StatusCode}
  }
  return nil
}

func signMetric(secret, ts string, body []byte) string {
  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write([]byte(ts))
  mac.Write([]byte("."))
  mac.Write(body)
  return hex.EncodeToString(mac.Sum(nil))
}

type httpError struct{ StatusCode int }

func (e *httpError) Error() string { return "http status" }

func main() {
  apiURL := getenv("NEXUS_WATCH_CLOUD_URL", "http://localhost:3000")
  deviceToken := getenv("DEVICE_TOKEN", "")
  ingestSecret := getenv("INGEST_SECRET", "")
  agentName := getenv("AGENT_NAME", "")
  intervalStr := getenv("INTERVAL_SECONDS", "5")

  interval := 5 * time.Second
  if v, err := time.ParseDuration(intervalStr + "s"); err == nil {
    interval = v
  }

  hostInfo, _ := host.Info()
  hostName := hostInfo.Hostname
  if hostName == "" {
    hostName, _ = os.Hostname()
  }
  if agentName == "" {
    agentName = hostName
  }

  httpClient := &http.Client{Timeout: 5 * time.Second}
  log.Printf("Nexus Watch Agent | host=%s | cloud=%s", hostName, apiURL)

  var lastRx uint64
  var lastTx uint64
  var lastNetAt = time.Now()

  for {
    cpuPct := 0.0
    if p, err := cpu.Percent(500*time.Millisecond, false); err == nil && len(p) > 0 {
      cpuPct = p[0]
    }

    memPct := 0.0
    if m, err := mem.VirtualMemory(); err == nil {
      memPct = m.UsedPercent
    }

    du := 0.0
    dt := 0.0
    dp := 0.0
    if u, err := disk.Usage("/"); err == nil {
      du = float64(u.Used) / (1024 * 1024 * 1024)
      dt = float64(u.Total) / (1024 * 1024 * 1024)
      dp = u.UsedPercent
    }

    rx := uint64(0)
    tx := uint64(0)
    if io, err := net.IOCounters(false); err == nil && len(io) > 0 {
      rx = io[0].BytesRecv
      tx = io[0].BytesSent
    }

    now := time.Now()
    if lastRx == 0 && lastTx == 0 {
      lastRx = rx
      lastTx = tx
      lastNetAt = now
    }

    _ = float64(rx-lastRx) / now.Sub(lastNetAt).Seconds()
    _ = float64(tx-lastTx) / now.Sub(lastNetAt).Seconds()
    lastRx = rx
    lastTx = tx
    lastNetAt = now

    uptime := int64(0)
    if u, err := host.Uptime(); err == nil {
      uptime = int64(u)
    }

    loadAvg := 0.0
    if l, err := load.Avg(); err == nil {
      loadAvg = l.Load1
    }

    procs := 0
    if pids, err := processCount(); err == nil {
      procs = pids
    }

    latency := measureLatency(apiURL)

    metric := Metric{
      Host: hostName,
      SourceProduct: "nexus-watch",
      SourceAgent: agentName,
      CPU: cpuPct,
      Memory: memPct,
      DiskUsed: du,
      DiskTotal: dt,
      DiskPercent: dp,
      NetRxBytes: rx,
      NetTxBytes: tx,
      LatencyMs: latency,
      UptimeSeconds: uptime,
      LoadAvg: loadAvg,
      Processes: procs,
      Temperature: 0,
    }

    if err := sendMetric(httpClient, apiURL, deviceToken, ingestSecret, metric); err != nil {
      log.Printf("Send error: %v", err)
    } else {
      log.Printf("OK | cpu=%.1f%% mem=%.1f%% lat=%.0fms load=%.2f procs=%d", cpuPct, memPct, latency, loadAvg, procs)
    }

    time.Sleep(interval)
  }
}

func processCount() (int, error) {
  pids, err := process.Pids()
  if err != nil {
    return 0, err
  }
  return len(pids), nil
}

