import { useState, useEffect, useRef } from 'react'
import Hls from 'hls.js'
import './LiveView.css'

function VideoCell({ device, channel }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const streamName = `dev${device.id}_ch${channel}`

  useEffect(() => {
    startStream()
    return () => stopStream()
  }, [device, channel])

  async function startStream() {
    if (!device.rtspUrl && device.connectionType === 'p2p') {
      setStatus('p2p')
      return
    }

    setStatus('loading')
    const rtspUrl = device.rtspUrl || buildRtspUrl(device, channel)
    const result = await window.electronAPI.mediamtx.addStream(streamName, rtspUrl)
    if (!result.success) {
      setStatus('error')
      return
    }
    setTimeout(() => loadHLS(result.hlsUrl), 2000)
  }

  function buildRtspUrl(device, channel) {
    const host = device.ipAddress || device.ddnsAddress
    return `rtsp://${device.username}:${device.password}@${host}:${device.port || 554}/cam/realmonitor?channel=${channel}&subtype=0`
  }

  function loadHLS(hlsUrl) {
    const video = videoRef.current
    if (!video) return
    if (Hls.isSupported()) {
      hlsRef.current = new Hls({ liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 4 })
      hlsRef.current.loadSource(hlsUrl)
      hlsRef.current.attachMedia(video)
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => { video.play(); setStatus('playing') })
      hlsRef.current.on(Hls.Events.ERROR, () => setStatus('error'))
    }
  }

  async function stopStream() {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    await window.electronAPI.mediamtx.removeStream(streamName)
  }

  return (
    <div className="video-cell">
      {status === 'p2p' && (
        <div className="cell-overlay">
          <span>📡</span>
          <p>Câmera P2P</p>
          <button className="btn btn-primary" onClick={() => window.electronAPI.openExternal('https://remotizze.intelbras.com.br')}>
            Abrir Remotizze
          </button>
        </div>
      )}
      {status === 'loading' && (
        <div className="cell-overlay"><div className="spinner" /><p>Conectando...</p></div>
      )}
      {status === 'error' && (
        <div className="cell-overlay error">
          <span>⚠️</span>
          <p>Falha no stream</p>
          <button className="btn btn-outline" onClick={startStream}>Tentar novamente</button>
        </div>
      )}
      <video ref={videoRef} className="video-player" muted playsInline style={{ display: status === 'playing' ? 'block' : 'none' }} />
      <div className="cell-label">{device.name} — Canal {channel}</div>
    </div>
  )
}

export default function LiveView({ devices }) {
  const [layout, setLayout] = useState(4)
  const cameras = devices.flatMap(d =>
    Array.from({ length: d.channels || 1 }, (_, i) => ({ device: d, channel: i + 1, key: `${d.id}-${i + 1}` }))
  ).slice(0, layout)

  return (
    <div className="live-view">
      <div className="live-header">
        <h1>📹 Visualização ao Vivo</h1>
        <div className="layout-controls">
          {[1, 4, 9, 16].map(n => (
            <button key={n} className={`btn ${layout === n ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLayout(n)}>{n}</button>
          ))}
        </div>
      </div>
      {devices.length === 0 ? (
        <div className="empty-state">
          <span>📷</span>
          <h2>Nenhum dispositivo cadastrado</h2>
          <p>Vá em Dispositivos para adicionar suas câmeras</p>
        </div>
      ) : (
        <div className={`video-grid grid-${layout}`}>
          {cameras.map(({ device, channel, key }) => <VideoCell key={key} device={device} channel={channel} />)}
          {Array.from({ length: Math.max(0, layout - cameras.length) }, (_, i) => (
            <div key={`empty-${i}`} className="video-cell empty"><div className="cell-overlay"><span>📷</span><p>Canal vazio</p></div></div>
          ))}
        </div>
      )}
    </div>
  )
}
