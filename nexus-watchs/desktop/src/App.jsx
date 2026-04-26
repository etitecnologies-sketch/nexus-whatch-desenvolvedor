import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LiveView from './pages/LiveView'
import Devices from './pages/Devices'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('live')
  const [devices, setDevices] = useState([])

  useEffect(() => {
    loadDevices()
  }, [])

  async function loadDevices() {
    const saved = await window.electronAPI.store.get('devices')
    if (saved) setDevices(saved)
  }

  async function saveDevices(newDevices) {
    setDevices(newDevices)
    await window.electronAPI.store.set('devices', newDevices)
  }

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        {currentPage === 'live' && <LiveView devices={devices} />}
        {currentPage === 'devices' && <Devices devices={devices} onSave={saveDevices} />}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  )
}
