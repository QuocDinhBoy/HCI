/* ─────────────────────────────────────────────────────────────
   LearningMapPage — Bản Đồ Hành Trình Cảm Xúc
   Phong cách: Khu vườn khám phá, thân thiện với trẻ tự kỷ
   Layout: vertical scroll, SVG path uốn cong, zigzag nodes
───────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate }                                        from 'react-router-dom';
import client                                                 from '../api/client';

/* ── Lesson metadata ──────────────────────────────────────── */
const LESSON_ORDER = ['flashcard', 'matching', 'context', 'emotion_training'];
const LESSON_META  = {
  flashcard:        { label: 'Thẻ học',      icon: '🃏', color: '#4EB8F8', lightBg: '#DAEEFF' },
  matching:         { label: 'Ghép cặp',     icon: '🧩', color: '#34D399', lightBg: '#D8F5E8' },
  context:          { label: 'Ngữ cảnh',     icon: '📖', color: '#B49DF5', lightBg: '#EDE8FF' },
  emotion_training: { label: 'Biểu cảm AI',  icon: '🎭', color: '#FF9E7A', lightBg: '#FFE8E0' },
};

/* ── Level visual themes (by index) ──────────────────────── */
const LEVEL_THEME = [
  {
    mapName: 'Đảo Vui Vẻ',     mapEmoji: '🏝️',
    nodeGrad: 'radial-gradient(circle at 35% 35%, #FFF8D6, #FDE68A)',
    borderColor: '#FCD34D',     glowColor: 'rgba(252,211,77,0.55)',
    textColor:   '#B45309',     charEmoji: '😊',
    pathColor:   '#FCD34D',
  },
  {
    mapName: 'Vịnh Cảm Xúc',   mapEmoji: '🌊',
    nodeGrad: 'radial-gradient(circle at 35% 35%, #DAEEFF, #93C5FD)',
    borderColor: '#60A5FA',     glowColor: 'rgba(96,165,250,0.50)',
    textColor:   '#1D4ED8',     charEmoji: '😢',
    pathColor:   '#93C5FD',
  },
  {
    mapName: 'Núi Dũng Cảm',   mapEmoji: '🗻',
    nodeGrad: 'radial-gradient(circle at 35% 35%, #EDE8FF, #C4B5FD)',
    borderColor: '#A78BFA',     glowColor: 'rgba(167,139,250,0.50)',
    textColor:   '#6D28D9',     charEmoji: '😤',
    pathColor:   '#C4B5FD',
  },
  {
    mapName: 'Khu Rừng Bí Ẩn', mapEmoji: '🌲',
    nodeGrad: 'radial-gradient(circle at 35% 35%, #D8F5E8, #6EE7B7)',
    borderColor: '#34D399',     glowColor: 'rgba(52,211,153,0.50)',
    textColor:   '#065F46',     charEmoji: '😨',
    pathColor:   '#6EE7B7',
  },
  {
    mapName: 'Đỉnh Sao Vàng',  mapEmoji: '⭐',
    nodeGrad: 'radial-gradient(circle at 35% 35%, #FFF0D6, #FDBA74)',
    borderColor: '#F97316',     glowColor: 'rgba(249,115,22,0.50)',
    textColor:   '#C2410C',     charEmoji: '🤩',
    pathColor:   '#FDBA74',
  },
];
const getTheme = (i) => LEVEL_THEME[i % LEVEL_THEME.length];

/* ── Map geometry ─────────────────────────────────────────── */
const MAP_W   = 360;   // logical map width (px)
const NODE_R  = 48;    // node circle radius
const V_GAP   = 220;   // vertical distance between node centres
const H_OFF   = 110;   // horizontal offset from centre for each zigzag side

const nodePos = (i) => ({
  cx: i % 2 === 0 ? H_OFF : MAP_W - H_OFF,
  cy: 140 + i * V_GAP,
});

