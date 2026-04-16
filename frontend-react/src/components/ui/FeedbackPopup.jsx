/* ─── FeedbackPopup ──────────────────────────────────────────
   Overlay popup khi trả lời đúng/sai (child-friendly)
   Props:
     type  : 'correct' | 'wrong' | 'try'
     message : chuỗi hiển thị
     onClose : callback
     autoClose: ms (default 1200)
───────────────────────────────────────────────────────────── */
import { useEffect } from 'react';

const CONFIG = {
  correct: {
    emoji:   '🎉',
    bg:      'rgba(208, 246, 227, 0.95)',
    color:   '#276749',
    ring:    '#6DCF9A',
    label:   'Tuyệt vời!',
  },
  wrong: {
    emoji:   '💡',
    bg:      'rgba(255, 235, 228, 0.95)',
    color:   '#C05621',
    ring:    '#FF9B83',
    label:   'Thử lại nhé!',
  },
  try: {
    emoji:   '🌟',
    bg:      'rgba(237, 232, 255, 0.95)',
    color:   '#553C9A',
    ring:    '#B4A3F5',
    label:   'Cố thêm chút nữa!',
  },
};

export default function FeedbackPopup({
  type      = 'correct',
  message,
  onClose,
  autoClose = 1200,
}) {
  const cfg = CONFIG[type] || CONFIG.correct;

  useEffect(() => {
    if (!autoClose || !onClose) return;
    const t = setTimeout(onClose, autoClose);
    return () => clearTimeout(t);
  }, [autoClose, onClose]);

  return (
    <div
      className="feedback-overlay"
      onClick={onClose}
      role="dialog"
      aria-live="polite"
    >
      <div className="feedback-content">
        {/* Ring pulse */}
        <div style={{
          width:        160,
          height:       160,
          borderRadius: '50%',
          background:   cfg.bg,
          border:       `4px solid ${cfg.ring}`,
          boxShadow:    `0 0 0 12px ${cfg.ring}33`,
          display:      'grid',
          placeItems:   'center',
          margin:       '0 auto',
          animation:    'burst 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <span className="feedback-emoji">{cfg.emoji}</span>
        </div>

        <p className="feedback-text" style={{ color: cfg.color }}>
          {message || cfg.label}
        </p>

        <p style={{
          marginTop:  12,
          color:      'var(--ink-400)',
          fontSize:   '0.9rem',
          fontWeight: 600,
        }}>
          Chạm để tiếp tục
        </p>
      </div>
    </div>
  );
}
