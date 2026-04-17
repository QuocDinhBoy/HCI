/* ─── BadgeCollectionPage ─────────────────────────────────────
   Màn hình "Bộ sưu tập huy hiệu" — Gamification cho trẻ tự kỷ
   Thiết kế: sáng, vui, nhiều màu sắc, animation nhẹ nhàng
────────────────────────────────────────────────────────────── */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const CATEGORY_META = {
  streak:   { label: '🔥 Học liên tiếp',    color: 'var(--coral-500)',   bg: 'linear-gradient(135deg,#fff5f0,#ffe8e0)' },
  general:  { label: '📚 Học tập',           color: 'var(--sky-500)',     bg: 'linear-gradient(135deg,#daeeff,#ebf8f0)' },
  level:    { label: '🏆 Chinh phục cấp độ', color: 'var(--sun-500)',     bg: 'linear-gradient(135deg,#fff8d6,#fff0e8)' },
  star:     { label: '⭐ Thu thập sao',       color: 'var(--lavender-500)',bg: 'linear-gradient(135deg,#ede8ff,#f5f3ff)' },
  emotion:  { label: '😊 Chuyên gia cảm xúc',color: 'var(--mint-500)',    bg: 'linear-gradient(135deg,#d8f5e8,#f0fbf5)' },
  perfect:  { label: '💎 Hoàn hảo',          color: 'var(--peach-400)',   bg: 'linear-gradient(135deg,#fff0d6,#fff9f0)' },
};

const CATEGORY_ORDER = ['general', 'streak', 'level', 'star', 'emotion', 'perfect'];

function BadgeCard({ badge, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:      'relative',
        borderRadius:  'var(--radius-xl)',
        padding:       '24px 16px',
        textAlign:     'center',
        cursor:        badge.earned ? 'default' : 'not-allowed',
        background:    badge.earned
          ? (CATEGORY_META[badge.category]?.bg || 'linear-gradient(135deg,#f0f9ff,white)')
          : 'linear-gradient(135deg,#f1f5f9,#f8fafc)',
        border:        badge.earned
          ? `2px solid ${CATEGORY_META[badge.category]?.color}33`
          : '2px solid rgba(148,163,184,0.15)',
        boxShadow:     badge.earned && hovered
          ? '0 12px 32px rgba(0,0,0,0.12)'
          : badge.earned
            ? '0 4px 14px rgba(0,0,0,0.06)'
            : 'none',
        transform:     badge.earned && hovered ? 'translateY(-4px) scale(1.02)' : 'none',
        transition:    'all 0.25s ease',
        opacity:       badge.earned ? 1 : 0.55,
        animationDelay: `${index * 0.05}s`,
      }}
      className="animate-rise"
    >
      {/* Badge icon */}
      <div style={{
        fontSize:      badge.earned ? '3.2rem' : '2.8rem',
        lineHeight:    1,
        marginBottom:  10,
        filter:        badge.earned ? 'none' : 'grayscale(1)',
        transform:     badge.earned && hovered ? 'scale(1.15) rotate(-5deg)' : 'scale(1)',
        transition:    'transform 0.25s ease',
        display:       'inline-block',
      }}>
        {badge.earned ? badge.icon : '🔒'}
      </div>

      {/* Name */}
      <div style={{
        fontSize:   '0.9rem',
        fontWeight: 800,
        color:      badge.earned
          ? (CATEGORY_META[badge.category]?.color || 'var(--ink-700)')
          : 'var(--ink-300)',
        lineHeight: 1.3,
        marginBottom: 6,
      }}>
        {badge.name}
      </div>

      {/* Description */}
      <div style={{
        fontSize:   '0.78rem',
        color:      badge.earned ? 'var(--ink-500)' : 'var(--ink-300)',
        lineHeight: 1.5,
      }}>
        {badge.description}
      </div>

      {/* Earned date */}
      {badge.earned && badge.earnedAt && (
        <div style={{
          marginTop:  8,
          fontSize:   '0.72rem',
          fontWeight: 700,
          color:      CATEGORY_META[badge.category]?.color || 'var(--sky-500)',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 'var(--radius-full)',
          padding:    '3px 10px',
          display:    'inline-flex',
          alignItems: 'center',
          gap:        4,
        }}>
          ✅ {new Date(badge.earnedAt).toLocaleDateString('vi-VN')}
        </div>
      )}

      {/* NEW ribbon */}
      {badge.earned && badge.earnedAt && (
        (() => {
          const diff = (Date.now() - new Date(badge.earnedAt)) / (1000 * 3600 * 24);
          if (diff > 2) return null;
          return (
            <div style={{
              position:    'absolute',
              top:         -6,
              right:       -6,
              background:  'var(--coral-500)',
              color:       'white',
              fontSize:    '0.65rem',
              fontWeight:  900,
              padding:     '3px 8px',
              borderRadius: 'var(--radius-full)',
              boxShadow:   '0 2px 8px rgba(255,112,88,0.4)',
            }}>
              MỚI!
            </div>
          );
        })()
      )}
    </div>
  );
}

