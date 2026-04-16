/* ─── ProfilePage ────────────────────────────────────────────
   Hồ sơ người dùng — thông tin bé + phụ huynh + thành tích
───────────────────────────────────────────────────────────── */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StarBadge from '../components/ui/StarBadge';
import { useAuthStore } from '../store/useAuthStore';

const AVATARS = ['🐼', '🦊', '🐰', '🦋', '🌟', '🐸', '🦄', '🐨'];

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          14,
      padding:      '14px 16px',
      borderRadius: 'var(--radius-md)',
      background:   'rgba(126,197,248,0.06)',
      border:       '1.5px solid rgba(126,197,248,0.12)',
    }}>
      <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-400)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 800, color: 'var(--ink-800)', fontSize: '1.05rem' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate      = useNavigate();
  const { setUser, logout } = useAuthStore();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const { data } = await client.get('/api/user/profile');
        if (!mounted) return;
        setProfile(data);
        if (data?.userInfo) {
          const currentUser = useAuthStore.getState().user || {};
          const nextUser = {
            ...currentUser,
            username:    data.userInfo.childName,
            parent_name: data.userInfo.parentName,
            email:       data.userInfo.email,
            avatar:      data.userInfo.avatar,
          };
          const isSame =
            currentUser?.username    === nextUser.username &&
            currentUser?.parent_name === nextUser.parent_name &&
            currentUser?.email       === nextUser.email &&
            currentUser?.avatar      === nextUser.avatar;
          if (!isSame) setUser(nextUser);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Không tải được hồ sơ.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [setUser]);

  const info      = profile?.userInfo || {};
  const stars     = profile?.stars         || 0;
  const streak    = profile?.currentStreak || 0;
  const childName = info.childName || 'Bé yêu';
  const avatarIdx = (childName.charCodeAt(0) || 0) % AVATARS.length;
  const emojiAvatar = AVATARS[avatarIdx];

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <Card variant="lavender" style={{ padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <span className="float-emoji" style={{ top: 10, right: 20, animationDelay: '0s' }}>✨</span>
        <span className="float-emoji" style={{ top: 30, left: 20, fontSize: '2rem', animationDelay: '1.5s' }}>🌈</span>

        {/* Avatar */}
        <div style={{
          width:        100,
          height:       100,
          borderRadius: '50%',
          background:   'linear-gradient(135deg, var(--lavender-200), var(--sky-200))',
          border:       '4px solid white',
          boxShadow:    'var(--shadow-md)',
          display:      'grid',
          placeItems:   'center',
          fontSize:     '3.5rem',
          margin:       '0 auto 16px',
          position:     'relative',
          zIndex:       1,
        }}>
          {info.avatar
            ? <img src={info.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : emojiAvatar
          }
        </div>

        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', position: 'relative', zIndex: 1 }}>
          {childName}
        </h1>
        {info.parentName && (
          <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '1rem', position: 'relative', zIndex: 1 }}>
            👪 Phụ huynh: {info.parentName}
          </p>
        )}
      </Card>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <div className="loading-spinner" />
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* ── Achievements ────────────────────────────────────── */}
          <div className="grid-2 stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Card variant="sun" style={{ padding: 24, textAlign: 'center' }}>
              <StarBadge count={stars} size="lg" label="Tổng sao đạt được" style={{ width: '100%', justifyContent: 'center' }} />
            </Card>
            <Card style={{
              padding:    24,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #fff5f0, white)',
              border:     '1.5px solid rgba(255,155,131,0.30)',
            }}>
              <div style={{ fontSize: '3rem', lineHeight: 1 }}>🔥</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--coral-500)', marginTop: 8, lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ color: 'var(--ink-500)', fontWeight: 700, marginTop: 8, fontSize: '0.9rem' }}>
                Ngày học liên tiếp
              </div>
            </Card>
          </div>

          {/* ── Info ──────────────────────────────────────────── */}
          <Card style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>📋 Thông tin cơ bản</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <InfoRow icon="😊" label="Tên của bé"   value={info.childName}  />
              <InfoRow icon="👨‍👩‍👧" label="Phụ huynh"    value={info.parentName} />
              <InfoRow icon="📧" label="Email"         value={info.email}      />
              {info.difficulty && (
                <InfoRow icon="⚙️" label="Độ khó"     value={info.difficulty === 1 ? '🟢 Dễ' : info.difficulty === 2 ? '🟡 Trung bình' : '🔴 Khó'} />
              )}
            </div>
          </Card>

          {/* ── Quick links ─────────────────────────────────────── */}
          <Card variant="mint" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 14 }}>⚡ Truy cập nhanh</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { to: '/app',              icon: '🗺️', label: 'Về lộ trình học tập' },
                { to: '/report',           icon: '📊', label: 'Xem báo cáo tiến trình' },
                { to: '/emotion-detector', icon: '📷', label: 'Nhận diện cảm xúc' },
                { to: '/emotion-practice', icon: '🎭', label: 'Luyện biểu cảm' },
              ].map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  style={{
                    display:      'flex', alignItems: 'center', gap: 14,
                    padding:      '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background:   'white',
                    border:       '1.5px solid rgba(109,207,154,0.20)',
                    cursor:       'pointer',
                    textAlign:    'left',
                    fontWeight:   700,
                    color:        'var(--ink-700)',
                    fontSize:     '1rem',
                    transition:   'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mint-50)'; e.currentTarget.style.borderColor = 'rgba(109,207,154,0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(109,207,154,0.20)'; }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                  {item.label}
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-300)' }}>→</span>
                </button>
              ))}
            </div>
          </Card>

          {/* ── Logout ──────────────────────────────────────────── */}
          <div style={{ textAlign: 'center' }}>
            <Button variant="danger" size="lg" onClick={onLogout}>
              🚪 Đăng xuất khỏi hệ thống
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
