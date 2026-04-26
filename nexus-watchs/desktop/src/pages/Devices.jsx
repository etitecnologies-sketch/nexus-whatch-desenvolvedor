import { useState } from 'react'
import './Devices.css'

export default function Devices({ devices, onSave }) {
  const [list, setList] = useState(devices || [])
  const [form, setForm] = useState({ name: '', ipAddress: '', port: '8000', username: 'admin', password: '', channels: 4 })

  function addDevice() {
    if (!form.name || !form.ipAddress) return
    const newDevice = { ...form, id: Date.now(), connectionType: 'ip' }
    const updated = [...list, newDevice]
    setList(updated)
    onSave(updated)
    setForm({ name: '', ipAddress: '', port: '8000', username: 'admin', password: '', channels: 4 })
  }

  function removeDevice(id) {
    const updated = list.filter(d => d.id !== id)
    setList(updated)
    onSave(updated)
  }

  return (
    <div className="devices-page">
      <h1>🔧 Dispositivos</h1>
      <div className="device-form">
        <input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="IP" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} />
        <input placeholder="Porta" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} />
        <input placeholder="Usuário" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
        <input type="password" placeholder="Senha" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input type="number" placeholder="Canais" value={form.channels} onChange={e => setForm({ ...form, channels: parseInt(e.target.value) })} />
        <button className="btn btn-primary" onClick={addDevice}>Adicionar</button>
      </div>
      <div className="device-list">
        {list.map(d => (
          <div key={d.id} className="device-card">
            <div className="device-info">
              <strong>{d.name}</strong>
              <span>{d.ipAddress}:{d.port}</span>
              <span>{d.channels} canais</span>
            </div>
            <button className="btn btn-outline" onClick={() => removeDevice(d.id)}>Remover</button>
          </div>
        ))}
      </div>
    </div>
  )
}