export default function BadgeCollectionPage() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let mounted = true;
    client.get('/api/badges')
      .then(({ data: d }) => { if (mounted) { setData(d); setLoading(false); } })
      .catch((err) => {
        if (mounted) {
          setError(err?.response?.data?.message || 'Không tải được huy hiệu.');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const grouped = useMemo(() => {
    if (!data?.badges) return [];
    const map = {};
    data.badges.forEach((b) => {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    });
    return CATEGORY_ORDER
      .filter((cat) => map[cat]?.length > 0)
      .map((cat) => ({ category: cat, badges: map[cat] }));
  }, [data]);

  const earnedCount = data?.earnedCount || 0;
  const totalCount  = data?.totalCount  || 0;
  const percent     = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20 }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <Card variant="sun" className="animate-rise" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
        <span className="float-emoji" style={{ top: 10, right: 60,  fontSize: '2.5rem', animationDelay: '0s'  }}>⭐</span>
        <span className="float-emoji" style={{ top: 30, right: 20,  fontSize: '2rem',   animationDelay: '1s'  }}>🏅</span>
        <span className="float-emoji" style={{ bottom: 15, right: 110, fontSize: '1.8rem', animationDelay: '2s' }}>✨</span>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')} style={{ marginBottom: 16 }}>
            ← Về Dashboard
          </Button>

          <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: 'var(--ink-800)', marginBottom: 8 }}>
            🏆 Bộ sưu tập huy hiệu
          </h1>
          <p style={{ color: 'var(--ink-500)', fontSize: '1rem', marginBottom: 20 }}>
            Hoàn thành thử thách để mở khóa huy hiệu đặc biệt!
          </p>

          {/* Progress bar */}
          {!loading && (
            <div style={{ maxWidth: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginBottom: 8 }}>
                <span style={{ color: 'var(--ink-600)' }}>Đã mở khóa</span>
                <span style={{ color: 'var(--sun-600)' }}>{earnedCount} / {totalCount} huy hiệu ({percent}%)</span>
              </div>
              <div className="progress-track" style={{ height: 14, borderRadius: 'var(--radius-full)' }}>
                <div
                  className="progress-fill progress-animated"
                  style={{
                    width:      `${percent}%`,
                    background: 'linear-gradient(90deg, var(--sun-400), var(--coral-400))',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="loading-spinner" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* ── Badge groups ──────────────────────────────────────── */}
      {!loading && !error && grouped.map(({ category, badges }) => {
        const meta    = CATEGORY_META[category] || {};
        const earned  = badges.filter((b) => b.earned).length;
        return (
          <section key={category}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', color: meta.color || 'var(--ink-700)' }}>
                {meta.label || category}
              </h2>
              <span className="pill" style={{
                background: (meta.color || 'var(--sky-500)') + '18',
                color:      meta.color || 'var(--sky-500)',
                border:     `1.5px solid ${(meta.color || 'var(--sky-500)') + '30'}`,
                fontWeight: 800,
              }}>
                {earned}/{badges.length}
              </span>
            </div>

            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap:                 14,
            }}>
              {badges.map((badge, i) => (
                <BadgeCard key={badge.id} badge={badge} index={i} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state */}
      {!loading && !error && grouped.length === 0 && (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏅</div>
          <h2 style={{ color: 'var(--ink-700)' }}>Bắt đầu học để nhận huy hiệu!</h2>
          <p style={{ color: 'var(--ink-400)', marginTop: 8 }}>Hoàn thành bài học đầu tiên để mở khóa huy hiệu đặc biệt.</p>
          <div style={{ marginTop: 20 }}>
            <Button variant="primary" onClick={() => navigate('/learn/1/flashcard')}>
              🎯 Học ngay
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
