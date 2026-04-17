import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const EMOTION_FILTERS = ['Tất cả', 'Vui vẻ', 'Buồn bã', 'Tức giận', 'Sợ hãi'];

const EMOTION_COLOR = {
  'Vui vẻ':   { bg: '#FFF8D6', text: '#B45309', border: '#FCD34D' },
  'Buồn bã':  { bg: '#DAEEFF', text: '#1D4ED8', border: '#93C5FD' },
  'Tức giận': { bg: '#FFE8E0', text: '#B91C1C', border: '#FCA5A5' },
  'Sợ hãi':   { bg: '#EDE8FF', text: '#7C3AED', border: '#C4B5FD' },
};

const DIFFICULTY_LABEL = { 1: '⭐ Dễ', 2: '⭐⭐ Vừa', 3: '⭐⭐⭐ Khó' };

function StoryCard({ story, onClick }) {
  const [hovered, setHovered] = useState(false);
  const em = EMOTION_COLOR[story.emotionTag] || { bg: '#F0F9FF', text: '#0369A1', border: '#7DD3FC' };
  const pct = story.progress.completed ? 100
    : story.totalPages > 0
      ? Math.round(((story.progress.lastPageOrder - 1) / story.totalPages) * 100)
      : 0;

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius:  20,
        overflow:      'hidden',
        cursor:        'pointer',
        border:        `2px solid ${hovered ? em.border : em.border + '66'}`,
        background:    'white',
        boxShadow:     hovered ? '0 16px 40px rgba(0,0,0,0.14)' : '0 4px 16px rgba(0,0,0,0.06)',
        transform:     hovered ? 'translateY(-4px)' : 'none',
        transition:    'all 0.25s ease',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cover */}
      <div style={{
        height:         180,
        background:     story.coverBg || em.bg,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '6rem',
        position:       'relative',
        flexShrink:     0,
      }}>
        <span style={{
          transform:  hovered ? 'scale(1.15) rotate(-5deg)' : 'scale(1)',
          transition: 'transform 0.25s ease',
          display:    'inline-block',
          filter:     'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
        }}>
          {story.coverEmoji}
        </span>
        {/* Difficulty badge */}
        <div style={{
          position:     'absolute',
          top:          10, left: 10,
          background:   'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(4px)',
          borderRadius: 20,
          padding:      '3px 10px',
          fontSize:     '0.75rem',
          fontWeight:   700,
          color:        '#64748B',
        }}>
          {DIFFICULTY_LABEL[story.difficulty] || '⭐'}
        </div>
        {/* Completed badge */}
        {story.progress.completed && (
          <div style={{
            position:     'absolute',
            top:          10, right: 10,
            background:   '#34D399',
            color:        'white',
            borderRadius: 20,
            padding:      '3px 10px',
            fontSize:     '0.75rem',
            fontWeight:   800,
          }}>
            ✅ Đã đọc
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Emotion tag */}
        <span style={{
          display:      'inline-flex',
          alignItems:   'center',
          gap:          4,
          fontSize:     '0.78rem',
          fontWeight:   800,
          color:        em.text,
          background:   em.bg,
          border:       `1.5px solid ${em.border}`,
          borderRadius: 20,
          padding:      '2px 10px',
          width:        'fit-content',
        }}>
          🏷️ {story.emotionTag}
        </span>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E293B', lineHeight: 1.3, margin: 0 }}>
          {story.title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, margin: 0, flex: 1 }}>
          {story.description}
        </p>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, flexWrap: 'wrap' }}>
          <span>🕐 {story.estimatedMinutes} phút</span>
          <span>📄 {story.totalPages} trang</span>
        </div>

        {/* Progress bar */}
        {pct > 0 && !story.progress.completed && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 4 }}>Đang đọc — {pct}%</div>
            <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${em.border}, ${em.text})`, borderRadius: 3 }} />
            </div>
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          style={{ marginTop: 4, background: `linear-gradient(135deg, ${em.border}, ${em.text})`, border: 'none' }}
        >
          {story.progress.completed ? '🔁 Đọc lại' : pct > 0 ? '▶ Tiếp tục' : '📖 Bắt đầu đọc'}
        </Button>
      </div>
    </article>
  );
}

export default function StoryLibraryPage() {
  const navigate = useNavigate();
  const [stories,   setStories]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filter,    setFilter]    = useState('Tất cả');

  useEffect(() => {
    client.get('/api/stories')
      .then(({ data }) => { setStories(data); setLoading(false); })
      .catch((err) => { setError(err?.response?.data?.message || 'Lỗi tải truyện'); setLoading(false); });
  }, []);

  const filtered = filter === 'Tất cả' ? stories : stories.filter((s) => s.emotionTag === filter);
  const completedCount = stories.filter((s) => s.progress.completed).length;

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20 }}>

      {/* Header */}
      <Card variant="sky" className="animate-rise" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
        <span className="float-emoji" style={{ top: 10, right: 60,  fontSize: '2.5rem', animationDelay: '0s'  }}>📖</span>
        <span className="float-emoji" style={{ top: 30, right: 20,  fontSize: '2rem',   animationDelay: '1.2s'}}>✨</span>
        <span className="float-emoji" style={{ bottom: 14, right: 110, fontSize: '1.8rem', animationDelay: '2s' }}>🌈</span>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')} style={{ marginBottom: 14 }}>← Về Dashboard</Button>
          <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#1E293B', marginBottom: 6 }}>
            📚 Kho Truyện Cảm Xúc
          </h1>
          <p style={{ color: '#475569', fontSize: '1rem', marginBottom: 16 }}>
            Khám phá cảm xúc qua những câu chuyện thú vị!
          </p>

          {!loading && stories.length > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(126,197,248,0.4)' }}>
              <span>📊</span>
              <span style={{ fontWeight: 800, color: '#0369A1', fontSize: '0.9rem' }}>
                Đã đọc {completedCount}/{stories.length} truyện
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {EMOTION_FILTERS.map((f) => {
          const em = EMOTION_COLOR[f] || {};
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:      '8px 18px',
                borderRadius: 20,
                border:       active ? `2px solid ${em.border || '#93C5FD'}` : '2px solid rgba(148,163,184,0.20)',
                background:   active ? (em.bg || '#DAEEFF') : 'white',
                color:        active ? (em.text || '#1D4ED8') : '#64748B',
                fontWeight:   active ? 800 : 600,
                cursor:       'pointer',
                fontSize:     '0.9rem',
                transition:   'all 0.2s',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="loading-spinner" /></div>}

      {/* Error */}
      {error && !loading && <div className="alert alert-error">{error}</div>}

      {/* Story grid */}
      {!loading && !error && (
        filtered.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map((story, i) => (
              <div key={story.id} className="animate-rise" style={{ animationDelay: `${i * 0.08}s` }}>
                <StoryCard story={story} onClick={() => navigate(`/stories/${story.id}`)} />
              </div>
            ))}
          </div>
        ) : (
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>📭</div>
            <p style={{ color: '#94A3B8' }}>Không có truyện nào cho cảm xúc này.</p>
          </Card>
        )
      )}
    </div>
  );
}