/* ── SVG curved path between two nodes ───────────────────── */
const curvePath = (p1, p2) => {
  const my = (p1.cy + p2.cy) / 2;
  return `M ${p1.cx} ${p1.cy} C ${p1.cx} ${my} ${p2.cx} ${my} ${p2.cx} ${p2.cy}`;
};

/* ── Decorative elements scattered on the map ────────────── */
const DECOS = [
  { e: '☀️',  x: 295, y:  28, s: 42, d: '4s'  },
  { e: '🌈',  x: 130, y:  20, s: 50, d: '7s'  },
  { e: '☁️',  x:  10, y:  65, s: 38, d: '5s'  },
  { e: '☁️',  x: 260, y: 110, s: 30, d: '6s'  },
  { e: '🌸',  x: 310, y: 200, s: 28, d: '3.5s'},
  { e: '🦋',  x:  15, y: 245, s: 24, d: '2.8s'},
  { e: '🌟',  x: 295, y: 330, s: 22, d: '3.2s'},
  { e: '🌲',  x:   8, y: 415, s: 36, d: '5.5s'},
  { e: '🌴',  x: 315, y: 480, s: 32, d: '4.5s'},
  { e: '🌺',  x:  20, y: 580, s: 26, d: '3.8s'},
  { e: '⭐',  x: 290, y: 620, s: 20, d: '2.5s'},
  { e: '✨',  x: 150, y: 650, s: 18, d: '2.2s'},
  { e: '🍀',  x:  12, y: 720, s: 24, d: '4.2s'},
  { e: '🌙',  x: 305, y: 760, s: 28, d: '6.5s'},
];

/* ── Helpers ──────────────────────────────────────────────── */
const pct = (level) => {
  if (!level?.lessons) return 0;
  const done = LESSON_ORDER.filter((t) => level.lessons[t]).length;
  return Math.round((done / LESSON_ORDER.length) * 100);
};

const nextUnfinishedLesson = (level) => {
  if (level?.locked) return null;
  return LESSON_ORDER.find((t) => !level?.lessons?.[t]) || null;
};

const isLessonLocked = (level, type) => {
  if (level?.locked) return true;
  const idx = LESSON_ORDER.indexOf(type);
  return idx > 0 && !level?.lessons?.[LESSON_ORDER[idx - 1]];
};

