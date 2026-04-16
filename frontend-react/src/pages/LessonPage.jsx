/* ─── LessonPage ─────────────────────────────────────────────
   Module học tập — 4 chế độ:
   - Thẻ học (flashcard)
   - Ghép cặp (matching)
   - Ngữ cảnh (context)
   - Luyện biểu cảm AI (emotion_training / camera)
   
   Thiết kế: child-friendly, font lớn, button lớn, feedback tích cực
───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FeedbackPopup from '../components/ui/FeedbackPopup';
import CameraView from '../components/emotion/CameraView';
import EmotionBars from '../components/emotion/EmotionBars';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getEmotionLabel, normalizeEmotionLabel } from '../utils/emotionHelpers';

/* ── Constants ────────────────────────────────────────────── */
const endpointMap = {
  flashcard:       (level) => `/api/flashcard/${level}`,
  matching:        (level) => `/api/matching/${level}`,
  context:         (level) => `/api/context/${level}`,
  emotion_training:(level) => `/api/emotion-training/${level}`,
};

const lessonMeta = {
  flashcard:       { icon: '🃏', title: 'Thẻ học cảm xúc',       color: 'var(--sky-400)',      bgGrad: 'linear-gradient(135deg,var(--sky-50),white)' },
  matching:        { icon: '🧩', title: 'Ghép cặp cảm xúc',       color: 'var(--mint-400)',    bgGrad: 'linear-gradient(135deg,var(--mint-50),white)' },
  context:         { icon: '📖', title: 'Bài học ngữ cảnh',       color: 'var(--lavender-400)', bgGrad: 'linear-gradient(135deg,var(--lavender-50),white)' },
  emotion_training:{ icon: '🎭', title: 'Luyện biểu cảm với AI', color: 'var(--peach-400)',    bgGrad: 'linear-gradient(135deg,var(--peach-50),white)' },
};

