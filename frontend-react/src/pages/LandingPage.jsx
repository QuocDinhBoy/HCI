/* ─── LandingPage ────────────────────────────────────────────
   Trang chủ — trước khi đăng nhập
   Thiết kế: hero landing với nền pastel, floating emojis, feature cards
───────────────────────────────────────────────────────────── */
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

const FEATURES = [
  {
    icon:    '🃏',
    title:   'Thẻ học cảm xúc',
    desc:    'Nhận diện cảm xúc qua hình ảnh khuôn mặt với giao diện trực quan, lớn và rõ ràng.',
    variant: 'sky',
  },
  {
    icon:    '🧩',
    title:   'Ghép cặp vui học',
    desc:    'Trò chơi ghép thẻ cảm xúc giúp bé ghi nhớ và phân biệt cảm xúc một cách tự nhiên.',
    variant: 'mint',
  },
  {
    icon:    '📖',
    title:   'Học qua tình huống',
    desc:    'Hiểu cảm xúc qua các câu chuyện ngắn và tình huống gần gũi trong cuộc sống hàng ngày.',
    variant: 'lavender',
  },
  {
    icon:    '🎭',
    title:   'Luyện biểu cảm AI',
    desc:    'Camera và trí tuệ nhân tạo Gemini hướng dẫn bé luyện tập biểu cảm theo thời gian thực.',
    variant: 'peach',
  },
  {
    icon:    '📊',
    title:   'Báo cáo chi tiết',
    desc:    'Phụ huynh và giáo viên theo dõi tiến trình, cảm xúc và cảnh báo qua biểu đồ dễ hiểu.',
    variant: 'sun',
  },
  {
    icon:    '🔊',
    title:   'Đọc to (TTS)',
    desc:    'Hỗ trợ text-to-speech giúp bé nghe và hiểu nội dung bài học mà không cần đọc chữ.',
    variant: 'coral',
  },
];

const HOW_STEPS = [
  { num: '1', icon: '👤', title: 'Tạo hồ sơ bé',     desc: 'Phụ huynh tạo tài khoản và thiết lập thông tin của bé trong 1 phút.' },
  { num: '2', icon: '📚', title: 'Bắt đầu học',       desc: 'Bé chọn bài học từ lộ trình cấp độ phù hợp — từ dễ đến khó.' },
  { num: '3', icon: '🎯', title: 'Luyện tập mỗi ngày', desc: 'Học 10–15 phút mỗi ngày giúp bé tiến bộ vượt bậc về nhận thức cảm xúc.' },
  { num: '4', icon: '📈', title: 'Theo dõi tiến trình', desc: 'Xem báo cáo chi tiết và nhận gợi ý học tập được cá nhân hóa.' },
];

const EMOTIONS = [
  { emoji: '😊', label: 'Vui vẻ' },
  { emoji: '😢', label: 'Buồn bã' },
  { emoji: '😠', label: 'Tức giận' },
  { emoji: '😨', label: 'Sợ hãi' },
  { emoji: '😲', label: 'Ngạc nhiên' },
  { emoji: '🤢', label: 'Khó chịu' },
];

