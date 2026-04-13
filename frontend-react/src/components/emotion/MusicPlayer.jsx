import { getEmotionLabel, getEmotionEmoji, getEmotionColor } from '../../utils/emotionHelpers';

const EMOTION_MUSIC_LABELS = {
  neutral: 'Ambient nhẹ nhàng',
  happy: 'Nhạc vui tươi',
  sad: 'Piano thư thái',
  angry: 'Nhạc trầm lắng',
  fearful: 'Nhạc an ủi',
  disgusted: 'Nhạc chuyển tâm trạng',
  surprised: 'Nhạc phấn khích',
};

function getMusicLabel(emotion) {
  return EMOTION_MUSIC_LABELS[emotion] || 'Đang chờ...';
}

export default function MusicPlayer({
  isPlaying,
  currentEmotion,
  volume,
  isMuted,
  isEnabled,
  trackError,
  onToggleMute,
  onToggleEnabled,
  onVolumeChange,
  onPause,
  onResume,
}) {
  const color = currentEmotion ? getEmotionColor(currentEmotion) : '#94a3b8';

  return (
    <div className="surface-card animate-pop" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎵</span> Nhạc theo cảm xúc
        </h3>
        <button
          onClick={onToggleEnabled}
          title={isEnabled ? 'Tắt nhạc tự động' : 'Bật nhạc tự động'}
          style={{
            background: isEnabled
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #94a3b8, #64748b)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '5px 14px',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all .25s ease',
            boxShadow: isEnabled ? '0 2px 8px rgba(16,185,129,.3)' : 'none',
          }}
        >
          {isEnabled ? '🔔 BẬT' : '🔕 TẮT'}
        </button>
      </div>

      {/* Track info */}
      <div
        style={{
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
          border: `2px solid ${color}30`,
          borderRadius: 14,
          padding: '12px 14px',
          transition: 'all .4s ease',
        }}
      >
        {currentEmotion && isPlaying ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Animated disc */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: `conic-gradient(${color}, ${color}80, ${color}40, ${color})`,
                display: 'grid',
                placeItems: 'center',
                animation: 'spin-disc 3s linear infinite',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  fontSize: 12,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {getEmotionEmoji(currentEmotion)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b' }}>
                {getEmotionEmoji(currentEmotion)} {getEmotionLabel(currentEmotion)}
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 2, fontWeight: 600 }}>
                {getMusicLabel(currentEmotion)}
              </div>
            </div>

            {/* Visualizer bars */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    borderRadius: 2,
                    background: color,
                    animation: `equalizer-bar ${0.3 + i * 0.15}s ease-in-out infinite alternate`,
                    minHeight: 4,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 14, padding: '6px 0' }}>
            {!isEnabled
              ? '🔇 Nhạc tự động đã tắt'
              : trackError
              ? `⚠️ ${trackError}`
              : '🎧 Đang chờ nhận diện cảm xúc...'}
          </div>
        )}
      </div>

      {/* Controls */}
      {isEnabled && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onResume}
            disabled={!currentEmotion}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: currentEmotion
                ? `linear-gradient(135deg, ${color}, ${color}cc)`
                : '#e2e8f0',
              color: '#fff',
              fontSize: 16,
              cursor: currentEmotion ? 'pointer' : 'default',
              display: 'grid',
              placeItems: 'center',
              transition: 'all .2s ease',
              boxShadow: currentEmotion ? `0 2px 8px ${color}40` : 'none',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Volume */}
          <button
            onClick={onToggleMute}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px',
              opacity: 0.7,
              transition: 'opacity .2s',
            }}
            title={isMuted ? 'Bỏ tắt tiếng' : 'Tắt tiếng'}
          >
            {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : Math.round(volume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            style={{
              flex: 1,
              height: 6,
              appearance: 'none',
              background: `linear-gradient(to right, ${color} ${isMuted ? 0 : volume * 100}%, #e2e8f0 ${isMuted ? 0 : volume * 100}%)`,
              borderRadius: 999,
              outline: 'none',
              cursor: 'pointer',
            }}
          />

          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
            {isMuted ? '0' : Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes spin-disc {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes equalizer-bar {
          0% { height: 4px; }
          100% { height: 24px; }
        }
      `}</style>
    </div>
  );
}