/* ── Mini progress ring (SVG) ── */
function ProgressRingSvg({ r, pct: p, stroke, bg = '#E2E8F0' }) {
  const circ = 2 * Math.PI * r;
  const dash  = (p / 100) * circ;
  return (
    <svg width={r * 2 + 8} height={r * 2 + 8} style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}>
      <circle cx={r + 4} cy={r + 4} r={r} fill="none" stroke={bg}     strokeWidth={5} />
      <circle cx={r + 4} cy={r + 4} r={r} fill="none" stroke={stroke} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${r + 4} ${r + 4})`}
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function LearningMapPage() {
  const navigate   = useNavigate();
  const scrollRef  = useRef(null);

  const [levels,    setLevels]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [selected,  setSelected]  = useState(null);  // index of node clicked
  const [justDone,  setJustDone]  = useState(null);  // index being celebrated

  /* fetch progress map */
  useEffect(() => {
    client.get('/api/progress-map')
      .then(({ data }) => { setLevels(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Không tải được bản đồ. Vui lòng thử lại.'); setLoading(false); });
  }, []);

  /* active node = first in-progress or next unlocked */
  const activeIdx = useMemo(() => {
    const i = levels.findIndex((l) => !l.locked && pct(l) < 100);
    return i === -1 ? levels.length - 1 : i;
  }, [levels]);

  const svgH = 140 + levels.length * V_GAP + 140;

  /* stats for top bar */
  const completedCount = levels.filter((l) => pct(l) === 100).length;
  const totalPct       = levels.length
    ? Math.round((levels.reduce((s, l) => s + pct(l), 0) / (levels.length * 100)) * 100)
    : 0;

  const handleNodeClick = useCallback((i) => {
    if (levels[i]?.locked) return;
    setSelected((prev) => (prev === i ? null : i));
  }, [levels]);

  const selectedLevel = selected !== null ? levels[selected] : null;
  const selectedTheme = selected !== null ? getTheme(selected) : null;

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#BAE6FD,#D1FAE5)' }}>
      <div style={{ fontSize: '5rem', animation: 'bounce-soft 1s ease infinite alternate', marginBottom: 16 }}>🗺️</div>
      <p style={{ color: '#075985', fontWeight: 800, fontSize: '1.1rem' }}>Đang vẽ bản đồ...</p>
    </div>
  );

  /* ── Error ───────────────────────────────────────────────── */
  if (error) return (
    <div style={{ padding: 32 }}>
      <div style={{ background: '#FFE8E0', border: '2px solid #FCA5A5', borderRadius: 16, padding: 20, color: '#B91C1C', marginBottom: 16 }}>{error}</div>
      <button onClick={() => navigate('/app')} style={{ background: '#4EB8F8', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 800, cursor: 'pointer' }}>← Về Trang Chủ</button>
    </div>
  );

  /* ── Main render ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#BAE6FD 0%,#D1FAE5 25%,#FEF9C3 65%,#FFF0D6 100%)', position: 'relative', fontFamily: 'inherit' }}>

      {/* ━━━━━━ STICKY TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        position:       'sticky', top: 0, zIndex: 60,
        background:     'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom:   '1px solid rgba(255,255,255,0.60)',
        padding:        '12px 16px',
        display:        'flex', alignItems: 'center', gap: 12,
        boxShadow:      '0 2px 16px rgba(0,0,0,0.08)',
      }}>
        <button
          onClick={() => navigate('/app')}
          style={{ background: 'rgba(148,163,184,0.12)', border: 'none', borderRadius: 12, width: 40, height: 40, cursor: 'pointer', fontSize: '1.1rem', color: '#475569', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ←
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1E293B' }}>🗺️ Bản Đồ Hành Trình</div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
            {completedCount}/{levels.length} chặng hoàn thành · {totalPct}% tổng tiến độ
          </div>
        </div>

        {/* Mini progress bar */}
        <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B' }}>⭐ {totalPct}%</div>
          <div style={{ height: 6, width: 80, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalPct}%`, background: 'linear-gradient(90deg,#FCD34D,#F97316)', borderRadius: 3, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* ━━━━━━ MAP SCROLL AREA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        ref={scrollRef}
        style={{ overflowY: 'auto', paddingBottom: 160, paddingTop: 8 }}
      >
        {/* Centered map canvas */}
        <div style={{
          position:   'relative',
          width:      MAP_W,
          margin:     '0 auto',
          minHeight:  svgH,
          userSelect: 'none',
        }}>

          {/* ── Background decoration layer ─────────────────── */}
          {DECOS.map((d, i) => (
            <span
              key={i}
              style={{
                position:   'absolute',
                left:       d.x,
                top:        d.y,
                fontSize:   d.s,
                zIndex:     0,
                opacity:    0.75,
                animation:  `bounce-soft ${d.d} ease infinite alternate`,
                display:    'inline-block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {d.e}
            </span>
          ))}

          {/* ── SVG path layer ──────────────────────────────── */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: svgH, zIndex: 2, overflow: 'visible' }}
            viewBox={`0 0 ${MAP_W} ${svgH}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Defs: arrow marker */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {levels.slice(0, -1).map((_, i) => {
              const p1      = nodePos(i);
              const p2      = nodePos(i + 1);
              const done    = pct(levels[i]) === 100;
              const theme   = getTheme(i);
              const d       = curvePath(p1, p2);
              return (
                <g key={i}>
                  {/* Shadow / base path */}
                  <path d={d} fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth={14} strokeLinecap="round" />
                  {/* Main path */}
                  {done ? (
                    /* Completed: solid colored with glow */
                    <path d={d} fill="none" stroke={theme.pathColor} strokeWidth={8} strokeLinecap="round" filter="url(#glow)" />
                  ) : (
                    /* Upcoming: dashed earth-colored */
                    <path d={d} fill="none" stroke="rgba(164,140,100,0.35)" strokeWidth={7} strokeLinecap="round" strokeDasharray="14 10" />
                  )}
                  {/* Footprint dots on completed */}
                  {done && [0.25, 0.5, 0.75].map((t, ti) => {
                    // Approx point on cubic bezier at t
                    const bx = (1-t)**3*p1.cx + 3*(1-t)**2*t*(p1.cx) + 3*(1-t)*t**2*(p2.cx) + t**3*p2.cx;
                    const by = (1-t)**3*p1.cy + 3*(1-t)**2*t*((p1.cy+p2.cy)/2) + 3*(1-t)*t**2*((p1.cy+p2.cy)/2) + t**3*p2.cy;
                    return <circle key={ti} cx={bx} cy={by} r={4} fill={theme.pathColor} opacity={0.6} />;
                  })}
                </g>
              );
            })}

            {/* START flag label */}
            {levels.length > 0 && (() => {
              const sp = nodePos(0);
              return (
                <text x={sp.cx} y={sp.cy - NODE_R - 44} textAnchor="middle" fontSize={13} fontWeight={800} fill="#B45309" opacity={0.8}>
                  🚩 Xuất phát
                </text>
              );
            })()}

            {/* FINISH flag label */}
            {levels.length > 1 && (() => {
              const ep = nodePos(levels.length - 1);
              const done = pct(levels[levels.length - 1]) === 100;
              return (
                <text x={ep.cx} y={ep.cy + NODE_R + 34} textAnchor="middle" fontSize={13} fontWeight={800} fill={done ? '#059669' : '#94A3B8'} opacity={0.85}>
                  {done ? '🏆 Đích đến!' : '🎯 Đích đến'}
                </text>
              );
            })()}
          </svg>

          {/* ── Nodes ───────────────────────────────────────── */}
          {levels.map((level, i) => {
            const pos      = nodePos(i);
            const p        = pct(level);
            const theme    = getTheme(i);
            const isActive = i === activeIdx;
            const isDone   = p === 100;
            const isLocked = level.locked;
            const isSel    = selected === i;
            const celebrating = justDone === i;

            return (
              <div
                key={level.id}
                onClick={() => handleNodeClick(i)}
                style={{
                  position:     'absolute',
                  left:         pos.cx - NODE_R,
                  top:          pos.cy - NODE_R,
                  width:        NODE_R * 2,
                  height:       NODE_R * 2,
                  zIndex:       10,
                  cursor:       isLocked ? 'default' : 'pointer',
                  userSelect:   'none',
                }}
              >
                {/* Floating character above active node */}
                {isActive && !isDone && (
                  <div style={{
                    position:  'absolute',
                    top:       -52, left: '50%', transform: 'translateX(-50%)',
                    fontSize:  '2.2rem',
                    animation: 'bounce-soft 1.2s ease infinite alternate',
                    zIndex:    20,
                    filter:    'drop-shadow(0 4px 8px rgba(0,0,0,0.20))',
                  }}>
                    🐰
                  </div>
                )}

                {/* Celebration burst */}
                {celebrating && (
                  <div style={{
                    position: 'absolute', inset: -28,
                    animation: 'bounce-soft 0.3s ease 3',
                    fontSize: '1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 30,
                  }}>
                    🎉✨🎊
                  </div>
                )}

                {/* Node circle */}
                <div style={{
                  width:        '100%',
                  height:       '100%',
                  borderRadius: '50%',
                  background:   isLocked
                    ? 'linear-gradient(135deg,#F1F5F9,#E2E8F0)'
                    : isDone
                      ? theme.nodeGrad
                      : isActive
                        ? theme.nodeGrad
                        : 'linear-gradient(135deg,#FFFFFF,#F8FAFC)',
                  border:       `4px solid ${isLocked ? '#CBD5E1' : isSel ? theme.borderColor : isDone ? theme.borderColor : isActive ? theme.borderColor : 'rgba(203,213,225,0.60)'}`,
                  boxShadow:    isLocked ? 'none'
                    : isSel    ? `0 0 0 4px ${theme.glowColor}, 0 8px 24px rgba(0,0,0,0.16)`
                    : isDone   ? `0 0 22px ${theme.glowColor}, 0 4px 12px rgba(0,0,0,0.10)`
                    : isActive ? `0 0 18px ${theme.glowColor}, 0 6px 20px rgba(0,0,0,0.14)`
                    :             '0 4px 12px rgba(0,0,0,0.06)',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     '2.2rem',
                  transform:    isSel ? 'scale(1.14)' : isActive ? 'scale(1.07)' : 'scale(1)',
                  transition:   'all 0.28s cubic-bezier(.34,1.56,.64,1)',
                  position:     'relative',
                  opacity:      isLocked ? 0.62 : 1,
                }}>
                  {isLocked ? '🔒' : isDone ? theme.charEmoji : theme.charEmoji}

                  {/* Done checkmark overlay */}
                  {isDone && (
                    <div style={{
                      position:   'absolute',
                      bottom:     -2, right: -2,
                      width:      24, height: 24,
                      borderRadius: '50%',
                      background: '#059669',
                      border:     '3px solid white',
                      display:    'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize:   '0.75rem', fontWeight: 900,
                      boxShadow:  '0 2px 8px rgba(5,150,105,0.4)',
                    }}>✓</div>
                  )}

                  {/* Progress ring (SVG arc) */}
                  {!isLocked && !isDone && p > 0 && (
                    <ProgressRingSvg r={NODE_R - 2} pct={p} stroke={theme.borderColor} bg="rgba(0,0,0,0.06)" />
                  )}
                </div>

                {/* Label below node */}
                <div style={{
                  position:   'absolute',
                  top:        NODE_R * 2 + 10,
                  left:       '50%',
                  transform:  'translateX(-50%)',
                  textAlign:  'center',
                  whiteSpace: 'nowrap',
                  zIndex:     11,
                }}>
                  <div style={{
                    fontWeight:  900,
                    fontSize:    '0.82rem',
                    color:       isLocked ? '#94A3B8' : theme.textColor,
                    textShadow:  '0 1px 6px rgba(255,255,255,0.9)',
                    marginBottom: 2,
                  }}>
                    {theme.mapEmoji} {theme.mapName}
                  </div>
                  {!isLocked && (
                    <div style={{
                      fontSize:   '0.7rem',
                      fontWeight: 700,
                      color:      isDone ? '#059669' : isActive ? theme.textColor : '#94A3B8',
                      background: 'rgba(255,255,255,0.75)',
                      borderRadius: 10,
                      padding:    '1px 8px',
                      display:    'inline-block',
                      backdropFilter: 'blur(4px)',
                    }}>
                      {isDone ? '✅ Hoàn thành' : isActive ? `⚡ ${p}% · Đang học` : `${p}%`}
                    </div>
                  )}
                  {isLocked && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8' }}>
                      🔒 Chưa mở
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━ BOTTOM PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {selectedLevel && selectedTheme && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
          />

          {/* Panel */}
          <div style={{
            position:     'fixed',
            bottom:       0, left: 0, right: 0,
            zIndex:       80,
            background:   'white',
            borderRadius: '28px 28px 0 0',
            boxShadow:    '0 -12px 48px rgba(0,0,0,0.18)',
            padding:      '0 0 env(safe-area-inset-bottom,24px)',
            maxWidth:     540,
            margin:       '0 auto',
            maxHeight:    '70vh',
            overflowY:    'auto',
            animation:    'slideUp 0.3s cubic-bezier(.22,1,.36,1)',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 44, height: 5, borderRadius: 3, background: '#E2E8F0' }} />
            </div>

            {/* Level header */}
            <div style={{
              margin:     '16px 20px 0',
              padding:    '20px',
              borderRadius: 20,
              background: selectedTheme.nodeGrad,
              border:     `2px solid ${selectedTheme.borderColor}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.70)',
                  border: `3px solid ${selectedTheme.borderColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem', flexShrink: 0,
                  boxShadow: `0 4px 16px ${selectedTheme.glowColor}`,
                }}>
                  {selectedTheme.charEmoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 900, fontSize: '1.25rem', color: selectedTheme.textColor,
                    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                  }}>
                    {selectedTheme.mapEmoji} {selectedLevel.name || selectedTheme.mapName}
                  </div>
                  {selectedLevel.description && (
                    <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                      {selectedLevel.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar in panel */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedTheme.textColor }}>Tiến độ</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: selectedTheme.textColor }}>{pct(selectedLevel)}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.50)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width:  `${pct(selectedLevel)}%`,
                    background: `linear-gradient(90deg, ${selectedTheme.borderColor}, ${selectedTheme.glowColor.replace('0.5','0.9')})`,
                    borderRadius: 5,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            </div>

            {/* Lesson buttons */}
            <div style={{ padding: '20px 20px 4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                📚 Các bài học trong chặng này
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {LESSON_ORDER.map((type) => {
                  const done   = Boolean(selectedLevel.lessons?.[type]);
                  const locked = isLessonLocked(selectedLevel, type);
                  const meta   = LESSON_META[type];
                  return (
                    <button
                      key={type}
                      disabled={locked}
                      onClick={() => { setSelected(null); navigate(`/learn/${selectedLevel.id}/${type}`); }}
                      style={{
                        padding:      '14px 16px',
                        borderRadius: 16,
                        border:       done   ? `2px solid ${meta.color}55`
                                     : locked ? '2px solid #E2E8F0'
                                     :           `2px solid ${meta.color}44`,
                        background:   done   ? meta.lightBg
                                     : locked ? '#F8FAFC'
                                     :           'white',
                        cursor:       locked ? 'not-allowed' : 'pointer',
                        opacity:      locked ? 0.55 : 1,
                        display:      'flex',
                        alignItems:   'center',
                        gap:          10,
                        textAlign:    'left',
                        transition:   'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{done ? '✅' : locked ? '🔒' : meta.icon}</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: done ? meta.color : locked ? '#94A3B8' : '#1E293B', lineHeight: 1.3 }}>
                        {meta.label}
                        <br />
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#059669' : locked ? '#94A3B8' : '#64748B' }}>
                          {done ? 'Hoàn thành' : locked ? 'Cần làm trước' : 'Chưa học'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding: '16px 20px 28px', display: 'flex', gap: 10 }}>
              {(() => {
                const next = nextUnfinishedLesson(selectedLevel);
                const done = pct(selectedLevel) === 100;
                if (done) return (
                  <button
                    onClick={() => setSelected(null)}
                    style={{ flex: 1, padding: '16px', borderRadius: 18, border: '2px solid #6EE7B7', background: '#D8F5E8', color: '#065F46', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}
                  >
                    🎉 Chặng hoàn thành rồi!
                  </button>
                );
                if (!next) return null;
                const meta = LESSON_META[next];
                return (
                  <button
                    onClick={() => { setSelected(null); navigate(`/learn/${selectedLevel.id}/${next}`); }}
                    style={{
                      flex:      1,
                      padding:   '16px',
                      borderRadius: 18,
                      border:    'none',
                      background: `linear-gradient(135deg, ${meta.color}, ${meta.color}CC)`,
                      color:     'white',
                      fontWeight: 900,
                      fontSize:  '1.05rem',
                      cursor:    'pointer',
                      boxShadow: `0 6px 20px ${meta.color}55`,
                      display:   'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {meta.icon} Tiếp tục · {meta.label}
                    <span style={{ fontSize: '1.2rem' }}>→</span>
                  </button>
                );
              })()}
              <button
                onClick={() => setSelected(null)}
                style={{ width: 50, height: 50, borderRadius: 16, border: '2px solid #E2E8F0', background: 'white', color: '#64748B', fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Inject slideUp keyframe ──────────────────────────── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
