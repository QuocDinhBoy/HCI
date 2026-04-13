import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeForm(form) {
  return {
    username: form.username.trim(),
    parent_name: form.parent_name.trim(),
    email: form.email.trim().toLowerCase(),
    password: form.password,
    confirmPassword: form.confirmPassword,
    agreed: form.agreed,
  };
}

function validateForm(form) {
  if (form.username.length < 2) {
    return 'Ten cua be can toi thieu 2 ky tu.';
  }
  if (!EMAIL_PATTERN.test(form.email)) {
    return 'Email khong hop le.';
  }
  if (form.password.length < 6) {
    return 'Mat khau phai co it nhat 6 ky tu.';
  }
  if (form.password !== form.confirmPassword) {
    return 'Xac nhan mat khau chua trung khop.';
  }
  if (!form.agreed) {
    return 'Ban can dong y dieu khoan de tiep tuc.';
  }
  return '';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: '',
    parent_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreed: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = useMemo(() => {
    const clean = normalizeForm(form);
    return !validateForm(clean) && !loading;
  }, [form, loading]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setOk('');

    const clean = normalizeForm(form);
    const invalidReason = validateForm(clean);
    if (invalidReason) {
      setError(invalidReason);
      return;
    }

    setLoading(true);

    try {
      const data = await register({
        username: clean.username,
        parent_name: clean.parent_name,
        email: clean.email,
        password: clean.password,
      });
      setOk(data?.message || 'Dang ky thanh cong. Vui long dang nhap.');
      navigate('/login', {
        replace: true,
        state: {
          justRegistered: true,
          email: clean.email,
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Dang ky that bai. Vui long thu lai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="page-shell auth-shell">
        <section className="auth-hero animate-rise">
          <p className="pill" style={{ background: '#fff4df', color: '#9a5a00' }}>
            New Account
          </p>
          <h1>Tao tai khoan cho hanh trinh hoc cam xuc</h1>
          <p>
            Hoan tat dang ky trong 1 phut de mo lo trinh hoc, camera bieu cam AI, va bao cao tien do theo ngay.
          </p>

          <ul className="auth-hero-list">
            <li>Tai khoan duoc luu theo email phu huynh, de dang quan ly.</li>
            <li>Lo trinh hoc mo theo cap do, theo doi sao va chuoi ngay lien tuc.</li>
            <li>Toi uu cho mobile va desktop, phu hop hoc tai nha.</li>
          </ul>

          <p className="auth-helper-text">
            Da co tai khoan? <Link to="/login">Dang nhap ngay</Link>
          </p>
        </section>

        <form className="surface-card auth-card animate-pop" onSubmit={handleSubmit}>
          <h2>Dang ky</h2>
          <p className="auth-muted">Nhap thong tin co ban cua be va phu huynh.</p>

          <div className="auth-form-grid">
            <label className="form-label">
              <span>Ten cua be</span>
              <input
                className="input"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                required
                placeholder="Vi du: Be Na"
                autoComplete="nickname"
              />
            </label>

            <label className="form-label">
              <span>Ten phu huynh</span>
              <input
                className="input"
                value={form.parent_name}
                onChange={(e) => updateField('parent_name', e.target.value)}
                placeholder="Khong bat buoc"
                autoComplete="name"
              />
            </label>

            <label className="form-label">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
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
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                  minLength={6}
                  placeholder="It nhat 6 ky tu"
                  autoComplete="new-password"
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

            <label className="form-label">
              <span>Xac nhan mat khau</span>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                required
                minLength={6}
                placeholder="Nhap lai mat khau"
                autoComplete="new-password"
              />
            </label>

            <label className="agree-check" htmlFor="agree-terms">
              <input
                id="agree-terms"
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => updateField('agreed', e.target.checked)}
              />
              <span>Toi dong y voi dieu khoan su dung va chinh sach bao mat.</span>
            </label>
          </div>

          {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}
          {!error && ok ? <p className="auth-alert auth-alert-success">{ok}</p> : null}

          <div style={{ marginTop: 18 }}>
            <Button type="submit" full disabled={!canSubmit}>
              {loading ? 'Dang tao tai khoan...' : 'Dang ky tai khoan'}
            </Button>
          </div>

          <div className="auth-footer-row">
            <span>Muon xem tong quan truoc?</span>
            <Link to="/">Ve trang chu</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
