/* ─── ProgressRing ───────────────────────────────────────────
   SVG circular progress indicator, child-friendly
───────────────────────────────────────────────────────────── */
export default function ProgressRing({
  percent   = 0,
  size      = 100,
  stroke    = 10,
  color     = 'url(#ringGrad)',
  trackColor= 'rgba(126,197,248,0.15)',
  children,
  label,
}) {
  const radius = (size - stroke) / 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, percent) / 100) * circ;
  const id     = `ring-${Math.random().toString(36).slice(2)}`;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#7EC5F8" />
            <stop offset="100%" stopColor="#6DCF9A" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />

        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </svg>

      {/* Center content */}
      <div style={{
        position:  'absolute',
        inset:     0,
        display:   'grid',
        placeItems:'center',
        textAlign: 'center',
      }}>
        {children ?? (
          <div>
            <div style={{
              fontSize:   size > 80 ? '1.4rem' : '1rem',
              fontWeight: 900,
              fontFamily: 'var(--font-heading)',
              color: 'var(--ink-800)',
              lineHeight: 1,
            }}>
              {Math.round(percent)}%
            </div>
            {label && (
              <div style={{
                fontSize:   '0.72rem',
                fontWeight: 700,
                color:      'var(--ink-400)',
                marginTop:  2,
              }}>
                {label}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
