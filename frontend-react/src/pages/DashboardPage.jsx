/* ─── DashboardPage ──────────────────────────────────────────
   Màn hình chính sau khi đăng nhập
   Thiết kế: "Playful but Calm" cho trẻ tự kỷ
───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressRing from '../components/ui/ProgressRing';
import StarBadge from '../components/ui/StarBadge';
import { useAuthStore } from '../store/useAuthStore';

const lessonOrder = ['flashcard', 'matching', 'context', 'emotion_training'];

const lessonLabel = {
  flashcard: 'Thẻ học',
  matching: 'Ghép cặp',
  context: 'Ngữ cảnh',
  emotion_training: 'Biểu cảm AI',
};

const lessonMeta = {
  flashcard: {
    icon: '🃏',
    description: 'Nhận diện cảm xúc qua hình ảnh và lựa chọn đáp án phù hợp.',
    variant: 'sky',
    color: 'var(--sky-400)',
  },
  matching: {
    icon: '🧩',
    description: 'Ghép đúng các cặp thẻ có cùng cảm xúc để rèn luyện ghi nhớ.',
    variant: 'mint',
    color: 'var(--mint-400)',
  },
  context: {
    icon: '📖',
    description: 'Đọc tình huống và chọn cảm xúc hợp lý theo ngữ cảnh.',
    variant: 'lavender',
    color: 'var(--lavender-400)',
  },
  emotion_training: {
    icon: '🎭',
    description: 'Luyện biểu cảm với camera — AI nhận xét theo thời gian thực.',
    variant: 'peach',
    color: 'var(--peach-400)',
  },
};

const MODULE_CARDS = [
  {
    to: '/learn/1/flashcard',
    icon: '🃏',
    label: 'Học cảm xúc',
    desc: 'Thẻ học + Ghép cặp + Tình huống',
    variant: 'sky',
    gradient: 'linear-gradient(135deg, #DAEEFF 0%, #EBF8F0 100%)',
    border: 'rgba(126,197,248,0.35)',
  },
  {
    to: '/emotion-practice',
    icon: '🎭',
    label: 'Luyện biểu cảm',
    desc: 'Camera + AI hướng dẫn realtime',
    variant: 'lavender',
    gradient: 'linear-gradient(135deg, #EDE8FF 0%, #F5F3FF 100%)',
    border: 'rgba(180,163,245,0.35)',
  },
  {
    to: '/emotion-detector',
    icon: '📷',
    label: 'Nhận diện',
    desc: 'Xem cảm xúc theo thời gian thực',
    variant: 'mint',
    gradient: 'linear-gradient(135deg, #D8F5E8 0%, #F0FBF5 100%)',
    border: 'rgba(109,207,154,0.35)',
  },
  {
    to: '/report',
    icon: '📊',
    label: 'Báo cáo',
    desc: 'Theo dõi tiến trình học tập',
    variant: 'peach',
    gradient: 'linear-gradient(135deg, #FFF0D6 0%, #FFF9F0 100%)',
    border: 'rgba(255,192,94,0.35)',
  },
];

const AVATARS = ['🐼', '🦊', '🐰', '🦋', '🌟', '🐸', '🦄', '🐨'];
const GREETINGS = [
  'Chào buổi sáng',
  'Chào buổi chiều',
  'Chào buổi tối',
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 18) return GREETINGS[1];
  return GREETINGS[2];
}

function getNextLesson(level) {
  for (const key of lessonOrder) {
    if (!level?.lessons?.[key]) return key;
  }
  return null;
}

function isLessonLocked(level, type) {
  if (!level || level.locked) return true;
  const idx = lessonOrder.indexOf(type);
  if (idx <= 0) return false;
  return !level.lessons?.[lessonOrder[idx - 1]];
}

function completionPercent(level) {
  const done = lessonOrder.filter((k) => Boolean(level?.lessons?.[k])).length;
  return Math.round((done / lessonOrder.length) * 100);
}

function normalizeRecommendationRoute(route) {
  if (!route) return '/app';
  if (route.startsWith('/learn/')) return route;
  const allowed = ['/speed-run', '/emotion-practice', '/emotion-detector', '/report', '/profile', '/app'];
  return allowed.includes(route) ? route : '/app';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [levels, setLevels] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentBadges, setRecentBadges] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [progressRes, recRes, profileRes] = await Promise.all([
          client.get('/api/progress-map'),
          client.get('/api/recommendations'),
          client.get('/api/user/profile'),
        ]);

        if (!mounted) return;
        setLevels(progressRes.data || []);
        setRecommendations(recRes.data?.recommendations || []);
        setProfile(profileRes.data || null);
        setRecentBadges(profileRes.data?.recentBadges || []);

        if (profileRes.data?.userInfo) {
          const currentUser = useAuthStore.getState().user || {};
          const nextUser = {
            ...currentUser,
            username: profileRes.data.userInfo.childName,
            parent_name: profileRes.data.userInfo.parentName,
            email: profileRes.data.userInfo.email,
            avatar: profileRes.data.userInfo.avatar,
          };
          const isSame =
            currentUser?.username === nextUser.username &&
            currentUser?.parent_name === nextUser.parent_name &&
            currentUser?.email === nextUser.email &&
            currentUser?.avatar === nextUser.avatar;
          if (!isSame) setUser(nextUser);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [setUser]);

  const stats = useMemo(() => ({
    stars: profile?.stars || 0,
    streak: profile?.currentStreak || 0,
    childName: profile?.userInfo?.childName || user?.username || 'Bé yêu',
  }), [profile, user]);

  const activeLevel = useMemo(
    () => levels.find((l) => !l.locked) || levels[0] || { id: 1, name: 'Cấp độ 1', lessons: {}, locked: false },
    [levels]
  );

  const overallPercent = useMemo(() => {
    if (!levels.length) return 0;
    const total = levels.reduce((acc, l) => acc + completionPercent(l), 0);
    return Math.round(total / levels.length);
  }, [levels]);

  const quickLessons = useMemo(() =>
    lessonOrder.map((type) => ({
      type,
      label: lessonLabel[type],
      icon: lessonMeta[type].icon,
      description: lessonMeta[type].description,
      variant: lessonMeta[type].variant,
      done: Boolean(activeLevel?.lessons?.[type]),
      locked: levels.length > 0 ? isLessonLocked(activeLevel, type) : false,
    })),
    [activeLevel, levels]);

  const avatarEmoji = AVATARS[((stats.childName || '').charCodeAt(0) || 0) % AVATARS.length];

  // Bản đồ kho báu: biểu tượng chặng dừng theo level
  const levelIcons = ['🗺️', '🌟', '💎'];
  const levelColors = ['var(--sky-500)', 'var(--lavender-500)', 'var(--coral-500)'];

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20 }}>

      {/* ── Hero Welcome Banner ────────────────────────────────── */}
      <Card variant="sky" className="animate-rise" style={{ padding: 28, overflow: 'hidden', position: 'relative' }}>
        {/* Decorative floats */}
        <span className="float-emoji" style={{ top: 10, right: 60, animationDelay: '0s' }}>✨</span>
        <span className="float-emoji" style={{ top: 30, right: 20, fontSize: '1.5rem', animationDelay: '1s' }}>🌈</span>
        <span className="float-emoji" style={{ bottom: 15, right: 100, fontSize: '2rem', animationDelay: '2s' }}>⭐</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

          {/* Avatar */}
          <div style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--sky-200), var(--lavender-200))',
            border: '4px solid white',
            boxShadow: 'var(--shadow-md)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '3rem',
            flexShrink: 0,
          }}>
            {avatarEmoji}
          </div>

          {/* Greeting */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <span className="pill pill-sky" style={{ marginBottom: 8, display: 'inline-flex' }}>
              {getGreeting()} ☀️
            </span>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', marginTop: 4 }}>
              Xin chào, <span style={{ color: 'var(--sky-500)' }}>{stats.childName}</span>! 🎉
            </h1>
            <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '1rem' }}>
              Con sẵn sàng học cảm xúc hôm nay chưa?
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <ProgressRing
              percent={overallPercent}
              size={90}
              stroke={9}
              label="hoàn thành"
            />
            <StarBadge
              count={stats.stars}
              size="md"
              label="Tổng sao"
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #fff5f0, #fff0e8)',
              border: '2px solid rgba(255,155,131,0.35)',
              boxShadow: '0 4px 14px rgba(255,112,88,0.12)',
            }}>
              <span style={{ fontSize: '2rem' }}>🔥</span>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--coral-500)', lineHeight: 1 }}>
                  {stats.streak}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--coral-400)', marginTop: 2 }}>
                  Ngày liên tiếp
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Module Cards (2×2 grid) ───────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', marginBottom: 14, color: 'var(--ink-700)' }}>
          🌟 Bắt đầu học ngay
        </h2>
        <div className="grid-2 stagger-children" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {MODULE_CARDS.map((mod) => (
            <Link
              key={mod.to}
              to={mod.to}
              className="surface-card card-clickable hover-lift"
              style={{
                background: mod.gradient,
                border: `1.5px solid ${mod.border}`,
                padding: 28,
                textDecoration: 'none',
                display: 'block',
              }}
              id={`module-${mod.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 12 }}>{mod.icon}</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink-800)' }}>{mod.label}</h3>
              <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '0.95rem', lineHeight: 1.5 }}>{mod.desc}</p>
              <div style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--sky-500)',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}>
                Bắt đầu →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="alert alert-error animate-rise">{error}</div>
      )}

      {/* ── Quick Lessons (active level) ─────────────────────── */}
      <Card variant="sun" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)' }}>
              📚 Bài học cốt lõi
            </h2>
            <p style={{ color: 'var(--ink-500)', marginTop: 4, fontSize: '0.95rem' }}>
              Đang ở <strong>{activeLevel?.name || 'Cấp độ 1'}</strong>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/learn/${activeLevel?.id || 1}/${getNextLesson(activeLevel) || 'flashcard'}`)}
          >
            Vào bài tiếp theo →
          </Button>
        </div>

        <div className="grid-auto stagger-children">
          {quickLessons.map((lesson) => (
            <article
              key={lesson.type}
              className="surface-card"
              style={{
                padding: 20,
                background: lesson.done
                  ? 'linear-gradient(135deg, var(--mint-50), white)'
                  : lesson.locked
                    ? 'linear-gradient(135deg, var(--ink-50), white)'
                    : 'white',
                border: lesson.done
                  ? '1.5px solid rgba(109,207,154,0.30)'
                  : lesson.locked
                    ? '1.5px solid rgba(148,163,184,0.20)'
                    : '1.5px solid rgba(126,197,248,0.25)',
                opacity: lesson.locked ? 0.65 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{lesson.icon}</div>
              <h3 style={{ fontSize: '1.2rem', marginTop: 10, color: 'var(--ink-800)' }}>{lesson.label}</h3>
              <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '0.9rem', minHeight: 48 }}>
                {lesson.description}
              </p>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`pill ${lesson.done ? 'pill-mint' : lesson.locked ? 'pill-locked' : 'pill-sky'}`}>
                  {lesson.done ? '✅ Hoàn thành' : lesson.locked ? '🔒 Đang khóa' : '▶ Sẵn sàng'}
                </span>

                <Button
                  variant={lesson.locked ? 'ghost' : 'primary'}
                  size="sm"
                  disabled={lesson.locked}
                  onClick={() => navigate(`/learn/${activeLevel?.id || 1}/${lesson.type}`)}
                  id={`lesson-btn-${lesson.type}`}
                >
                  Học ngay
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {/* ── Bản Đồ Hành Trình ─────────────────────────────────── */}
      <div
        onClick={() => navigate('/map')}
        className="animate-rise"
        style={{
          borderRadius: 24,
          overflow:     'hidden',
          cursor:       'pointer',
          position:     'relative',
          background:   'linear-gradient(135deg, #BAE6FD 0%, #D1FAE5 50%, #FEF9C3 100%)',
          border:       '2px solid rgba(147,197,253,0.40)',
          boxShadow:    '0 8px 32px rgba(96,165,250,0.16)',
          transition:   'transform 0.22s ease, box-shadow 0.22s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(96,165,250,0.24)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(96,165,250,0.16)'; }}
      >
        {/* Decorative background emojis */}
        {[['☁️',14,10,32],['☀️',280,12,36],['🌸',310,60,22],['🌲',8,80,28],['⭐',260,75,18]].map(([e,x,y,s],i) => (
          <span key={i} style={{ position:'absolute', left:x, top:y, fontSize:s, opacity:0.55, pointerEvents:'none', animation:`bounce-soft ${3+i*0.7}s ease infinite alternate` }}>{e}</span>
        ))}

        <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.8rem)', color: '#1E293B', marginBottom: 4 }}>
                🗺️ Bản Đồ Hành Trình
              </h2>
              <p style={{ color: '#475569', fontSize: '0.9rem' }}>
                Phiêu lưu qua từng chặng cảm xúc!
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.70)', border: '1.5px solid rgba(147,197,253,0.50)', fontSize: '0.85rem', fontWeight: 800, color: '#0369A1', flexShrink: 0 }}>
              Mở bản đồ →
            </div>
          </div>

          {/* Mini node preview */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div className="loading-spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', padding: '8px 0 24px' }}>
              {/* Connecting line */}
              <div style={{ position: 'absolute', top: '50%', left: 24, right: 24, height: 4, background: 'rgba(255,255,255,0.50)', borderRadius: 2, transform: 'translateY(-50%)' }} />

              {levels.map((level, i) => {
                const p = completionPercent(level);
                const THEMES = [
                  { color: '#F59E0B', bg: '#FEF3C7', char: '😊' },
                  { color: '#3B82F6', bg: '#DBEAFE', char: '😢' },
                  { color: '#8B5CF6', bg: '#EDE9FE', char: '😤' },
                  { color: '#10B981', bg: '#D1FAE5', char: '😨' },
                ];
                const th = THEMES[i % THEMES.length];
                return (
                  <div key={level.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, position: 'relative', zIndex: 2 }}>
                    <div style={{
                      width:        56, height: 56,
                      borderRadius: '50%',
                      background:   level.locked ? '#F1F5F9' : p === 100 ? th.bg : 'white',
                      border:       `3px solid ${level.locked ? '#CBD5E1' : p === 100 ? th.color : `${th.color}88`}`,
                      display:      'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize:     '1.7rem',
                      boxShadow:    level.locked ? 'none' : p === 100 ? `0 0 14px ${th.color}55` : '0 3px 10px rgba(0,0,0,0.10)',
                      transition:   'all 0.3s',
                    }}>
                      {level.locked ? '🔒' : p === 100 ? '✅' : th.char}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: level.locked ? '#94A3B8' : th.color, textAlign: 'center', lineHeight: 1.2 }}>
                      {level.name?.replace('Cấp độ ', 'Cấp ') || `Cấp ${i+1}`}
                    </div>
                    {!level.locked && (
                      <div style={{ fontSize: '0.62rem', color: p === 100 ? '#059669' : '#64748B', fontWeight: 700 }}>
                        {p === 100 ? '✓ Xong' : `${p}%`}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Finish flag */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#FEF9C3,#FCD34D)', border: '3px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem', boxShadow: '0 0 14px rgba(245,158,11,0.30)' }}>
                  🏆
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#F59E0B' }}>Đích!</div>
              </div>
            </div>
          )}

          {/* Stats + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1E293B' }}>{levels.filter(l => completionPercent(l) === 100).length}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Chặng xong</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1E293B' }}>{levels.length}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Tổng chặng</div>
              </div>
            </div>

            <button
              style={{
                padding:      '12px 20px',
                borderRadius: 16,
                border:       'none',
                background:   'linear-gradient(135deg, #4EB8F8, #3B82F6)',
                color:        'white',
                fontWeight:   900,
                fontSize:     '0.95rem',
                cursor:       'pointer',
                boxShadow:    '0 4px 14px rgba(78,184,248,0.40)',
                display:      'flex',
                alignItems:   'center',
                gap:          8,
              }}
            >
              🗺️ Xem bản đồ đầy đủ →
            </button>
          </div>
        </div>
      </div>

      {/* ── Badge Showcase ─────────────────────────────────────── */}
      <Card variant="lavender" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: recentBadges.length > 0 ? 18 : 0 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)' }}>🏅 Huy hiệu gần đây</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/badges')}>
            Xem tất cả →
          </Button>
        </div>

        {recentBadges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>🔒</div>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.95rem' }}>Hoàn thành bài học đầu tiên để nhận huy hiệu!</p>
            <div style={{ marginTop: 14 }}>
              <Button variant="primary" size="sm" onClick={() => navigate('/learn/1/flashcard')}>
                🎯 Bắt đầu ngay
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {recentBadges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, white, var(--lavender-50))',
                  border: '1.5px solid rgba(180,163,245,0.30)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  flex: '1 1 180px',
                  maxWidth: 260,
                }}
              >
                <div style={{ fontSize: '2.5rem', lineHeight: 1, flexShrink: 0 }}>{badge.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--lavender-600)' }}>{badge.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)', marginTop: 2 }}>
                    {new Date(badge.earnedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Kho Truyện Cảm Xúc ───────────────────────────────── */}
      <Card style={{
        padding:    0,
        overflow:   'hidden',
        background: 'linear-gradient(135deg, #FFF8D6 0%, #FFE8E0 50%, #EDE8FF 100%)',
        border:     '2px solid rgba(252,211,77,0.30)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ padding: '28px 16px 28px 28px', fontSize: '5rem', lineHeight: 1, animation: 'bounce-soft 2.5s ease infinite alternate', flexShrink: 0 }}>
            📚
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: '24px 16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.80)', border: '1.5px solid rgba(252,211,77,0.50)', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309' }}>✨ TÍNH NĂNG MỚI</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', color: '#1E293B', marginBottom: 6 }}>
              Kho Truyện Cảm Xúc
            </h2>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 16 }}>
              Khám phá cảm xúc qua truyện tranh tương tác!<br />
              Chọn hành động cho nhân vật và xem điều gì xảy ra 🎭
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/stories')}
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', border: 'none' }}
            >
              📖 Đọc truyện ngay
            </Button>
          </div>
          <div style={{ padding: '20px 24px 20px 0', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {['🎂', '🧸', '🎮'].map((e, i) => (
              <span key={i} style={{ fontSize: '2rem', animation: `bounce-soft ${2 + i * 0.5}s ease infinite alternate`, display: 'inline-block' }}>{e}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Recommendations ───────────────────────────────────── */}
      {recommendations.length > 0 && (
        <Card variant="lavender">
          <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', marginBottom: 14 }}>💡 Đề xuất thông minh</h2>
          <div className="grid-auto stagger-children">
            {recommendations.map((rec, idx) => (
              <article
                key={`${rec.type}-${idx}`}
                className="surface-card"
                style={{ padding: 18, background: 'white' }}
              >
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink-800)' }}>{rec.title}</h3>
                <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '0.9rem' }}>{rec.description}</p>
                {rec.action?.route && (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(normalizeRecommendationRoute(rec.action.route))}
                    >
                      {rec.action.label || 'Xem ngay'} →
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
