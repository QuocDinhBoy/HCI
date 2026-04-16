/* ─── EmotionChip ────────────────────────────────────────────
   Hiển thị cảm xúc dưới dạng chip emoji + label + score bar
   Sizes: sm | md | lg
───────────────────────────────────────────────────────────── */
const SIZE_CONFIG = {
  sm: { emoji: '1.4rem', label: '0.8rem', padding: '6px 12px', gap: 6 },
  md: { emoji: '2rem',   label: '0.95rem', padding: '10px 16px', gap: 8 },
  lg: { emoji: '3rem',   label: '1.1rem', padding: '14px 20px', gap: 10 },
};

const EMOTION_COLORS = {
  vui:       { bg: '#FFF5CC', border: '#FFD94D', color: '#B8860B' },
  buồn:      { bg: '#DAEEFF', border: '#7EC5F8', color: '#2B6CB0' },
  tức:       { bg: '#FFE6E0', border: '#FF9B83', color: '#C53030' },
  sợ:        { bg: '#F5F3FF', border: '#B4A3F5', color: '#553C9A' },
  ngạc_nhiên:{ bg: '#FFF0D6', border: '#FFC05E', color: '#C05621' },
  ghê_tởm:   { bg: '#F0FBF5', border: '#6DCF9A', color: '#276749' },
  trung_lập: { bg: '#F8FAFC', border: '#94A3B8', color: '#475569' },
};

export default function EmotionChip({
  emotion = 'vui',
  emoji   = '😊',
  label,
  score,
  size  = 'md',
  active = false,
  style,
}) {
  const cfg   = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const color = EMOTION_COLORS[emotion] || {
    bg: '#F0F8FF', border: '#7EC5F8', color: '#2B6CB0',
  };

  return (
    <div
      style={{
        display:       'inline-flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           6,
        padding:       cfg.padding,
        borderRadius:  '18px',
        background:    active ? color.bg : 'white',
        border:        `2px solid ${active ? color.border : 'rgba(126,197,248,0.20)'}`,
        boxShadow:     active ? `0 4px 14px ${color.border}44` : '0 2px 8px rgba(100,149,237,0.08)',
        transition:    'all 0.2s ease',
        cursor:        'default',
        ...style,
      }}
    >
      <span style={{ fontSize: cfg.emoji, lineHeight: 1 }}>{emoji}</span>
      {label && (
        <span style={{
          fontSize:   cfg.label,
          fontWeight: 800,
          color:      active ? color.color : '#64748B',
          fontFamily: 'var(--font-body)',
        }}>
          {label}
        </span>
      )}
      {typeof score === 'number' && (
        <div style={{
          width: '100%', height: 5,
          background: 'rgba(100,149,237,0.12)',
          borderRadius: 99, overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(100, score)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color.border}, ${color.color})`,
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>
      )}
    </div>
  );
}
