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
  flashcard:       'Thẻ học',
  matching:        'Ghép cặp',
  context:         'Ngữ cảnh',
  emotion_training:'Biểu cảm AI',
};

const lessonMeta = {
  flashcard: {
    icon:        '🃏',
    description: 'Nhận diện cảm xúc qua hình ảnh và lựa chọn đáp án phù hợp.',
    variant:     'sky',
    color:       'var(--sky-400)',
  },
  matching: {
    icon:        '🧩',
    description: 'Ghép đúng các cặp thẻ có cùng cảm xúc để rèn luyện ghi nhớ.',
    variant:     'mint',
    color:       'var(--mint-400)',
  },
  context: {
    icon:        '📖',
    description: 'Đọc tình huống và chọn cảm xúc hợp lý theo ngữ cảnh.',
    variant:     'lavender',
    color:       'var(--lavender-400)',
  },
  emotion_training: {
    icon:        '🎭',
    description: 'Luyện biểu cảm với camera — AI nhận xét theo thời gian thực.',
    variant:     'peach',
    color:       'var(--peach-400)',
  },
};

const MODULE_CARDS = [
  {
    to:       '/learn/1/flashcard',
    icon:     '🃏',
    label:    'Học cảm xúc',
    desc:     'Thẻ học + Ghép cặp + Tình huống',
    variant:  'sky',
    gradient: 'linear-gradient(135deg, #DAEEFF 0%, #EBF8F0 100%)',
    border:   'rgba(126,197,248,0.35)',
  },
  {
    to:       '/emotion-practice',
    icon:     '🎭',
    label:    'Luyện biểu cảm',
    desc:     'Camera + AI hướng dẫn realtime',
    variant:  'lavender',
    gradient: 'linear-gradient(135deg, #EDE8FF 0%, #F5F3FF 100%)',
    border:   'rgba(180,163,245,0.35)',
  },
  {
    to:       '/emotion-detector',
    icon:     '📷',
    label:    'Nhận diện',
    desc:     'Xem cảm xúc theo thời gian thực',
    variant:  'mint',
    gradient: 'linear-gradient(135deg, #D8F5E8 0%, #F0FBF5 100%)',
    border:   'rgba(109,207,154,0.35)',
  },
  {
    to:       '/report',
    icon:     '📊',
    label:    'Báo cáo',
    desc:     'Theo dõi tiến trình học tập',
    variant:  'peach',
    gradient: 'linear-gradient(135deg, #FFF0D6 0%, #FFF9F0 100%)',
    border:   'rgba(255,192,94,0.35)',
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
  if (h < 12)  return GREETINGS[0];
  if (h < 18)  return GREETINGS[1];
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
  const allowed = ['/speed-run','/emotion-practice','/emotion-detector','/report','/profile','/app'];
  return allowed.includes(route) ? route : '/app';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const setUser  = useAuthStore((s) => s.setUser);
  const user     = useAuthStore((s) => s.user);

  const [levels,          setLevels]          = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [profile,         setProfile]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

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

        if (profileRes.data?.userInfo) {
          const currentUser = useAuthStore.getState().user || {};
          const nextUser = {
            ...currentUser,
            username:    profileRes.data.userInfo.childName,
            parent_name: profileRes.data.userInfo.parentName,
            email:       profileRes.data.userInfo.email,
            avatar:      profileRes.data.userInfo.avatar,
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
        setError(err?.response?.data?.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [setUser]);

  const stats = useMemo(() => ({
    stars:     profile?.stars         || 0,
    streak:    profile?.currentStreak || 0,
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
      label:       lessonLabel[type],
      icon:        lessonMeta[type].icon,
      description: lessonMeta[type].description,
      variant:     lessonMeta[type].variant,
      done:  Boolean(activeLevel?.lessons?.[type]),
      locked: levels.length > 0 ? isLessonLocked(activeLevel, type) : false,
    })),
  [activeLevel, levels]);

  const avatarEmoji = AVATARS[((stats.childName || '').charCodeAt(0) || 0) % AVATARS.length];

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
            width:         90,
            height:        90,
            borderRadius:  '50%',
            background:    'linear-gradient(135deg, var(--sky-200), var(--lavender-200))',
            border:        '4px solid white',
            boxShadow:     'var(--shadow-md)',
            display:       'grid',
            placeItems:    'center',
            fontSize:      '3rem',
            flexShrink:    0,
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
              display:       'inline-flex',
              alignItems:    'center',
              gap:           10,
              padding:       '10px 18px',
              borderRadius:  '20px',
              background:    'linear-gradient(135deg, #fff5f0, #fff0e8)',
              border:        '2px solid rgba(255,155,131,0.35)',
              boxShadow:     '0 4px 14px rgba(255,112,88,0.12)',
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
                background:   mod.gradient,
                border:       `1.5px solid ${mod.border}`,
                padding:      28,
                textDecoration: 'none',
                display:      'block',
              }}
              id={`module-${mod.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 12 }}>{mod.icon}</div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink-800)' }}>{mod.label}</h3>
              <p style={{ color: 'var(--ink-500)', marginTop: 6, fontSize: '0.95rem', lineHeight: 1.5 }}>{mod.desc}</p>
              <div style={{
                marginTop:    14,
                display:      'inline-flex',
                alignItems:   'center',
                gap:          6,
                color:        'var(--sky-500)',
                fontWeight:   800,
                fontSize:     '0.9rem',
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
                padding:    20,
                background: lesson.done
                  ? 'linear-gradient(135deg, var(--mint-50), white)'
                  : lesson.locked
                    ? 'linear-gradient(135deg, var(--ink-50), white)'
                    : 'white',
                border:     lesson.done
                  ? '1.5px solid rgba(109,207,154,0.30)'
                  : lesson.locked
                    ? '1.5px solid rgba(148,163,184,0.20)'
                    : '1.5px solid rgba(126,197,248,0.25)',
                opacity:    lesson.locked ? 0.65 : 1,
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

      {/* ── Level Roadmap ─────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)' }}>🗺️ Lộ trình cấp độ</h2>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            🔄 Tải lại
          </Button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="loading-spinner" />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {levels.map((level) => {
              const next    = getNextLesson(level);
              const percent = completionPercent(level);
              return (
                <article
                  key={level.id}
                  className="surface-card"
                  style={{
                    padding:    18,
                    background: level.locked
                      ? 'linear-gradient(135deg, var(--ink-50), white)'
                      : 'linear-gradient(135deg, var(--sky-50), white)',
                    opacity:    level.locked ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--ink-800)' }}>{level.name}</h3>
                      <p style={{ color: 'var(--ink-500)', marginTop: 4, fontSize: '0.9rem' }}>{level.description}</p>
                    </div>
                    <span className={`pill ${level.locked ? 'pill-locked' : 'pill-mint'}`}>
                      {level.locked ? '🔒 Đang khóa' : `${percent}%`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-track" style={{ marginTop: 12 }}>
                    <div
                      className="progress-fill progress-animated"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Lesson buttons row */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {lessonOrder.map((type) => {
                      const done   = Boolean(level.lessons?.[type]);
                      const locked = isLessonLocked(level, type);
                      return (
                        <button
                          key={type}
                          disabled={locked}
                          onClick={() => navigate(`/learn/${level.id}/${type}`)}
                          className="btn btn-sm"
                          style={{
                            background: done   ? 'var(--mint-100)'
                                       : locked ? 'var(--ink-50)'
                                       :          'white',
                            color:      done   ? 'var(--mint-500)'
                                       : locked ? 'var(--ink-300)'
                                       :          'var(--sky-500)',
                            border:     done   ? '1.5px solid rgba(109,207,154,0.30)'
                                       : locked ? '1.5px solid rgba(148,163,184,0.15)'
                                       :          '1.5px solid rgba(126,197,248,0.30)',
                            cursor:     locked ? 'not-allowed' : 'pointer',
                            opacity:    locked ? 0.6 : 1,
                          }}
                        >
                          {done ? '✅ ' : ''}{lessonMeta[type].icon} {lessonLabel[type]}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <Button
                      variant="primary"
                      disabled={level.locked || !next}
                      size="sm"
                      onClick={() => next && navigate(`/learn/${level.id}/${next}`)}
                    >
                      {next ? `▶ Tiếp tục: ${lessonLabel[next]}` : '🎉 Đã hoàn thành cấp độ!'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