export default function LandingPage() {
  return (
    <div className="landing-page">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header style={{
        position:        'sticky',
        top:             0,
        zIndex:          100,
        background:      'rgba(240,248,255,0.88)',
        backdropFilter:  'blur(20px)',
        borderBottom:    '1px solid rgba(126,197,248,0.20)',
        boxShadow:       '0 2px 12px rgba(100,149,237,0.08)',
      }}>
        <div style={{
          width:           'min(1200px,94vw)',
          margin:          '0 auto',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             16,
          padding:         '14px 0',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width:        44, height: 44, borderRadius: 14,
              background:   'linear-gradient(135deg, var(--sky-300), var(--lavender-300))',
              display:      'grid', placeItems: 'center', fontSize: '1.3rem',
              boxShadow:    'var(--shadow-sm)', flexShrink: 0,
            }}>🧠</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--ink-900)', lineHeight: 1 }}>
                EmpathyKids
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-400)', letterSpacing: 0.5, marginTop: 1 }}>
                Học cảm xúc cùng AI
              </div>
            </div>
          </div>

          {/* Nav actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
            <Link to="/register" className="btn btn-primary btn-sm" id="landing-register-btn">Bắt đầu miễn phí 🚀</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{
        position:    'relative',
        overflow:    'hidden',
        padding:     'clamp(40px,6vw,80px) 0',
        background:  'linear-gradient(180deg, var(--sky-50) 0%, rgba(240,248,255,0) 100%)',
      }}>
        {/* Floating decorations */}
        {EMOTIONS.map((em, i) => (
          <span
            key={em.label}
            className="float-emoji"
            style={{
              fontSize:         `${1.8 + (i % 3) * 0.8}rem`,
              opacity:          0.55,
              top:              `${8 + (i * 14) % 65}%`,
              left:             i < 3 ? `${2 + i * 4}%` : 'auto',
              right:            i >= 3 ? `${2 + (i - 3) * 4}%` : 'auto',
              animationDelay:   `${i * 0.6}s`,
              animationDuration:`${3 + (i % 2)}s`,
            }}
          >
            {em.emoji}
          </span>
        ))}

        <div style={{ width: 'min(1200px,94vw)', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <span className="pill pill-sky" style={{ fontSize: '1rem', padding: '8px 20px', marginBottom: 20, display: 'inline-flex' }}>
            ✨ Ứng dụng hỗ trợ trẻ tự kỷ
          </span>

          <h1 style={{
            fontSize:     'clamp(2.4rem, 5vw, 4.2rem)',
            fontFamily:   'var(--font-heading)',
            fontWeight:   800,
            color:        'var(--ink-900)',
            lineHeight:   1.1,
            marginTop:    12,
          }}>
            Giúp bé học{' '}
            <span style={{ color: 'var(--sky-400)' }}>cảm xúc</span>
            <br />
            theo cách{' '}
            <span style={{ color: 'var(--mint-400)' }}>vui & dễ hiểu</span> 🌈
          </h1>

          <p style={{
            color:      'var(--ink-500)',
            marginTop:  18,
            fontSize:   'clamp(1rem,1.8vw,1.25rem)',
            maxWidth:   600,
            margin:     '18px auto 0',
            lineHeight: 1.7,
          }}>
            EmpathyKids là ứng dụng thiết kế đặc biệt cho trẻ tự kỷ, giúp bé nhận diện,
            hiểu và biểu đạt cảm xúc thông qua học tập tương tác và trí tuệ nhân tạo.
          </p>

          <div style={{ marginTop: 32, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-xl" id="hero-get-started-btn">
              🚀 Bắt đầu học ngay
            </Link>
            <Link to="/login" className="btn btn-ghost btn-xl">
              👤 Đăng nhập
            </Link>
          </div>

          {/* Emotion preview strip */}
          <div style={{
            marginTop:     48,
            display:       'flex',
            justifyContent:'center',
            gap:           12,
            flexWrap:      'wrap',
          }}>
            {EMOTIONS.map((em) => (
              <div
                key={em.label}
                style={{
                  display:      'flex',
                  flexDirection:'column',
                  alignItems:   'center',
                  gap:          6,
                  padding:      '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background:   'white',
                  border:       '1.5px solid rgba(126,197,248,0.22)',
                  boxShadow:    'var(--shadow-sm)',
                  transition:   'transform 0.2s ease',
                  cursor:       'default',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: '2.4rem' }}>{em.emoji}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-600)' }}>{em.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px,5vw,70px) 0', background: 'white' }}>
        <div style={{ width: 'min(1200px,94vw)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="pill pill-mint" style={{ marginBottom: 12, fontSize: '1rem', padding: '8px 20px', display: 'inline-flex' }}>
              Tính năng nổi bật
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>
              Tất cả những gì bé cần để học cảm xúc 💡
            </h2>
            <p style={{ color: 'var(--ink-500)', marginTop: 10, fontSize: '1.05rem', maxWidth: 560, margin: '10px auto 0' }}>
              Thiết kế đặc biệt theo nguyên tắc ASD — tối giản, nhất quán, phản hồi tích cực.
            </p>
          </div>

          <div className="grid-auto stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {FEATURES.map((feat) => (
              <Card key={feat.title} variant={feat.variant} style={{ padding: 26 }} className="hover-lift">
                <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 14 }}>{feat.icon}</div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--ink-800)' }}>{feat.title}</h3>
                <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '0.95rem', lineHeight: 1.6 }}>{feat.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px,5vw,70px) 0', background: 'linear-gradient(180deg, var(--mint-50), var(--sky-50))' }}>
        <div style={{ width: 'min(1200px,94vw)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="pill pill-sky" style={{ marginBottom: 12, fontSize: '1rem', padding: '8px 20px', display: 'inline-flex' }}>
              Cách hoạt động
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>Bắt đầu chỉ trong 4 bước 🚀</h2>
          </div>

          <div className="grid-auto stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {HOW_STEPS.map((step) => (
              <Card key={step.num} style={{ padding: 26 }} className="hover-lift">
                <div style={{
                  width:       48, height: 48, borderRadius: '50%',
                  background:  'linear-gradient(135deg, var(--sky-300), var(--lavender-300))',
                  display:     'grid', placeItems: 'center',
                  fontSize:    '1.1rem', fontWeight: 900,
                  color:       'white', marginBottom: 14,
                  fontFamily:  'var(--font-heading)',
                  boxShadow:   'var(--shadow-sm)',
                }}>
                  {step.num}
                </div>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>{step.icon}</div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--ink-800)' }}>{step.title}</h3>
                <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '0.95rem', lineHeight: 1.6 }}>{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px,5vw,70px) 0' }}>
        <div style={{ width: 'min(1200px,94vw)', margin: '0 auto' }}>
          <Card style={{
            padding:    'clamp(32px,5vw,56px)',
            textAlign:  'center',
            background: 'linear-gradient(135deg, var(--sky-100) 0%, var(--lavender-100) 50%, var(--mint-100) 100%)',
            border:     '2px solid rgba(126,197,248,0.25)',
            position:   'relative',
            overflow:   'hidden',
          }}>
            <span className="float-emoji" style={{ top: 20, left: 30, fontSize: '2rem', animationDelay: '0s' }}>🌟</span>
            <span className="float-emoji" style={{ top: 20, right: 30, fontSize: '1.8rem', animationDelay: '1s' }}>💫</span>
            <span className="float-emoji" style={{ bottom: 20, left: '40%', fontSize: '2.5rem', animationDelay: '2s' }}>🎉</span>

            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', position: 'relative', zIndex: 1 }}>
              Sẵn sàng bắt đầu hành trình cùng bé? 🌈
            </h2>
            <p style={{ color: 'var(--ink-500)', marginTop: 12, fontSize: '1.05rem', maxWidth: 520, margin: '12px auto 0', position: 'relative', zIndex: 1 }}>
              Tham gia EmpathyKids ngay hôm nay — hoàn toàn miễn phí. Giúp bé phát triển trí tuệ cảm xúc mỗi ngày.
            </p>

            <div style={{ marginTop: 28, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <Link to="/register" className="btn btn-primary btn-xl" id="cta-register-btn">
                🚀 Tạo tài khoản miễn phí
              </Link>
              <Link to="/login" className="btn btn-ghost btn-xl">
                Đăng nhập
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{
        padding:     'clamp(20px,3vw,32px) 0',
        borderTop:   '1px solid rgba(126,197,248,0.18)',
        background:  'white',
        textAlign:   'center',
        color:       'var(--ink-400)',
        fontSize:    '0.9rem',
      }}>
        <div style={{ width: 'min(1200px,94vw)', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--sky-300), var(--lavender-300))', display: 'grid', placeItems: 'center', fontSize: '0.85rem' }}>🧠</div>
            <span style={{ fontWeight: 800, color: 'var(--ink-700)' }}>EmpathyKids</span>
          </div>
          <p>© {new Date().getFullYear()} EmpathyKids — Học cảm xúc cùng AI 🌈</p>
          <p style={{ marginTop: 4 }}>Thiết kế đặc biệt cho trẻ tự kỷ (ASD)</p>
        </div>
      </footer>
    </div>
  );
}
