/* ─── BottomNav ──────────────────────────────────────────────
   Mobile/Tablet bottom navigation (≤ 1024px)
   Desktop được ẩn qua CSS media query
───────────────────────────────────────────────────────────── */
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/app',              icon: '🗺️',  label: 'Lộ trình' },
  { to: '/emotion-detector', icon: '📷',  label: 'Nhận diện' },
  { to: '/emotion-practice', icon: '🎭',  label: 'Biểu cảm' },
  { to: '/report',           icon: '📊',  label: 'Báo cáo' },
  { to: '/profile',          icon: '👤',  label: 'Hồ sơ' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            ['bottom-nav-item', isActive ? 'active' : ''].join(' ')
          }
          aria-label={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          <span className="nav-dot" />
        </NavLink>
      ))}
    </nav>
  );
}
