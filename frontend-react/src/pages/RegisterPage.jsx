/* ─── RegisterPage ───────────────────────────────────────────
   Trang đăng ký — thân thiện, tích cực, từng bước rõ ràng
───────────────────────────────────────────────────────────── */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

const CHILD_AVATARS = ['🐼', '🦊', '🐰', '🦋', '🌟', '🐸', '🦄', '🐨', '🦁', '🐯', '🐬', '🦜'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);

  const [form, setForm] = useState({
    parentName: '',
    childName:  '',
    email:      '',
    password:   '',
    confirm:    '',
    avatar:     CHILD_AVATARS[0],
    agree:      false,
  });

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [step,    setStep]    = useState(1); // 1 = parent info, 2 = child info, 3 = done

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const goStep2 = (e) => {
    e.preventDefault();
    if (!form.parentName || !form.email || !form.password) { setError('Vui lòng điền đầy đủ thông tin phụ huynh.'); return; }
    if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setError('');
    setStep(2);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.childName) { setError('Vui lòng nhập tên của bé.'); return; }
    if (!form.agree)      { setError('Vui lòng đồng ý với điều khoản sử dụng.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const { data } = await client.post('/api/auth/register', {
        parentName: form.parentName,
        childName:  form.childName,
        email:      form.email,
        password:   form.password,
        avatar:     form.avatar,
      });
      if (data.token) {
        login(data.user, data.token);
        setSuccess('Tạo tài khoản thành công! 🎉 Đang chuyển đến trang học...');
        setTimeout(() => navigate('/app', { replace: true }), 1500);
      } else {
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ['Thông tin phụ huynh', 'Thông tin bé yêu', 'Hoàn tất'];

  return (
    <div className="auth-page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ width: 'min(540px, 94vw)', margin: '0 auto' }}>

        {/* ── Brand ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--sky-300), var(--lavender-300))',
              display: 'grid', placeItems: 'center', fontSize: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}>🧠</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--ink-900)' }}>
              EmpathyKids
            </div>
          </Link>
        </div>

        {/* ── Step indicator ────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width:        32, height: 32, borderRadius: '50%',
                background:   step >= s ? 'linear-gradient(135deg, var(--sky-300), var(--sky-500))' : 'var(--ink-100)',
                color:        step >= s ? 'white' : 'var(--ink-400)',
                display:      'grid', placeItems: 'center',
                fontWeight:   900, fontSize: '0.9rem',
                boxShadow:    step === s ? 'var(--shadow-sm)' : 'none',
                transition:   'all 0.3s ease',
              }}>
                {step > s ? '✓' : s}
              </div>
              <span style={{
                fontSize:   '0.85rem', fontWeight: 700,
                color:      step >= s ? 'var(--sky-500)' : 'var(--ink-300)',
                whiteSpace: 'nowrap',
              }}>
                {STEP_LABELS[s - 1]}
              </span>
              {s < 2 && <div style={{ width: 32, height: 2, background: step > s ? 'var(--sky-300)' : 'var(--ink-100)', borderRadius: 99, transition: 'all 0.3s ease' }} />}
            </div>
          ))}
        </div>

        {/* ── Card ──────────────────────────────────────────── */}
        <div style={{
          background:   'white',
          borderRadius: 'var(--radius-xl)',
          border:       '1.5px solid rgba(126,197,248,0.22)',
          boxShadow:    'var(--shadow-lg)',
          padding:      'clamp(24px,4vw,40px)',
        }}>

          {/* ══ STEP 1: Parent info ══════════════════════════ */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)' }}>👨‍👩‍👧 Thông tin phụ huynh</h2>
              <p style={{ color: 'var(--ink-400)', marginTop: 6, fontSize: '0.95rem' }}>
                Đã có tài khoản?{' '}
                <Link to="/login" style={{ color: 'var(--sky-500)', fontWeight: 800 }}>Đăng nhập</Link>
              </p>

              <form onSubmit={goStep2} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                <label className="input-label" htmlFor="reg-parent">
                  <span>👤 Tên phụ huynh / giáo viên</span>
                  <input
                    id="reg-parent"
                    className="input"
                    name="parentName"
                    value={form.parentName}
                    onChange={onChange}
                    placeholder="Nguyễn Văn A"
                    disabled={loading}
                  />
                </label>

                <label className="input-label" htmlFor="reg-email">
                  <span>📧 Email</span>
                  <input
                    id="reg-email"
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

                <label className="input-label" htmlFor="reg-password">
                  <span>🔒 Mật khẩu (tối thiểu 6 ký tự)</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-password"
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={loading}
                      style={{ paddingRight: 52 }}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: '1.1rem' }} aria-label="Toggle password">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <label className="input-label" htmlFor="reg-confirm">
                  <span>🔒 Xác nhận mật khẩu</span>
                  <input
                    id="reg-confirm"
                    className="input"
                    type="password"
                    name="confirm"
                    value={form.confirm}
                    onChange={onChange}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </label>

                {/* Password match indicator */}
                {form.confirm && (
                  <div className={`alert ${form.password === form.confirm ? 'alert-success' : 'alert-error'}`}>
                    {form.password === form.confirm ? '✓ Mật khẩu khớp!' : '✗ Mật khẩu chưa khớp'}
                  </div>
                )}

                {error && <div className="alert alert-error">{error}</div>}

                <Button type="submit" variant="primary" size="lg" full id="reg-step1-btn">
                  Tiếp theo →
                </Button>
              </form>
            </>
          )}

          {/* ══ STEP 2: Child info ═══════════════════════════ */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)' }}>😊 Thông tin của bé</h2>
              <p style={{ color: 'var(--ink-400)', marginTop: 6, fontSize: '0.95rem' }}>
                Chọn avatar và tên yêu thích của bé
              </p>

              <form onSubmit={onSubmit} style={{ display: 'grid', gap: 20, marginTop: 24 }}>
                <label className="input-label" htmlFor="reg-child">
                  <span>🌟 Tên của bé</span>
                  <input
                    id="reg-child"
                    className="input"
                    name="childName"
                    value={form.childName}
                    onChange={onChange}
                    placeholder="Bé Minh, Bé An, ..."
                    disabled={loading}
                  />
                </label>

                {/* Avatar picker */}
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--ink-700)', marginBottom: 12, fontSize: '0.9rem' }}>
                    🎨 Chọn avatar của bé
                  </p>
                  <div style={{
                    display:               'grid',
                    gridTemplateColumns:   'repeat(6, 1fr)',
                    gap:                   10,
                  }}>
                    {CHILD_AVATARS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, avatar: av }))}
                        style={{
                          fontSize:     '2rem',
                          lineHeight:   1,
                          padding:      '12px 10px',
                          borderRadius: 'var(--radius-md)',
                          background:   form.avatar === av ? 'var(--sky-100)' : 'var(--ink-50)',
                          border:       `2.5px solid ${form.avatar === av ? 'var(--sky-400)' : 'transparent'}`,
                          cursor:       'pointer',
                          transition:   'all 0.15s ease',
                          transform:    form.avatar === av ? 'scale(1.15)' : 'scale(1)',
                        }}
                        aria-label={`Chọn avatar ${av}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                  {/* Preview */}
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--sky-200), var(--lavender-200))',
                      border: '3px solid white', boxShadow: 'var(--shadow-md)',
                      display: 'grid', placeItems: 'center', fontSize: '2.8rem',
                      margin: '0 auto 8px', transition: 'all 0.3s ease',
                    }}>
                      {form.avatar}
                    </div>
                    <p style={{ color: 'var(--ink-500)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {form.childName || 'Bé yêu'} đã chọn avatar này!
                    </p>
                  </div>
                </div>

                {/* Agree */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={onChange}
                    style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, accentColor: 'var(--sky-400)' }}
                    id="reg-agree"
                  />
                  <span style={{ color: 'var(--ink-600)', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Tôi đồng ý với{' '}
                    <span style={{ color: 'var(--sky-500)', fontWeight: 800 }}>điều khoản sử dụng</span>
                    {' '}và{' '}
                    <span style={{ color: 'var(--sky-500)', fontWeight: 800 }}>chính sách bảo mật</span>
                    {' '}của EmpathyKids.
                  </span>
                </label>

                {error   && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}>
                  <Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)}>
                    ← Quay lại
                  </Button>
                  <Button type="submit" variant="success" size="lg" disabled={loading} id="reg-submit-btn">
                    {loading ? '⏳ Đang tạo tài khoản...' : '🎉 Tạo tài khoản!'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--ink-400)', fontSize: '0.9rem' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--sky-500)', fontWeight: 800 }}>Đăng nhập →</Link>
        </p>
      </div>
    </div>
  );
}
