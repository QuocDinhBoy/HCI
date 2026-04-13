import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mapping mỗi cảm xúc → file nhạc MP3 tương ứng trong /public/music/
 */
const EMOTION_TRACKS = {
  neutral: '/music/neutral.mp3',
  happy: '/music/happy.mp3',
  sad: '/music/sad.mp3',
  angry: '/music/angry.mp3',
  fearful: '/music/fearful.mp3',
  disgusted: '/music/disgusted.mp3',
  surprised: '/music/surprised.mp3',
};

const ALL_EMOTIONS = Object.keys(EMOTION_TRACKS);

/**
 * Thời gian tối thiểu (ms) cảm xúc phải giữ ổn định trước khi chuyển nhạc.
 * 600ms = gần realtime nhưng tránh flicker khi cảm xúc nhảy nhanh giữa 2 frame.
 */
const EMOTION_STABLE_MS = 600;

/**
 * Thời gian crossfade (ms) — bài cũ fade-out đồng thời bài mới fade-in.
 */
const CROSSFADE_MS = 300;

/**
 * Âm lượng mặc định (0-1).
 */
const DEFAULT_VOLUME = 0.45;

/**
 * Số bước fade (nhiều hơn = mượt hơn, nhưng tốn CPU hơn).
 */
const FADE_STEPS = 15;

/* ------------------------------------------------------------------ */
/*  Pre-loaded Audio Pool                                              */
/* ------------------------------------------------------------------ */

/**
 * Tạo sẵn 1 Audio element cho mỗi cảm xúc, pre-load ngay.
 * Giúp chuyển nhạc gần như tức thì (không chờ HTTP load).
 */
function createAudioPool() {
  const pool = {};
  for (const emotion of ALL_EMOTIONS) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;
    audio.src = EMOTION_TRACKS[emotion];
    pool[emotion] = audio;
  }
  return pool;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook quản lý phát nhạc tự động, đồng bộ gần realtime với cảm xúc.
 *
 * Kiến trúc tối ưu:
 * 1. Pre-load toàn bộ 7 tracks vào Audio pool khi mount.
 * 2. Debounce 600ms — chỉ cần cảm xúc giữ nguyên ~0.6s là chuyển nhạc.
 * 3. Crossfade đồng thời: bài cũ giảm + bài mới tăng volume cùng lúc (300ms).
 * 4. Không cần chờ load → chuyển nhạc gần như tức thì.
 */
