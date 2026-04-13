export const EMOTION_LABELS = {
  neutral: 'Bình thường',
  happy: 'Vui vẻ',
  sad: 'Buồn bã',
  angry: 'Tức giận',
  fearful: 'Sợ hãi',
  disgusted: 'Ghê tởm',
  surprised: 'Ngạc nhiên',
};

export const EMOTION_EMOJIS = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😡',
  fearful: '😨',
  disgusted: '🤢',
  surprised: '😲',
};

export const EMOTION_COLORS = {
  neutral: '#94a3b8',
  happy: '#f59e0b',
  sad: '#3b82f6',
  angry: '#ef4444',
  fearful: '#06b6d4',
  disgusted: '#22c55e',
  surprised: '#f97316',
};

export const emotionSuggestions = {
  happy: [
    'Con đang rất vui. Hãy chia sẻ niềm vui với ba mẹ nhé!',
    'Nụ cười của con đẹp lắm. Giữ nụ cười này nha!',
  ],
  sad: [
    'Mình thử hít thở sâu 3 lần nhé.',
    'Buồn là bình thường. Con có thể ôm gấu bông để cảm thấy tốt hơn.',
  ],
  angry: [
    'Thử đếm chậm từ 1 đến 10 để bình tĩnh hơn nhé.',
    'Mình nắm chặt bàn tay rồi thả lỏng ra nhé.',
  ],
  fearful: [
    'Con đang an toàn. Ba mẹ luôn ở bên con.',
    'Nghe một bản nhạc nhẹ để thư giãn nhé.',
  ],
  surprised: [
    'Wow, điều gì làm con bất ngờ vậy?',
    'Con kể cho ba mẹ nghe điều thú vị này nhé!',
  ],
  disgusted: [
    'Nếu con không thích, mình nghỉ một chút nhé.',
    'Hãy thử đổi sang hoạt động dễ chịu hơn.',
  ],
  neutral: [
    'Con đang bình tĩnh và tập trung rất tốt.',
    'Sẵn sàng cho bài học tiếp theo nào!',
  ],
};

export function getEmotionLabel(key) {
  return EMOTION_LABELS[key] || key;
}

export function getEmotionEmoji(key) {
  return EMOTION_EMOJIS[key] || '😐';
}

export function getEmotionColor(key) {
  return EMOTION_COLORS[key] || EMOTION_COLORS.neutral;
}

export function getRandomSuggestion(emotion) {
  const list = emotionSuggestions[emotion] || emotionSuggestions.neutral;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Chuyển tên cảm xúc tiếng Việt → key face-api.js
 * Hỗ trợ cả có dấu và không dấu để backward compatible
 */
export function normalizeEmotionLabel(value) {
  const map = {
    // có dấu (chuẩn)
    'Vui vẻ': 'happy',
    'Buồn bã': 'sad',
    'Tức giận': 'angry',
    'Sợ hãi': 'fearful',
    'Ngạc nhiên': 'surprised',
    'Ghê tởm': 'disgusted',
    'Bình thường': 'neutral',
    // không dấu (legacy/fallback)
    'Vui ve': 'happy',
    'Buon ba': 'sad',
    'Tuc gian': 'angry',
    'So hai': 'fearful',
    'Ngac nhien': 'surprised',
    'Ghe tom': 'disgusted',
    'Binh thuong': 'neutral',
  };
  return map[value] || 'neutral';
}
