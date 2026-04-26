import './Sidebar.css'

export default function Sidebar({ currentPage, onNavigate }) {
  const navItems = [
    { id: 'live', label: 'Ao Vivo', icon: '📹' },
    { id: 'devices', label: 'Dispositivos', icon: '🔧' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>📷 Nexus Watch</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
