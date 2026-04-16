/* ─── AppHeader ──────────────────────────────────────────────
   Top bar: Logo | Desktop Nav | Sound Toggle | Avatar
───────────────────────────────────────────────────────────── */
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_ITEMS = [
  { to: '/app',               icon: '🗺️',  label: 'Lộ trình' },
  { to: '/emotion-detector',  icon: '📷',  label: 'Nhận diện' },
  { to: '/emotion-practice',  icon: '🎭',  label: 'Luyện biểu cảm' },
  { to: '/report',            icon: '📊',  label: 'Báo cáo' },
  { to: '/profile',           icon: '👤',  label: 'Hồ sơ' },
];

const AVATARS = ['🐼', '🦊', '🐰', '🦋', '🌟', '🐸', '🦄', '🐨'];

export default function AppHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sound, setSound] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const avatarEmoji = user?.avatar
    ? null
    : AVATARS[((user?.username || '').charCodeAt(0) || 0) % AVATARS.length];

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="app-header-brand">
        <div className="app-header-logo">🧠</div>
        <span className="app-header-title">EmpathyKids</span>
      </div>

      {/* Desktop Nav */}
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              ['desktop-nav-item', isActive ? 'active' : ''].join(' ')
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Actions */}
      <div className="app-header-actions">
        {/* Sound toggle */}
        <button
          className="icon-btn"
          onClick={() => setSound((s) => !s)}
          title={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
          aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {sound ? '🔊' : '🔇'}
        </button>

        {/* Avatar / menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="header-avatar"
            onClick={() => setShowMenu((m) => !m)}
            title="Tài khoản"
            aria-label="Mở menu tài khoản"
          >
            {user?.avatar
              ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.3rem' }}>{avatarEmoji}</span>
            }
          </button>

          {showMenu && (
            <div
              style={{
                position:    'absolute',
                right:       0,
                top:         52,
                zIndex:      200,
                background:  'white',
                borderRadius: '16px',
                boxShadow:   '0 8px 32px rgba(100,149,237,0.18)',
                border:      '1.5px solid rgba(126,197,248,0.20)',
                minWidth:    180,
                overflow:    'hidden',
                animation:   'slideUp 0.2s ease both',
              }}
            >
              <div style={{
                padding:    '14px 16px',
                borderBottom: '1px solid rgba(126,197,248,0.15)',
                background:  'linear-gradient(135deg, var(--sky-50), var(--mint-50))',
              }}>
                <div style={{ fontWeight: 800, color: 'var(--ink-800)', fontSize: '0.95rem' }}>
                  {user?.username || 'Bé yêu'}
                </div>
                <div style={{ color: 'var(--ink-400)', fontSize: '0.82rem', marginTop: 2 }}>
                  {user?.email || ''}
                </div>
              </div>

              <button
                onClick={() => { navigate('/profile'); setShowMenu(false); }}
                style={{
                  display:    'flex', alignItems: 'center', gap: 10,
                  width:      '100%', textAlign: 'left', padding: '12px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 700, color: 'var(--ink-700)', fontSize: '0.95rem',
                }}
              >
                👤 &nbsp;Hồ sơ của tôi
              </button>

              <button
                onClick={onLogout}
                style={{
                  display:    'flex', alignItems: 'center', gap: 10,
                  width:      '100%', textAlign: 'left', padding: '12px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontWeight: 700, color: 'var(--coral-500)', fontSize: '0.95rem',
                  borderTop:  '1px solid rgba(126,197,248,0.12)',
                }}
              >
                🚪 &nbsp;Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
