import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const links = [
  { to: '/app', label: 'Lo trinh hoc', icon: 'map' },
  { to: '/emotion-detector', label: 'Nhan dien cam xuc', icon: 'camera' },
  { to: '/emotion-practice', label: 'Luyen bieu cam', icon: 'sparkles' },
  { to: '/report', label: 'Bao cao', icon: 'chart' },
  { to: '/profile', label: 'Ho so', icon: 'user' },
];

function Icon({ name }) {
  const styles = { width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 2 };

  if (name === 'map') {
    return (
      <svg viewBox="0 0 24 24" style={styles}>
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </svg>
    );
  }
  if (name === 'camera') {
    return (
      <svg viewBox="0 0 24 24" style={styles}>
        <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    );
  }
  if (name === 'sparkles') {
    return (
      <svg viewBox="0 0 24 24" style={styles}>
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
      </svg>
    );
  }
  if (name === 'chart') {
    return (
      <svg viewBox="0 0 24 24" style={styles}>
        <path d="M4 20V4" />
        <path d="M8 20v-6" />
        <path d="M12 20v-9" />
        <path d="M16 20v-12" />
        <path d="M20 20v-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" style={styles}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1.5-4 4.2-6 7-6s5.5 2 7 6" />
    </svg>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      style={{
        borderRight: '1px solid rgba(20,85,108,.12)',
        background: 'linear-gradient(180deg,#f8fdff 0%,#ffffff 40%,#f4fff8 100%)',
        padding: '18px 14px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div className="animate-rise" style={{ padding: '8px 10px 16px' }}>
        <p style={{ fontSize: 12, letterSpacing: 1.6, fontWeight: 800, color: '#3f738d' }}>EMPATHYKIDS</p>
        <h2 style={{ fontSize: 28, lineHeight: 1.1 }}>Cam Xuc La Sieu Nang Luc</h2>
      </div>

      <div
        className="surface-card"
        style={{
          padding: 12,
          marginBottom: 18,
          background: 'linear-gradient(120deg,#ddf5ff,#eeffe6)',
        }}
      >
        <div style={{ fontSize: 12, color: '#366982', fontWeight: 800 }}>Xin chao</div>
        <div style={{ fontWeight: 800, color: '#214b63', fontSize: 18 }}>{user?.username || 'Be con'}</div>
        <div style={{ color: '#4f758a', fontSize: 13 }}>{user?.email || 'Phu huynh'}</div>
      </div>

      <nav style={{ display: 'grid', gap: 8 }}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 12px',
              borderRadius: 14,
              color: isActive ? '#0f8f8f' : '#45657b',
              background: isActive ? 'rgba(23,162,162,.12)' : 'transparent',
              fontWeight: 800,
              transition: 'all .2s ease',
            })}
          >
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onLogout}
        style={{
          marginTop: 22,
          width: '100%',
          border: 'none',
          borderRadius: 14,
          padding: '11px 12px',
          background: '#ffe6e0',
          color: '#bc4a36',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Dang xuat
      </button>
    </aside>
  );
}