export function useEmotionMusic() {
  const poolRef = useRef(null);
  const fadeTimersRef = useRef([]);
  const stableTimerRef = useRef(null);
  const stableEmotionRef = useRef(null);
  const currentEmotionRef = useRef(null);
  const targetVolumeRef = useRef(DEFAULT_VOLUME);
  const isMutedRef = useRef(false);
  const isEnabledRef = useRef(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [trackError, setTrackError] = useState(null);
  const [preloaded, setPreloaded] = useState(false);

  // Khởi tạo Audio pool 1 lần
  useEffect(() => {
    const pool = createAudioPool();
    poolRef.current = pool;

    // Theo dõi pre-load
    let loaded = 0;
    const total = ALL_EMOTIONS.length;

    for (const emotion of ALL_EMOTIONS) {
      const audio = pool[emotion];
      const onReady = () => {
        loaded++;
        if (loaded >= total) setPreloaded(true);
      };
      const onError = () => {
        loaded++;
        if (loaded >= total) setPreloaded(true);
      };
      // canplaythrough nghĩa là đã buffer đủ để phát không gián đoạn
      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
    }

    return () => {
      // Cleanup: dừng tất cả audio + clear timers
      clearTimeout(stableTimerRef.current);
      fadeTimersRef.current.forEach(clearInterval);
      fadeTimersRef.current = [];

      for (const emotion of ALL_EMOTIONS) {
        const audio = pool[emotion];
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      }
      poolRef.current = null;
    };
  }, []);

  /**
   * Fade âm lượng 1 Audio element.
   * Trả về Promise resolve khi hoàn thành.
   */
  const fadeAudio = useCallback((audio, from, to, duration = CROSSFADE_MS) => {
    return new Promise((resolve) => {
      if (!audio) return resolve();

      const stepTime = duration / FADE_STEPS;
      const stepValue = (to - from) / FADE_STEPS;
      let current = from;
      let step = 0;

      const id = setInterval(() => {
        step++;
        current += stepValue;
        audio.volume = Math.max(0, Math.min(1, current));

        if (step >= FADE_STEPS) {
          clearInterval(id);
          audio.volume = Math.max(0, Math.min(1, to));
          // Xóa timer khỏi tracking
          fadeTimersRef.current = fadeTimersRef.current.filter((t) => t !== id);
          resolve();
        }
      }, stepTime);

      fadeTimersRef.current.push(id);
    });
  }, []);

  /**
   * Crossfade: fade-out bài cũ + fade-in bài mới đồng thời.
   */
  const crossfadeTo = useCallback(
    async (newEmotion) => {
      const pool = poolRef.current;
      if (!pool) return;

      const targetVol = isMutedRef.current ? 0 : targetVolumeRef.current;
      const oldEmotion = currentEmotionRef.current;
      const newAudio = pool[newEmotion];

      if (!newAudio) {
        setTrackError(`Không tìm thấy track: ${newEmotion}`);
        return;
      }

      setTrackError(null);

      // Fade-out bài cũ + fade-in bài mới ĐỒNG THỜI
      const promises = [];

      // Fade out bài cũ (nếu có và đang phát)
      if (oldEmotion && oldEmotion !== newEmotion && pool[oldEmotion]) {
        const oldAudio = pool[oldEmotion];
        promises.push(
          fadeAudio(oldAudio, oldAudio.volume, 0).then(() => {
            oldAudio.pause();
            oldAudio.currentTime = 0;
          })
        );
      }

      // Fade in bài mới
      try {
        newAudio.volume = 0;
        await newAudio.play();

        promises.push(fadeAudio(newAudio, 0, targetVol));

        currentEmotionRef.current = newEmotion;
        setCurrentEmotion(newEmotion);
        setIsPlaying(true);

        await Promise.all(promises);
      } catch (err) {
        setTrackError(err?.message || 'Lỗi phát nhạc');
        setIsPlaying(false);
      }
    },
    [fadeAudio]
  );

  /**
   * Gọi mỗi khi dominantEmotion thay đổi.
   * Debounce 600ms — gần realtime nhưng tránh flicker.
   */
  const onEmotionChange = useCallback(
    (emotion) => {
      if (!isEnabledRef.current) return;
      if (!emotion) return;

      // Nếu cảm xúc giống cảm xúc đang phát → bỏ qua
      if (emotion === stableEmotionRef.current) return;

      clearTimeout(stableTimerRef.current);

      stableTimerRef.current = setTimeout(() => {
        stableEmotionRef.current = emotion;
        void crossfadeTo(emotion);
      }, EMOTION_STABLE_MS);
    },
    [crossfadeTo]
  );

  /**
   * Bật nhạc thủ công (Chrome autoplay policy).
   */
  const resumePlayback = useCallback(() => {
    const pool = poolRef.current;
    const emotion = currentEmotionRef.current;
    if (!pool || !emotion || !pool[emotion]) return;

    const targetVol = isMutedRef.current ? 0 : targetVolumeRef.current;
    pool[emotion].volume = targetVol;
    pool[emotion].play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  /**
   * Tạm dừng nhạc.
   */
  const pausePlayback = useCallback(async () => {
    const pool = poolRef.current;
    const emotion = currentEmotionRef.current;
    if (!pool || !emotion || !pool[emotion]) return;

    await fadeAudio(pool[emotion], pool[emotion].volume, 0);
    pool[emotion].pause();
    setIsPlaying(false);
  }, [fadeAudio]);

  /**
   * Dừng hoàn toàn tất cả nhạc và reset.
   */
  const stopMusic = useCallback(() => {
    clearTimeout(stableTimerRef.current);
    fadeTimersRef.current.forEach(clearInterval);
    fadeTimersRef.current = [];

    const pool = poolRef.current;
    if (pool) {
      for (const emotion of ALL_EMOTIONS) {
        const audio = pool[emotion];
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0;
        }
      }
    }

    currentEmotionRef.current = null;
    stableEmotionRef.current = null;
    setIsPlaying(false);
    setCurrentEmotion(null);
    setTrackError(null);
  }, []);

  /**
   * Cập nhật volume cho track đang phát.
   */
  const setVolume = useCallback((val) => {
    const v = Math.max(0, Math.min(1, val));
    targetVolumeRef.current = v;
    setVolumeState(v);

    // Apply ngay cho bài đang phát
    const pool = poolRef.current;
    const emotion = currentEmotionRef.current;
    if (pool && emotion && pool[emotion] && !isMutedRef.current) {
      pool[emotion].volume = v;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;

      // Apply ngay
      const pool = poolRef.current;
      const emotion = currentEmotionRef.current;
      if (pool && emotion && pool[emotion]) {
        pool[emotion].volume = next ? 0 : targetVolumeRef.current;
      }
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      isEnabledRef.current = next;
      if (!next) {
        stopMusic();
      }
      return next;
    });
  }, [stopMusic]);

  return {
    // State
    isPlaying,
    currentEmotion,
    volume,
    isMuted,
    isEnabled,
    trackError,
    preloaded,

    // Actions
    onEmotionChange,
    resumePlayback,
    pausePlayback,
    stopMusic,
    setVolume,
    toggleMute,
    toggleEnabled,
  };
}