function shuffleArray(input) {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalizeMatchingCards(rawCards) {
  const grouped = new Map();
  rawCards.forEach((card) => {
    if (!card?.pair_key) return;
    const list = grouped.get(card.pair_key) || [];
    list.push(card);
    grouped.set(card.pair_key, list);
  });
  const normalized = [];
  grouped.forEach((cards) => {
    const usableCount = cards.length - (cards.length % 2);
    if (usableCount >= 2) normalized.push(...cards.slice(0, usableCount));
  });
  return shuffleArray(normalized);
}

/* ── Component ────────────────────────────────────────────── */
export default function LessonPage() {
  const navigate = useNavigate();
  const { levelId, lessonType } = useParams();

  // Core state
  const [items,           setItems]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [index,           setIndex]           = useState(0);
  const [selectedAnswer,  setSelectedAnswer]  = useState('');
  const [feedback,        setFeedback]        = useState('');
  const [feedbackType,    setFeedbackType]    = useState('correct');
  const [showFeedback,    setShowFeedback]    = useState(false);
  const [completed,       setCompleted]       = useState(false);
  const [score,           setScore]           = useState(0);

  // Matching state
  const [flipped,               setFlipped]               = useState([]);
  const [matchedIds,            setMatchedIds]            = useState([]);
  const [matchingBusy,          setMatchingBusy]          = useState(false);
  const [matchingAttempts,      setMatchingAttempts]      = useState(0);
  const [matchingCorrectPairs,  setMatchingCorrectPairs]  = useState(0);

  // Camera state
  const [challengeActive, setChallengeActive] = useState(false);
  const [capturedImage,   setCapturedImage]   = useState('');
  const [analyzing,       setAnalyzing]       = useState(false);
  const [analysis,        setAnalysis]        = useState(null);

  // Refs
  const autoAdvanceRef      = useRef(null);
  const attemptsRef         = useRef(0);
  const correctPairsRef     = useRef(0);
  const matchingTimeoutRef  = useRef(null);
  const firstPickRef        = useRef(null);
  const matchedIdsRef       = useRef([]);
  const itemsRef            = useRef([]);
  const questionStartRef    = useRef(Date.now());
  const cameraRef           = useRef(null);

  const {
    isModelLoaded, emotions, dominantEmotion,
    loadModels, startDetection, stopDetection, startCamera, stopCamera,
  } = useFaceDetection();

  const {
    isEnabled: isTtsEnabled, isSpeaking, toggle: toggleTts,
    speakInstruction, speakFeedback, stop: stopTts,
  } = useTextToSpeech();

  const currentItem    = items[index] || null;
  const isCameraLesson = lessonType === 'emotion_training';
  const meta           = lessonMeta[lessonType] || lessonMeta.flashcard;

  useEffect(() => { matchedIdsRef.current = matchedIds; }, [matchedIds]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => {
    return () => {
      clearTimeout(matchingTimeoutRef.current);
      clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const targetEmotion = useMemo(() =>
    currentItem?.emotion_name || currentItem?.targetEmotion || currentItem?.target_emotion_name || 'Vui vẻ',
  [currentItem]);

  const targetEmotionKey = useMemo(() => normalizeEmotionLabel(targetEmotion), [targetEmotion]);
  const localMatchScore  = emotions[targetEmotionKey] || 0;

  const progress = useMemo(() => {
    if (completed) return 100;
    if (!items.length) return 0;
    if (lessonType === 'matching') return Math.round((matchedIds.length / items.length) * 100);
    if (isCameraLesson) {
      const base  = (index / items.length) * 100;
      const bonus = analysis?.isMatch ? 100 / items.length : 0;
      return Math.min(100, Math.round(base + bonus));
    }
    return Math.round((index / items.length) * 100);
  }, [analysis?.isMatch, completed, index, isCameraLesson, items.length, lessonType, matchedIds.length]);

  const starCount = useMemo(() => {
    if (!items.length) return 3;
    const ratio = lessonType === 'matching'
      ? (score || 0) / Math.max(1, items.length / 2)
      : (score || 0) / Math.max(1, items.length);
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.6) return 2;
    return 1;
  }, [items.length, lessonType, score]);

  /* ── Helpers ────────────────────────────────────────────── */
  const logProgress = async ({ isCorrect, questionId = 0, chosenEmotionId = null, duration = 0, totalAttempts = 0, correctCount = 0 }) => {
    try {
      await client.post('/api/progress-map/log', {
        lessonType, levelId: Number(levelId), isCorrect, questionId, chosenEmotionId, duration, totalAttempts, correctCount,
      });
    } catch { /* non-blocking */ }
  };

  const finishLesson = () => {
    clearTimeout(matchingTimeoutRef.current);
    matchingTimeoutRef.current = null;
    firstPickRef.current = null;
    setCompleted(true);
    stopDetection();
    stopCamera();
    setChallengeActive(false);
    stopTts();
  };

  const resetChallengeState = () => { setCapturedImage(''); setAnalysis(null); setAnalyzing(false); };

  const goNextItem = () => {
    if (index >= items.length - 1) { finishLesson(); return; }
    setIndex((p) => p + 1);
    setSelectedAnswer('');
    setFeedback('');
    resetChallengeState();
    questionStartRef.current = Date.now();
  };

  /* ── Load lesson ─────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;
    async function loadLesson() {
      setLoading(true); setError(''); setCompleted(false); setScore(0);
      setIndex(0); setSelectedAnswer(''); setFeedback(''); setShowFeedback(false);
      setMatchedIds([]); setFlipped([]); setMatchingBusy(false);
      setMatchingAttempts(0); setMatchingCorrectPairs(0);
      attemptsRef.current = 0; correctPairsRef.current = 0;
      firstPickRef.current = null; matchedIdsRef.current = [];
      clearTimeout(matchingTimeoutRef.current);
      matchingTimeoutRef.current = null;
      setChallengeActive(false); resetChallengeState();
      stopDetection(); stopCamera(); stopTts();

      try {
        const pathFactory = endpointMap[lessonType];
        if (!pathFactory) throw new Error('Loại bài học chưa được hỗ trợ.');
        const { data } = await client.get(pathFactory(levelId));
        if (!mounted) return;
        const normalized = Array.isArray(data) ? data : [];
        setItems(lessonType === 'matching' ? normalizeMatchingCards(normalized) : normalized);
        questionStartRef.current = Date.now();
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err.message || 'Không tải được bài học.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadLesson();
    return () => { mounted = false; stopDetection(); stopCamera(); stopTts(); };
  }, [levelId, lessonType, stopCamera, stopDetection, stopTts]);

  /* ── TTS auto-speak ─────────────────────────────────────── */
  useEffect(() => {
    if (!currentItem || loading || completed || !isTtsEnabled) return;
    let text = '';
    if (lessonType === 'flashcard') text = currentItem.question || '';
    else if (lessonType === 'context') text = `${currentItem.story || ''}. ${currentItem.question || ''}`;
    else if (isCameraLesson) text = currentItem.instruction || `Hãy thể hiện cảm xúc ${targetEmotion}`;
    if (text) speakInstruction(text);
  }, [completed, currentItem, isCameraLesson, isTtsEnabled, lessonType, loading, speakInstruction, targetEmotion]);

  /* ── Quiz answer (flashcard / context) ──────────────────── */
  const handleQuizAnswer = async (option) => {
    if (!currentItem || selectedAnswer) return;
    const isCorrect = option === currentItem.correct;
    const duration  = Math.round((Date.now() - questionStartRef.current) / 1000);
    setSelectedAnswer(option);
    const message = isCorrect ? 'Chính xác! Giỏi lắm! 🎉' : `Chưa đúng. Đáp án là: ${currentItem.correct} 💡`;
    setFeedback(message);
    setFeedbackType(isCorrect ? 'correct' : 'try');
    setShowFeedback(true);
    speakFeedback(message);
    if (isCorrect) setScore((p) => p + 1);
    await logProgress({ isCorrect, questionId: currentItem.id, duration });
    setTimeout(() => { setShowFeedback(false); goNextItem(); }, 900);
  };

  /* ── Matching click ─────────────────────────────────────── */
  const handleMatchClick = async (id) => {
    if (matchingBusy || matchedIdsRef.current.includes(id)) return;
    if (firstPickRef.current === id) return;

    if (firstPickRef.current === null) {
      firstPickRef.current = id;
      setFlipped([id]);
      return;
    }

    const firstId = firstPickRef.current;
    firstPickRef.current = null;
    clearTimeout(matchingTimeoutRef.current);
    setFlipped([firstId, id]);
    setMatchingBusy(true);

    const first  = itemsRef.current.find((x) => x.id === firstId);
    const second = itemsRef.current.find((x) => x.id === id);
    attemptsRef.current += 1;
    setMatchingAttempts(attemptsRef.current);

    const isMatch = Boolean(first?.pair_key && second?.pair_key && first.pair_key === second.pair_key);

    if (isMatch) {
      const newMatched = [...matchedIdsRef.current, firstId, id];
      matchedIdsRef.current = newMatched;
      setMatchedIds(newMatched);
      setFlipped([]);
      correctPairsRef.current += 1;
      setMatchingCorrectPairs(correctPairsRef.current);
      setMatchingBusy(false);

      if (newMatched.length >= itemsRef.current.length && itemsRef.current.length > 0) {
        await logProgress({ isCorrect: true, totalAttempts: attemptsRef.current, correctCount: correctPairsRef.current });
        setScore(correctPairsRef.current);
        matchingTimeoutRef.current = setTimeout(() => finishLesson(), 500);
      }
      return;
    }

    matchingTimeoutRef.current = setTimeout(() => {
      setFlipped([]); setMatchingBusy(false); matchingTimeoutRef.current = null;
    }, 700);
  };

  /* ── Camera challenge ───────────────────────────────────── */
  const startChallengeCamera = async () => {
    if (challengeActive) return;
    setError('');
    try {
      await loadModels();
      await startCamera(cameraRef.current);
      await new Promise((resolve) => {
        const video = cameraRef.current;
        if (!video || video.readyState >= 2) return resolve();
        video.onloadeddata = resolve;
      });
      startDetection(cameraRef.current, 750);
      setChallengeActive(true);
      resetChallengeState();
    } catch (err) {
      setError(err?.message || 'Không bật được camera.');
      stopDetection(); stopCamera(); setChallengeActive(false);
    }
  };

  const stopChallengeCamera = () => {
    stopDetection(); stopCamera(); setChallengeActive(false); resetChallengeState();
  };

  const captureAndAnalyze = async () => {
    if (!cameraRef.current || analyzing || !currentItem) return;
    const video = cameraRef.current;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      setError('Camera chưa sẵn sàng. Vui lòng chờ một lát rồi thử lại.'); return;
    }
    stopDetection(); setError('');
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { startDetection(cameraRef.current, 750); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageBase64);
    setAnalyzing(true);

    const scheduleAutoAdvance = (delay) => {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        if (index < items.length - 1) {
          setIndex((p) => p + 1);
          resetChallengeState();
          questionStartRef.current = Date.now();
          if (cameraRef.current && challengeActive) startDetection(cameraRef.current, 750);
        } else { finishLesson(); }
      }, delay);
    };

    const apply = async (resultPayload) => {
      const normalized = {
        isMatch:    Boolean(resultPayload?.isMatch),
        confidence: Number(resultPayload?.confidence ?? 0),
        emoji:      resultPayload?.emoji || (resultPayload?.isMatch ? '😊' : '🤔'),
        message:    resultPayload?.message || (resultPayload?.isMatch ? 'Xuất sắc!' : 'Thử lại nhé!'),
        tip:        resultPayload?.tip || '',
      };
      setAnalysis(normalized);
      speakFeedback(normalized.message);
      await logProgress({ isCorrect: normalized.isMatch, questionId: currentItem.id || 0, duration: Math.round((Date.now() - questionStartRef.current) / 1000) });
      if (normalized.isMatch) { setScore((p) => p + 1); scheduleAutoAdvance(1200); }
    };

    try {
      const { data } = await client.post('/api/gemini/analyze', { imageBase64, targetEmotion });
      await apply(data);
    } catch (err) {
      const code = err?.response?.data?.errorCode;
      const isConfig = ['GEMINI_KEY_MISSING','GEMINI_KEY_INVALID','GEMINI_KEY_LEAKED','GEMINI_PROJECT_DENIED','OPENROUTER_KEY_MISSING','OPENROUTER_KEY_INVALID','AI_PROVIDER_ALL_FAILED'].includes(code);
      if (isConfig) {
        const localPassed = localMatchScore >= 60;
        await apply({ isMatch: localPassed, confidence: localMatchScore, emoji: localPassed ? '😊' : '🤔', message: localPassed ? 'AI cloud đang bận, chấm nội bộ: Con đạt yêu cầu! 🎉' : 'AI cloud đang bận, chấm nội bộ: Chưa đạt, thử lại nhé! 💪', tip: 'Kiểm tra cấu hình GEMINI_API_KEY trong backend để bật AI cloud.' });
      } else {
        const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
        setAnalysis({ isMatch: false, confidence: 0, emoji: '⚠️', message: isTimeout ? 'AI mất quá nhiều thời gian. Con thử chụp lại nhé!' : (err?.response?.data?.message || 'Không kết nối được AI.'), tip: isTimeout ? 'Đảm bảo mặt con rõ ràng và ánh sáng đủ tốt.' : (err?.response?.data?.tip || 'Kiểm tra kết nối mạng rồi chụp lại.') });
        speakFeedback('Có lỗi xảy ra, con thử lại nhé!');
      }
    } finally { setAnalyzing(false); }
  };

  const retryCameraChallenge = () => {
    resetChallengeState();
    if (cameraRef.current && challengeActive) startDetection(cameraRef.current, 750);
  };

  /* ═══════════════════════════════════════════════════════════
      RENDER — Flashcard & Context (Quiz)
  ═══════════════════════════════════════════════════════════ */
  const renderQuiz = () => {
    if (!currentItem) return <p style={{ color: 'var(--ink-400)' }}>Không có câu hỏi.</p>;
    return (
      <div style={{ display: 'grid', gap: 20, maxWidth: 680, margin: '0 auto' }}>
        {/* Image */}
        {currentItem.image && (
          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow:     'hidden',
            boxShadow:    'var(--shadow-lg)',
            border:       '3px solid rgba(126,197,248,0.25)',
            aspectRatio:  '4/3',
            background:   'var(--sky-50)',
          }}>
            <img
              src={currentItem.image}
              alt="Cảm xúc"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Story / Question */}
        <Card variant={lessonType === 'context' ? 'lavender' : 'sky'}>
          {currentItem.story && (
            <p style={{
              fontSize: '1.1rem', lineHeight: 1.7,
              color: 'var(--ink-600)', marginBottom: 14,
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(180,163,245,0.20)',
            }}>
              📖 {currentItem.story}
            </p>
          )}
          <h2 style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
            color: 'var(--ink-800)',
            lineHeight: 1.4,
          }}>
            {currentItem.question || currentItem.instruction}
          </h2>

          {/* TTS button */}
          <button
            onClick={toggleTts}
            style={{
              marginTop: 10, padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: isTtsEnabled ? 'var(--sky-100)' : 'var(--ink-50)',
              border: `1.5px solid ${isTtsEnabled ? 'rgba(126,197,248,0.35)' : 'rgba(148,163,184,0.25)'}`,
              color: isTtsEnabled ? 'var(--sky-500)' : 'var(--ink-400)',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {isTtsEnabled ? (isSpeaking ? '🔊 Đang đọc...' : '🔊 Đọc to') : '🔇 Đọc to (tắt)'}
          </button>
        </Card>

        {/* Answer buttons */}
        <div className="emotion-options stagger-children">
          {currentItem.options?.map((option) => {
            const isPicked  = selectedAnswer === option;
            const isCorrect = option === currentItem.correct;
            let btnClass = 'emotion-option-btn';
            if (selectedAnswer) {
              if (isCorrect) btnClass += ' correct';
              else if (isPicked) btnClass += ' wrong';
            }
            return (
              <button
                key={option}
                className={btnClass}
                onClick={() => handleQuizAnswer(option)}
                disabled={Boolean(selectedAnswer)}
                aria-label={`Chọn đáp án: ${option}`}
              >
                <span className="emoji">
                  {isCorrect && selectedAnswer ? '✅' : isPicked && !isCorrect ? '💡' : '🤔'}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
      RENDER — Matching Cards
  ═══════════════════════════════════════════════════════════ */
  const renderMatching = () => (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Card variant="mint" style={{ marginBottom: 16, padding: '16px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>🧩 Ghép cặp cảm xúc giống nhau!</h2>
            <p style={{ color: 'var(--ink-500)', marginTop: 4, fontSize: '0.95rem' }}>
              Chạm vào 2 thẻ có cùng cảm xúc để ghép cặp
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span className="pill pill-sky">🎯 {matchingAttempts} lần</span>
            <span className="pill pill-mint">✅ {matchingCorrectPairs} cặp</span>
          </div>
        </div>
      </Card>

      <div style={{
        display:               'grid',
        gridTemplateColumns:   'repeat(auto-fit, minmax(130px, 1fr))',
        gap:                   14,
      }}>
        {items.map((card) => {
          const opened  = flipped.includes(card.id) || matchedIds.includes(card.id);
          const matched = matchedIds.includes(card.id);

          return (
            <div key={card.id} className="match-card-wrapper">
              <div
                className={`match-card ${opened ? 'flipped' : ''} ${matched ? 'matched' : ''}`}
                onClick={() => !matched && !matchingBusy && handleMatchClick(card.id)}
                role="button"
                aria-label={opened ? card.emotion : 'Thẻ úp'}
                tabIndex={matched ? -1 : 0}
                onKeyDown={(e) => e.key === 'Enter' && !matched && !matchingBusy && handleMatchClick(card.id)}
              >
                {/* Front (hidden side) */}
                <div className="match-card-front">
                  <span style={{ fontSize: '2rem' }}>❓</span>
                </div>

                {/* Back (shown when flipped) */}
                <div className="match-card-back">
                  {card.image
                    ? <img src={card.image} alt={card.emotion} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 10 }} />
                    : <span style={{ fontSize: '2.5rem' }}>😊</span>
                  }
                  <div style={{
                    fontSize: '0.95rem', fontWeight: 800,
                    color: matched ? 'var(--mint-500)' : 'var(--ink-700)',
                    marginTop: 6, textAlign: 'center',
                  }}>
                    {card.emotion}
                  </div>
                  {matched && <span style={{ fontSize: '1.2rem' }}>✅</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
      RENDER — Camera Challenge (emotion_training)
  ═══════════════════════════════════════════════════════════ */
  const renderCameraChallenge = () => {
    if (!currentItem) return <p style={{ color: 'var(--ink-400)' }}>Không có dữ liệu bài học.</p>;

    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 900, margin: '0 auto' }}>

        {/* Target instruction */}
        <Card variant="peach" style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
            {/* Guide image */}
            {currentItem.guideImage
              ? <img src={currentItem.guideImage} alt={`Hướng dẫn biểu cảm ${targetEmotion}`} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '3px solid rgba(255,192,94,0.35)', boxShadow: 'var(--shadow-md)', flexShrink: 0 }} />
              : <div style={{ width: 110, height: 110, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg,var(--peach-100),var(--sun-100))', display: 'grid', placeItems: 'center', fontSize: '3.5rem', border: '3px solid rgba(255,192,94,0.35)' }}>🎭</div>
            }
            <div>
              <span className="pill pill-sun" style={{ marginBottom: 8, display: 'inline-flex' }}>
                Bài {index + 1} / {items.length}
              </span>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.8rem)', marginTop: 8 }}>
                Hãy thể hiện: <span style={{ color: 'var(--peach-500)' }}>"{targetEmotion}"</span>
              </h2>
              <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '1rem' }}>
                {currentItem.instruction || `Nhìn vào ảnh mẫu và bắt chước biểu cảm "${targetEmotion}" nhé!`}
              </p>
              {currentItem.tips && (
                <p style={{ marginTop: 8, color: 'var(--peach-500)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💡 {currentItem.tips}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Camera + Result panel */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.4fr 1fr' }}>

          {/* Camera */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CameraView
              videoRef={cameraRef}
              title="📷 Camera của con"
              subtitle={challengeActive ? `Nhận diện: ${getEmotionLabel(dominantEmotion)} (${localMatchScore}% khớp)` : 'Bật camera để bắt đầu'}
              isActive={challengeActive}
              onStart={startChallengeCamera}
              onStop={stopChallengeCamera}
              onCapture={captureAndAnalyze}
              captureDisabled={analyzing || !isModelLoaded}
            >
              {/* Realtime badge */}
              {challengeActive && !capturedImage && (
                <div style={{
                  position:  'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  background: localMatchScore >= 65 ? 'rgba(66,181,120,0.92)' : 'rgba(255,255,255,0.92)',
                  color:      localMatchScore >= 65 ? 'white' : 'var(--ink-700)',
                  borderRadius: 'var(--radius-full)', padding: '8px 20px',
                  fontWeight: 900, fontSize: '0.9rem', whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  {localMatchScore >= 65 ? '✅ ' : ''}{getEmotionLabel(dominantEmotion)} — {localMatchScore}% khớp
                </div>
              )}
            </CameraView>

            {challengeActive && <EmotionBars emotions={emotions} dominantEmotion={dominantEmotion} />}
          </div>

          {/* Right panel */}
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>

            {/* Captured photo */}
            {capturedImage && (
              <Card style={{ padding: 14 }}>
                <p style={{ fontWeight: 800, color: 'var(--ink-700)', marginBottom: 8, fontSize: '0.95rem' }}>📸 Ảnh vừa chụp</p>
                <img src={capturedImage} alt="Ảnh biểu cảm" style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '2px solid rgba(126,197,248,0.20)' }} />
              </Card>
            )}

            {/* Analyzing */}
            {analyzing && (
              <Card variant="sky" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', animation: 'float 1.5s ease-in-out infinite' }}>🧠</div>
                <p style={{ color: 'var(--sky-500)', fontWeight: 800, marginTop: 10, fontSize: '1rem' }}>Gemini AI đang phân tích...</p>
                <p style={{ color: 'var(--ink-400)', fontSize: '0.9rem', marginTop: 6 }}>Chờ con một tí nhé! 😊</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                  <div className="loading-spinner" />
                </div>
              </Card>
            )}

            {/* AI Result */}
            {analysis && !analyzing && (
              <Card
                style={{
                  padding:    20,
                  background: analysis.isMatch
                    ? 'linear-gradient(135deg, var(--mint-50), white)'
                    : 'linear-gradient(135deg, var(--sun-50), white)',
                  border:     `2px solid ${analysis.isMatch ? 'rgba(109,207,154,0.35)' : 'rgba(255,192,94,0.35)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: '2.5rem' }}>{analysis.emoji}</span>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: analysis.isMatch ? 'var(--mint-500)' : 'var(--peach-500)' }}>
                      {analysis.isMatch ? '🎉 Xuất sắc!' : '💪 Gần đúng rồi!'}
                    </h3>
                    <p style={{ color: 'var(--ink-500)', fontSize: '0.85rem', marginTop: 2 }}>
                      {analysis.isMatch ? 'Con biểu đạt rất tốt!' : 'Thêm một chút nữa là được!'}
                    </p>
                  </div>
                </div>

                <p style={{ color: 'var(--ink-700)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 12 }}>
                  {analysis.message}
                </p>

                {typeof analysis.confidence === 'number' && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--ink-500)', fontWeight: 700 }}>Độ khớp "{targetEmotion}"</span>
                      <span style={{ fontWeight: 900, color: analysis.confidence >= 65 ? 'var(--mint-500)' : 'var(--peach-500)' }}>
                        {analysis.confidence}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${analysis.confidence}%`, background: analysis.confidence >= 65 ? 'linear-gradient(90deg,var(--mint-300),var(--mint-500))' : 'linear-gradient(90deg,var(--peach-300),var(--peach-500))' }} />
                    </div>
                  </div>
                )}

                {analysis.tip && (
                  <div style={{ background: 'rgba(126,197,248,0.10)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12 }}>
                    <p style={{ color: 'var(--sky-600)', fontWeight: 700, fontSize: '0.9rem' }}>💡 {analysis.tip}</p>
                  </div>
                )}

                {!analysis.isMatch
                  ? <Button variant="ghost" size="sm" onClick={retryCameraChallenge}>🔄 Thử lại</Button>
                  : <p style={{ color: 'var(--mint-500)', fontWeight: 700, fontSize: '0.9rem' }}>⏳ Đang chuyển bài tiếp theo...</p>
                }
              </Card>
            )}

            {/* How to play (initial state) */}
            {!challengeActive && !capturedImage && !analysis && (
              <Card style={{ padding: 20, background: 'var(--ink-50)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--ink-700)', marginBottom: 12 }}>📋 Cách chơi</h3>
                <ol style={{ color: 'var(--ink-500)', fontSize: '0.95rem', lineHeight: 2.2, paddingLeft: 20, display: 'grid', gap: 4 }}>
                  <li>Bật camera và nhìn vào màn hình</li>
                  <li>Bắt chước biểu cảm <strong>"{targetEmotion}"</strong></li>
                  <li>Bấm <strong>Chụp và phân tích</strong></li>
                  <li>Gemini AI sẽ cho con biết kết quả!</li>
                </ol>
              </Card>
            )}
          </div>
        </div>

        {/* Camera responsive fix */}
        <style>{`
          @media (max-width: 700px) {
            .emotion-training-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
      TOP-LEVEL RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="page-shell" style={{ display: 'grid', gap: 20 }}>

      {/* Feedback popup overlay */}
      {showFeedback && (
        <FeedbackPopup
          type={feedbackType}
          message={feedback}
          onClose={() => setShowFeedback(false)}
          autoClose={900}
        />
      )}

      {/* ── Header bar ────────────────────────────────────────── */}
      <Card style={{
        padding:    '16px 22px',
        background: meta.bgGrad,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span className="pill pill-sky" style={{ marginBottom: 6, display: 'inline-flex' }}>
              {meta.icon} Cấp độ {levelId}
            </span>
            <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', marginTop: 6 }}>{meta.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={toggleTts}
              className="icon-btn"
              title={isTtsEnabled ? 'Tắt đọc to' : 'Bật đọc to'}
            >
              {isTtsEnabled ? (isSpeaking ? '🔊' : '🔔') : '🔇'}
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>
              ← Về lộ trình
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-500)', marginBottom: 6 }}>
            <span>Tiến độ</span>
            <span style={{ color: 'var(--sky-500)' }}>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="loading-spinner" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* ── Lesson content ────────────────────────────────────── */}
      {!loading && !error && !completed && (
        <>
          {/* Counter pill */}
          {(lessonType === 'flashcard' || lessonType === 'context') && currentItem && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="pill pill-sky" style={{ fontSize: '1rem', padding: '8px 20px' }}>
                Câu {index + 1} / {items.length}
              </span>
            </div>
          )}

          {(lessonType === 'flashcard' || lessonType === 'context') && renderQuiz()}
          {lessonType === 'matching' && renderMatching()}
          {isCameraLesson && renderCameraChallenge()}

          {!items.length && (
            <Card style={{ padding: 32, textAlign: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p style={{ color: 'var(--ink-400)', marginTop: 12 }}>Chưa có dữ liệu bài học cho cấp độ này.</p>
            </Card>
          )}
        </>
      )}

      {/* ── Completion screen ─────────────────────────────────── */}
      {completed && (
        <Card style={{
          textAlign:  'center',
          padding:    40,
          background: 'linear-gradient(135deg, var(--sun-50), white)',
          border:     '2px solid rgba(255,217,77,0.30)',
          maxWidth:   500,
          margin:     '0 auto',
        }}>
          <div style={{ fontSize: '5rem', animation: 'bounce-soft 0.8s ease infinite alternate' }}>🏆</div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', marginTop: 16, color: 'var(--ink-800)' }}>
            Hoàn thành rồi!
          </h2>
          <p style={{ color: 'var(--ink-500)', marginTop: 8, fontSize: '1.1rem' }}>
            Con đã làm rất tốt! Điểm của con: <strong style={{ color: 'var(--sky-500)' }}>{score}</strong>
          </p>

          {/* Stars */}
          <div style={{ marginTop: 16, fontSize: '3rem', display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ opacity: i < starCount ? 1 : 0.2, transition: `opacity 0.3s ${i * 0.15}s` }}>⭐</span>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" size="lg" onClick={() => navigate('/app')}>
              🗺️ Về lộ trình
            </Button>
            <Button variant="ghost" size="lg" onClick={() => window.location.reload()}>
              🔄 Học lại
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
