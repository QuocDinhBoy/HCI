import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
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
  },
  matching: {
    icon: '🧩',
    description: 'Ghép đúng các cặp thẻ có cùng cảm xúc để rèn luyện ghi nhớ.',
  },
  context: {
    icon: '📖',
    description: 'Đọc tình huống và chọn cảm xúc hợp lý theo ngữ cảnh.',
  },
  emotion_training: {
    icon: '🎭',
    description: 'Luyện biểu cảm với camera — Gemini AI nhận xét và hướng dẫn theo thời gian thực.',
  },
};

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
  const previous = lessonOrder[idx - 1];
  return !level.lessons?.[previous];
}

function completionPercent(level) {
  const values = lessonOrder.map((k) => Boolean(level?.lessons?.[k]));
  const done = values.filter(Boolean).length;
  return Math.round((done / values.length) * 100);
}

function normalizeRecommendationRoute(route) {
  if (!route) return '/app';
  if (route.startsWith('/learn/')) return route;
  if (route === '/speed-run') return '/speed-run';
  if (route === '/emotion-practice') return '/emotion-practice';
  if (route === '/emotion-detector') return '/emotion-detector';
  if (route === '/report') return '/report';
  if (route === '/profile') return '/profile';
  if (route === '/app') return '/app';
  return '/app';
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
            username: profileRes.data.userInfo.childName,
            parent_name: profileRes.data.userInfo.parentName,
            email: profileRes.data.userInfo.email,
            avatar: profileRes.data.userInfo.avatar,
          };

          const isSameProfile =
            currentUser?.username === nextUser.username &&
            currentUser?.parent_name === nextUser.parent_name &&
            currentUser?.email === nextUser.email &&
            currentUser?.avatar === nextUser.avatar;

          if (!isSameProfile) {
            setUser(nextUser);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Không tải được dashboard. Vui lòng thử lại.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  const stats = useMemo(
    () => ({
      stars: profile?.stars || 0,
      streak: profile?.currentStreak || 0,
      childName: profile?.userInfo?.childName || user?.username || 'Be con',
    }),
    [profile, user]
  );

  const activeLevel = useMemo(
    () => levels.find((level) => !level.locked) || levels[0] || { id: 1, name: 'Cấp độ 1', lessons: {}, locked: false },
    [levels]
  );

  const quickLessons = useMemo(
    () =>
      lessonOrder.map((type) => ({
        type,
        label: lessonLabel[type],
        icon: lessonMeta[type].icon,
        description: lessonMeta[type].description,
        done: Boolean(activeLevel?.lessons?.[type]),
        locked: levels.length > 0 ? isLessonLocked(activeLevel, type) : false,
      })),
    [activeLevel, levels]
  );

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 16 }}>
      <Card style={{ padding: 18, background: 'linear-gradient(120deg,#ffffff,#f2fdff 45%,#fef6e9)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p className="pill" style={{ background: '#e6f8f5', color: '#0f8f8f' }}>
              Trung tâm học tập
            </p>
            <h1 style={{ fontSize: 'clamp(2rem,3vw,2.8rem)', marginTop: 8 }}>Xin chào, {stats.childName} 👋</h1>
            <p style={{ color: '#4f758a' }}>Con sẵn sàng tiếp tục bài học hôm nay chưa?</p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="surface-card" style={{ padding: 12, minWidth: 120 }}>
              <div style={{ color: '#4f758a', fontWeight: 700 }}>Tổng sao</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#f9b233' }}>⭐ {stats.stars}</div>
            </div>
            <div className="surface-card" style={{ padding: 12, minWidth: 120 }}>
              <div style={{ color: '#4f758a', fontWeight: 700 }}>Chuỗi ngày</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#ff7f6a' }}>🔥 {stats.streak}</div>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid-auto">
        <Link to="/emotion-detector">
          <Card style={{ background: 'linear-gradient(120deg,#dff5ff,#ffffff)' }}>
            <h3 style={{ fontSize: 24 }}>📷 Nhận diện cảm xúc</h3>
            <p style={{ color: '#4f758a', marginTop: 6 }}>Bật camera và xem trạng thái cảm xúc theo thời gian thực.</p>
          </Card>
        </Link>
        <Link to="/emotion-practice">
          <Card style={{ background: 'linear-gradient(120deg,#ffe8de,#ffffff)' }}>
            <h3 style={{ fontSize: 24 }}>🎭 Luyện biểu cảm</h3>
            <p style={{ color: '#4f758a', marginTop: 6 }}>Tập nhiều lần để nhận biết và điều chỉnh biểu cảm.</p>
          </Card>
        </Link>
        <Link to="/report">
          <Card style={{ background: 'linear-gradient(120deg,#e8ffe8,#ffffff)' }}>
            <h3 style={{ fontSize: 24 }}>📊 Báo cáo phụ huynh</h3>
            <p style={{ color: '#4f758a', marginTop: 6 }}>Theo dõi tiến độ, kỹ năng và cảnh báo cảm xúc.</p>
          </Card>
        </Link>
      </section>

      <Card style={{ background: 'linear-gradient(120deg,#ffffff,#fff7e9)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 30 }}>Bài học cốt lõi</h2>
            <p style={{ color: '#4f758a', marginTop: 4 }}>
              Đang ở <strong>{activeLevel?.name || 'Cấp độ 1'}</strong> — Thẻ học, Ghép cặp, Ngữ cảnh, Biểu cảm AI.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/learn/${activeLevel?.id || 1}/${getNextLesson(activeLevel) || 'flashcard'}`)}>
            Vào bài tiếp theo →
          </Button>
        </div>

        <div className="grid-auto" style={{ marginTop: 12 }}>
          {quickLessons.map((lesson) => (
            <article key={lesson.type} className="surface-card" style={{ padding: 12, borderRadius: 14 }}>
              <div style={{ fontSize: 30 }}>{lesson.icon}</div>
              <h3 style={{ fontSize: 22, marginTop: 6 }}>{lesson.label}</h3>
              <p style={{ color: '#4f758a', marginTop: 4, minHeight: 58 }}>{lesson.description}</p>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  className="pill"
                  style={{
                    background: lesson.done ? '#e6fbef' : lesson.locked ? '#eef3f7' : '#e8f3ff',
                    color: lesson.done ? '#2f8b53' : lesson.locked ? '#7e93a4' : '#2d6ec5',
                  }}
                >
                  {lesson.done ? '✅ Đã hoàn thành' : lesson.locked ? '🔒 Đang khóa' : '▶ Sẵn sàng'}
                </span>
                <Button
                  variant={lesson.locked ? 'ghost' : 'primary'}
                  disabled={lesson.locked}
                  onClick={() => navigate(`/learn/${activeLevel?.id || 1}/${lesson.type}`)}
                >
                  Bắt đầu
                </Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 30 }}>Lộ trình cấp độ</h2>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Tải lại
          </Button>
        </div>

        {loading ? <p style={{ marginTop: 12, color: '#4f758a' }}>Đang tải dữ liệu lộ trình...</p> : null}
        {error ? (
          <p style={{ marginTop: 12, color: '#bc4a36', fontWeight: 800, background: '#ffe8e3', borderRadius: 12, padding: '8px 10px' }}>
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {levels.map((level) => {
              const nextLesson = getNextLesson(level);
              const percent = completionPercent(level);

              return (
                <article key={level.id} className="surface-card" style={{ padding: 14, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: 24 }}>{level.name}</h3>
                      <p style={{ color: '#4f758a', marginTop: 4 }}>{level.description}</p>
                    </div>
                    <div className="pill" style={{ background: level.locked ? '#e8eef3' : '#e6fbef', color: level.locked ? '#6e879a' : '#2f8b53' }}>
                      {level.locked ? '🔒 Đang khóa' : `${percent}%`}
                    </div>
                  </div>

                  <div style={{ height: 8, background: '#edf4f8', borderRadius: 999, marginTop: 10 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        borderRadius: 999,
                        background: 'linear-gradient(120deg,#17a2a2,#4d90fe)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {lessonOrder.map((type) => {
                      const done = Boolean(level.lessons?.[type]);
                      const locked = isLessonLocked(level, type);
                      return (
                        <button
                          key={type}
                          disabled={locked}
                          onClick={() => navigate(`/learn/${level.id}/${type}`)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid #cfe2f5',
                            background: done ? '#e7ffef' : locked ? '#f2f5f8' : '#ffffff',
                            color: done ? '#2f8b53' : locked ? '#8ba2b4' : '#2e5e76',
                            padding: '6px 10px',
                            fontWeight: 800,
                            cursor: locked ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {done ? '✅ ' : ''}{lessonLabel[type]}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <Button
                      variant="primary"
                      disabled={level.locked || !nextLesson}
                      onClick={() => nextLesson && navigate(`/learn/${level.id}/${nextLesson}`)}
                    >
                      {nextLesson ? `Tiếp tục: ${lessonLabel[nextLesson]}` : '🎉 Đã hoàn thành cấp độ'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 style={{ fontSize: 30 }}>💡 Đề xuất thông minh</h2>
        {recommendations.length === 0 ? (
          <p style={{ marginTop: 10, color: '#4f758a' }}>Chưa có đề xuất. Hãy học thêm để hệ thống cá nhân hóa tốt hơn.</p>
        ) : (
          <div className="grid-auto" style={{ marginTop: 10 }}>
            {recommendations.map((rec, idx) => (
              <article key={`${rec.type}-${idx}`} className="surface-card" style={{ padding: 12 }}>
                <h3 style={{ fontSize: 22 }}>{rec.title}</h3>
                <p style={{ color: '#4f758a', marginTop: 4 }}>{rec.description}</p>
                {rec.action?.route ? (
                  <div style={{ marginTop: 10 }}>
                    <Button variant="ghost" onClick={() => navigate(normalizeRecommendationRoute(rec.action.route))}>
                      {rec.action.label || 'Xem ngay'}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
