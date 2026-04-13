import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

const highlights = [
  {
    title: 'Realtime emotion detector',
    body: 'Nhan dien cam xuc truc tiep tu camera ngay tren trinh duyet, khong can cai dat phuc tap.',
    icon: '📷',
  },
  {
    title: 'Learning map theo cap do',
    body: 'Lo trinh gom flashcard, matching, ngu canh va bieu cam AI, mo khoa theo tien do cua be.',
    icon: '🗺️',
  },
  {
    title: 'Bao cao va canh bao som',
    body: 'Tong hop sao, streak, khuyen nghi va danh dau bieu hien can theo doi cho phu huynh.',
    icon: '📊',
  },
];

const steps = [
  {
    title: 'Tao tai khoan',
    body: 'Phu huynh dang ky nhanh voi email de bat dau hanh trinh.',
  },
  {
    title: 'Hoc va luyen hang ngay',
    body: 'Be hoc bai tu co ban den nang cao, ket hop camera va game tuong tac.',
  },
  {
    title: 'Theo doi va dieu chinh',
    body: 'Xem bao cao, nhan de xuat thong minh de tang hieu qua hoc tap.',
  },
];

export default function LandingPage() {
  const token = useAuthStore((state) => state.token);
  const primaryRoute = token ? '/app' : '/register';
  const primaryLabel = token ? 'Vao trung tam hoc' : 'Bat dau mien phi';

  return (
    <div className="landing-page">
      <header className="page-shell landing-nav animate-rise">
        <div className="landing-brand">
          <span className="landing-brand-dot" />
          <strong>EmpathyKids</strong>
        </div>

        <nav className="landing-nav-links">
          <a href="#features">Tinh nang</a>
          <a href="#flow">Quy trinh</a>
          <a href="#cta">Bat dau</a>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login">
            <Button variant="ghost">Dang nhap</Button>
          </Link>
          <Link to={primaryRoute}>
            <Button variant="warm">{primaryLabel}</Button>
          </Link>
        </div>
      </header>

      <main className="page-shell landing-main">
        <section className="surface-card landing-hero animate-rise">
          <div>
            <p className="pill" style={{ background: '#e6f8f5', color: '#0f8f8f' }}>
              Nen tang ho tro hoc cam xuc
            </p>
            <h1>
              Hoc cam xuc bang trai nghiem
              <br />
              vui, de hieu, va do duoc
            </h1>
            <p className="landing-hero-copy">
              EmpathyKids giup tre luyen nhan dien cam xuc qua camera realtime, bai hoc tuong tac, va bao cao tien do cho phu huynh.
            </p>

            <div className="landing-hero-actions">
              <Link to={primaryRoute}>
                <Button variant="warm">{primaryLabel}</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Toi da co tai khoan</Button>
              </Link>
            </div>

            <div className="landing-stat-row">
              <article className="landing-stat-chip">
                <strong>4 modules</strong>
                <span>Flashcard - Matching - Context - AI</span>
              </article>
              <article className="landing-stat-chip">
                <strong>Realtime</strong>
                <span>Face emotion detector ngay tren web</span>
              </article>
              <article className="landing-stat-chip">
                <strong>Parent report</strong>
                <span>Theo doi sao, streak, canh bao</span>
              </article>
            </div>
          </div>

          <div className="landing-hero-card animate-float">
            <div className="landing-hero-smile">:)</div>
            <div className="landing-hero-card-grid">
              <article>
                <h3>Emotion AI</h3>
                <p>Quan sat bieu cam va dua ra phan hoi ngay lap tuc.</p>
              </article>
              <article>
                <h3>Roadmap</h3>
                <p>Mo khoa bai hoc theo muc do tien bo cua be.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-head">
            <p className="pill" style={{ background: '#e9f0ff', color: '#345ea8' }}>
              Tinh nang cot loi
            </p>
            <h2>San sang cho van hanh that te</h2>
          </div>

          <div className="landing-feature-grid">
            {highlights.map((item) => (
              <article key={item.title} className="surface-card landing-feature-card">
                <div className="landing-feature-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flow" className="landing-section">
          <div className="landing-section-head">
            <p className="pill" style={{ background: '#fff1e8', color: '#a1542a' }}>
              Quy trinh 3 buoc
            </p>
            <h2>Khoi dong nhanh, hoc tap lien tuc</h2>
          </div>

          <div className="landing-step-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="surface-card landing-step-card">
                <span className="landing-step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="cta" className="surface-card landing-cta">
          <div>
            <h2>San sang dua EmpathyKids vao su dung?</h2>
            <p>
              Tao tai khoan trong vai giay va bat dau lo trinh hoc cam xuc duoc ca nhan hoa cho be ngay hom nay.
            </p>
          </div>
          <div className="landing-cta-actions">
            <Link to={primaryRoute}>
              <Button variant="warm">{primaryLabel}</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost">Dang nhap he thong</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
