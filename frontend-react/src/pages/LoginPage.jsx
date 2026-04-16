/* ─── LoginPage ──────────────────────────────────────────────
   Trang đăng nhập — thiết kế pastel, thân thiện, dễ dùng
───────────────────────────────────────────────────────────── */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await client.post('/api/auth/login', { email: form.email, password: form.password });
      login(data.user, data.token);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{
        width:           'min(900px, 94vw)',
        margin:          '0 auto',
        display:         'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap:             20,
        alignItems:      'stretch',
      }}>

        {/* ── Left: Hero ────────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--radius-xl)',
          background:   'linear-gradient(145deg, var(--sky-100) 0%, var(--lavender-100) 50%, var(--mint-100) 100%)',
          border:       '1.5px solid rgba(126,197,248,0.25)',
          padding:      'clamp(28px,4vw,44px)',
          display:      'flex',
          flexDirection:'column',
          gap:          16,
          position:     'relative',
          overflow:     'hidden',
        }}>
          {/* Floating emojis */}
          <span className="float-emoji" style={{ top: 12, right: 20, fontSize: '2rem', animationDelay: '0s' }}>✨</span>
          <span className="float-emoji" style={{ bottom: 30, right: 30, fontSize: '2.5rem', animationDelay: '1.5s' }}>🌈</span>
          <span className="float-emoji" style={{ top: '40%', left: 8, fontSize: '1.5rem', animationDelay: '0.8s' }}>⭐</span>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--sky-300), var(--lavender-300))',
              display: 'grid', placeItems: 'center', fontSize: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
            }}>🧠</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--ink-900)' }}>EmpathyKids</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-400)' }}>Học cảm xúc cùng AI</div>
            </div>
          </Link>

          <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', lineHeight: 1.15, marginTop: 8, position: 'relative', zIndex: 1 }}>
            Chào mừng bé trở lại! 🎉
          </h1>
          <p style={{ color: 'var(--ink-500)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '50ch', position: 'relative', zIndex: 1 }}>
            Tiếp tục hành trình học cảm xúc thú vị. Mỗi ngày học một ít, bé sẽ tiến bộ rất nhiều!
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, position: 'relative', zIndex: 1 }}>
            {['🃏 Thẻ học', '🧩 Ghép cặp', '📖 Ngữ cảnh', '🎭 Biểu cảm AI'].map((feat) => (
              <span key={feat} className="pill pill-sky">{feat}</span>
            ))}
          </div>

          {/* Emotion row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, position: 'relative', zIndex: 1 }}>
            {['😊', '😢', '😠', '😨', '😲'].map((em) => (
              <span key={em} style={{ fontSize: '2rem', lineHeight: 1 }}>{em}</span>
            ))}
          </div>
        </div>

        {/* ── Right: Form ───────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--radius-xl)',
          background:   'white',
          border:       '1.5px solid rgba(126,197,248,0.20)',
          boxShadow:    'var(--shadow-lg)',
          padding:      'clamp(28px,4vw,44px)',
          display:      'flex',
          flexDirection:'column',
        }}>
          <h2 style={{ fontSize: 'clamp(1.5rem,2.5vw,2rem)' }}>Đăng nhập</h2>
          <p style={{ color: 'var(--ink-400)', marginTop: 6, fontSize: '0.95rem' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--sky-500)', fontWeight: 800 }}>Đăng ký ngay</Link>
          </p>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            {/* Email */}
            <label className="input-label" htmlFor="login-email">
              <span>📧 Email phụ huynh</span>
              <input
                id="login-email"
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="email@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </label>

            {/* Password */}
            <label className="input-label" htmlFor="login-password">
              <span>🔒 Mật khẩu</span>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position:   'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color:      'var(--ink-400)', fontSize: '1.1rem', padding: 4,
                  }}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            {/* Error */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              full
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
            </Button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', color: 'var(--ink-400)', fontSize: '0.9rem' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--sky-500)', fontWeight: 800 }}>
              Tạo tài khoản miễn phí →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
