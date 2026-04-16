/* ─── StarBadge ──────────────────────────────────────────────
   Badge hiển thị số sao với animation sparkle
───────────────────────────────────────────────────────────── */
import { useEffect, useRef } from 'react';

export default function StarBadge({
  count   = 0,
  animate = false,
  size    = 'md',
  label,
  style,
}) {
  const prevRef = useRef(count);
  const didChange = count !== prevRef.current;

  useEffect(() => {
    prevRef.current = count;
  }, [count]);

  const config = {
    sm: { star: '1.4rem', num: '1.1rem', pad: '8px 14px' },
    md: { star: '2rem',   num: '1.5rem', pad: '10px 18px' },
    lg: { star: '2.8rem', num: '2rem',   pad: '14px 24px' },
  }[size] || { star: '2rem', num: '1.5rem', pad: '10px 18px' };

  return (
    <div
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           10,
        padding:       config.pad,
        borderRadius:  '20px',
        background:    'linear-gradient(135deg, #fff8e8, #fffce0)',
        border:        '2px solid rgba(255,217,77,0.40)',
        boxShadow:     '0 4px 16px rgba(249,195,26,0.18)',
        ...style,
      }}
    >
      <span
        className={animate && didChange ? 'animate-bounce' : ''}
        style={{ fontSize: config.star, lineHeight: 1 }}
      >
        ⭐
      </span>
      <div>
        <div style={{
          fontSize:   config.num,
          fontWeight: 900,
          fontFamily: 'var(--font-heading)',
          color:      '#B8860B',
          lineHeight: 1,
        }}>
          {count}
        </div>
        {label && (
          <div style={{
            fontSize:   '0.75rem',
            fontWeight: 700,
            color:      '#D4A017',
            marginTop:  2,
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
