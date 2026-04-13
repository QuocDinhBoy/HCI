import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const token = useAuthStore((s) => s.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const prefillEmail = location.state?.email || '';
  const justRegistered = Boolean(location.state?.justRegistered);

  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
    if (justRegistered) {
      setSuccess('Dang ky thanh cong. Vui long dang nhap de bat dau.');
    }
  }, [prefillEmail, justRegistered]);

  useEffect(() => {
    if (token) {
      navigate('/app', { replace: true });
    }
  }, [token, navigate]);

  const canSubmit = useMemo(() => {
    return EMAIL_PATTERN.test(normalizeEmail(email)) && password.length >= 6 && !loading;
  }, [email, password, loading]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError('Email khong hop le. Vui long kiem tra lai.');
      return;
    }
    if (password.length < 6) {
      setError('Mat khau phai co it nhat 6 ky tu.');
      return;
    }

    setLoading(true);

    try {
      await login(cleanEmail, password);
      const redirectTo = location.state?.from?.pathname || '/app';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Dang nhap that bai. Vui long thu lai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="page-shell auth-shell">
        <section className="auth-hero animate-rise">
          <p className="pill" style={{ background: '#e7f8ef', color: '#2f8b53' }}>
            Secure Login
          </p>
          <h1>Chao mung quay lai voi EmpathyKids</h1>
          <p>
            Truy cap lo trinh hoc cam xuc, bao cao tien do, va cac bai luyen bieu cam AI chi trong mot lan dang nhap.
          </p>

          <ul className="auth-hero-list">
            <li>Dong bo profile be va phu huynh theo tai khoan.</li>
            <li>Tu dong khoi phuc phien neu token con han.</li>
            <li>Dieu huong thang den bai hoc dang theo sau khi login.</li>
          </ul>

          <p className="auth-helper-text">
            Chua co tai khoan? <Link to="/register">Tao tai khoan moi</Link>
          </p>
        </section>

        <form className="surface-card auth-card animate-pop" onSubmit={handleSubmit}>
          <h2>Dang nhap</h2>
          <p className="auth-muted">Nhap email va mat khau cua phu huynh de tiep tuc.</p>

          <div className="auth-form-grid">
            <label className="form-label">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ten@example.com"
                autoComplete="email"
              />
            </label>

            <label className="form-label">
              <span>Mat khau</span>
              <div className="password-inline">
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="It nhat 6 ky tu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'An mat khau' : 'Hien mat khau'}
                >
                  {showPassword ? 'An' : 'Hien'}
                </button>
              </div>
            </label>
          </div>

          {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}
          {!error && success ? <p className="auth-alert auth-alert-success">{success}</p> : null}

          <div style={{ marginTop: 18 }}>
            <Button type="submit" full disabled={!canSubmit}>
              {loading ? 'Dang xu ly...' : 'Dang nhap'}
            </Button>
          </div>

          <div className="auth-footer-row">
            <span>Ban moi su dung he thong?</span>
            <Link to="/">Ve trang chu</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
