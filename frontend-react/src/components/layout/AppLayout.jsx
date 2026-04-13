import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/useAuthStore';

const mobileLinks = [
  { to: '/app', label: 'Lo trinh' },
  { to: '/emotion-detector', label: 'Nhan dien' },
  { to: '/emotion-practice', label: 'Luyen tap' },
  { to: '/report', label: 'Bao cao' },
  { to: '/profile', label: 'Ho so' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <div className="desktop-sidebar" style={{ display: 'block' }}>
        <Sidebar />
      </div>

      <main className="main-panel">
        <div className="topbar-mobile surface-card" style={{ padding: '10px 12px' }}>
          <div style={{ fontWeight: 800, color: '#0f8f8f' }}>EmpathyKids</div>
          <div style={{ fontWeight: 700, color: '#45657b', fontSize: 14 }}>{user?.username || 'Be con'}</div>
        </div>

        <nav className="mobile-nav">
          {mobileLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
              {link.label}
            </NavLink>
          ))}
          <button type="button" className="mobile-nav-logout" onClick={handleLogout}>
            Thoat
          </button>
        </nav>

        <Outlet />
      </main>
    </div>
  );
}
