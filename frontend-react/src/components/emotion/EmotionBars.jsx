import { getEmotionColor, getEmotionLabel } from '../../utils/emotionHelpers';

export default function EmotionBars({ emotions, dominantEmotion }) {
  const entries = Object.entries(emotions || {});

  return (
    <div className="surface-card animate-pop" style={{ padding: 14 }}>
      <h3 style={{ marginBottom: 10, fontSize: 20 }}>Cảm xúc hiện tại</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ fontWeight: key === dominantEmotion ? 900 : 700 }}>{getEmotionLabel(key)}</span>
              <span style={{ color: '#4f758a', fontWeight: 700 }}>{value}%</span>
            </div>
            <div style={{ height: 8, background: '#edf4f8', borderRadius: 999 }}>
              <div
                style={{
                  width: `${value}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: getEmotionColor(key),
                  transition: 'width .25s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
