import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CameraView from '../components/emotion/CameraView';
import EmotionBars from '../components/emotion/EmotionBars';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getEmotionLabel, normalizeEmotionLabel } from '../utils/emotionHelpers';

const endpointMap = {
  flashcard: (level) => `/api/flashcard/${level}`,
  matching: (level) => `/api/matching/${level}`,
  context: (level) => `/api/context/${level}`,
  emotion_training: (level) => `/api/emotion-training/${level}`,
};

const lessonMeta = {
  flashcard: { icon: '🃏', title: 'Thẻ học' },
  matching: { icon: '🧩', title: 'Trò chơi ghép cặp' },
  context: { icon: '📖', title: 'Bài học ngữ cảnh' },
  emotion_training: { icon: '🎭', title: 'Luyện biểu cảm với AI' },
};

function titleOf(type) {
  return lessonMeta[type]?.title || 'Bài học';
}

function shuffleArray(input) {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i -= 1) {
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
    if (usableCount >= 2) {
      normalized.push(...cards.slice(0, usableCount));
    }
  });

  return shuffleArray(normalized);
}

export default function LessonPage() {
  const navigate = useNavigate();
  const { levelId, lessonType } = useParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const [flipped, setFlipped] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [matchingBusy, setMatchingBusy] = useState(false);
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [matchingCorrectPairs, setMatchingCorrectPairs] = useState(0);

  const [challengeActive, setChallengeActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const autoAdvanceRef = useRef(null);
  const attemptsRef = useRef(0);
  const correctPairsRef = useRef(0);
  const matchingTimeoutRef = useRef(null);
  const firstPickRef = useRef(null);
  const matchedIdsRef = useRef([]);
  const itemsRef = useRef([]);
  const questionStartRef = useRef(Date.now());
  const cameraRef = useRef(null);

  const {
    isModelLoaded,
    emotions,
    dominantEmotion,
    loadModels,
    startDetection,
    stopDetection,
    startCamera,
    stopCamera,
  } = useFaceDetection();

  const {
    isEnabled: isTtsEnabled,
    isSpeaking,
    toggle: toggleTts,
    speakInstruction,
    speakFeedback,
    stop: stopTts,
  } = useTextToSpeech();

  const currentItem = items[index] || null;
  const isCameraLesson = lessonType === 'emotion_training';

  useEffect(() => {
    matchedIdsRef.current = matchedIds;
  }, [matchedIds]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      if (matchingTimeoutRef.current) {
        clearTimeout(matchingTimeoutRef.current);
        matchingTimeoutRef.current = null;
      }
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, []);

  const targetEmotion = useMemo(() => {
    return (
      currentItem?.emotion_name ||
      currentItem?.targetEmotion ||
      currentItem?.target_emotion_name ||
      'Vui vẻ'
    );
  }, [currentItem]);

  const targetEmotionKey = useMemo(() => normalizeEmotionLabel(targetEmotion), [targetEmotion]);
  const localMatchScore = emotions[targetEmotionKey] || 0;

  const progress = useMemo(() => {
    if (completed) return 100;
    if (!items.length) return 0;

    if (lessonType === 'matching') {
      return Math.round((matchedIds.length / items.length) * 100);
    }

    if (isCameraLesson) {
      const base = (index / items.length) * 100;
      const bonus = analysis?.isMatch ? 100 / items.length : 0;
      return Math.min(100, Math.round(base + bonus));
    }

    return Math.round((index / items.length) * 100);
  }, [analysis?.isMatch, completed, index, isCameraLesson, items.length, lessonType, matchedIds.length]);

  const starCount = useMemo(() => {
    if (!items.length) return 3;

    let ratio = 0;
    if (lessonType === 'matching') {
      ratio = (score || 0) / Math.max(1, items.length / 2);
    } else {
      ratio = (score || 0) / Math.max(1, items.length);
    }

    if (ratio >= 0.9) return 3;
    if (ratio >= 0.6) return 2;
    return 1;
  }, [items.length, lessonType, score]);

  const logProgress = async ({
    isCorrect,
    questionId = 0,
    chosenEmotionId = null,
    duration = 0,
    totalAttempts = 0,
    correctCount = 0,
  }) => {
    try {
      await client.post('/api/progress-map/log', {
        lessonType,
        levelId: Number(levelId),
        isCorrect,
        questionId,
        chosenEmotionId,
        duration,
        totalAttempts,
        correctCount,
      });
    } catch {
      // Non-blocking log.
    }
  };

  const finishLesson = () => {
    if (matchingTimeoutRef.current) {
      clearTimeout(matchingTimeoutRef.current);
      matchingTimeoutRef.current = null;
    }
    firstPickRef.current = null;
    setCompleted(true);
    stopDetection();
    stopCamera();
    setChallengeActive(false);
    stopTts();
  };

  const resetChallengeState = () => {
    setCapturedImage('');
    setAnalysis(null);
    setAnalyzing(false);
  };

  const goNextItem = () => {
    if (index >= items.length - 1) {
      finishLesson();
      return;
    }

    setIndex((prev) => prev + 1);
    setSelectedAnswer('');
    setFeedback('');
    resetChallengeState();
    questionStartRef.current = Date.now();
  };

  useEffect(() => {
    let mounted = true;

    async function loadLesson() {
      setLoading(true);
      setError('');
      setCompleted(false);
      setScore(0);
      setIndex(0);
      setSelectedAnswer('');
      setFeedback('');
      setMatchedIds([]);
      setFlipped([]);
      setMatchingBusy(false);
      setMatchingAttempts(0);
      setMatchingCorrectPairs(0);
      attemptsRef.current = 0;
      correctPairsRef.current = 0;
      firstPickRef.current = null;
      matchedIdsRef.current = [];

      if (matchingTimeoutRef.current) {
        clearTimeout(matchingTimeoutRef.current);
        matchingTimeoutRef.current = null;
      }

      setChallengeActive(false);
      resetChallengeState();
      stopDetection();
      stopCamera();
      stopTts();

      try {
        const pathFactory = endpointMap[lessonType];
        if (!pathFactory) {
          throw new Error('Loai bai hoc chua duoc ho tro.');
        }

        const { data } = await client.get(pathFactory(levelId));
        if (!mounted) return;

        const normalized = Array.isArray(data) ? data : [];
        if (lessonType === 'matching') {
          setItems(normalizeMatchingCards(normalized));
        } else {
          setItems(normalized);
        }

        questionStartRef.current = Date.now();
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err.message || 'Khong tai duoc bai hoc.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLesson();

    return () => {
      mounted = false;
      stopDetection();
      stopCamera();
      stopTts();
    };
  }, [levelId, lessonType, stopCamera, stopDetection, stopTts]);

  useEffect(() => {
    if (!currentItem || loading || completed || !isTtsEnabled) return;

    let text = '';
    if (lessonType === 'flashcard') {
      text = currentItem.question || '';
    } else if (lessonType === 'context') {
      text = `${currentItem.story || ''}. ${currentItem.question || ''}`;
    } else if (isCameraLesson) {
      text = currentItem.instruction || `Hay the hien cam xuc ${targetEmotion}`;
    }

    if (text) {
      speakInstruction(text);
    }
  }, [
    completed,
    currentItem,
    isCameraLesson,
    isTtsEnabled,
    lessonType,
    loading,
    speakInstruction,
    targetEmotion,
  ]);

  const handleQuizAnswer = async (option) => {
    if (!currentItem || selectedAnswer) return;

    const isCorrect = option === currentItem.correct;
    const duration = Math.round((Date.now() - questionStartRef.current) / 1000);

    setSelectedAnswer(option);
    const message = isCorrect ? 'Chinh xac!' : `Chua dung. Dap an: ${currentItem.correct}`;
    setFeedback(message);
    speakFeedback(message);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    await logProgress({
      isCorrect,
      questionId: currentItem.id,
      duration,
    });

    setTimeout(() => {
      goNextItem();
    }, 900);
  };

  const handleMatchClick = async (id) => {
    if (matchingBusy || matchedIdsRef.current.includes(id)) return;

    if (firstPickRef.current === id) return;

    if (firstPickRef.current === null) {
      firstPickRef.current = id;
      setFlipped([id]);
      return;
    }

    const firstId = firstPickRef.current;
    const secondId = id;
    firstPickRef.current = null;

    if (matchingTimeoutRef.current) {
      clearTimeout(matchingTimeoutRef.current);
      matchingTimeoutRef.current = null;
    }

    setFlipped([firstId, secondId]);
    setMatchingBusy(true);

    const first = itemsRef.current.find((x) => x.id === firstId);
    const second = itemsRef.current.find((x) => x.id === secondId);

    attemptsRef.current += 1;
    setMatchingAttempts(attemptsRef.current);

    const isMatch = Boolean(first?.pair_key && second?.pair_key && first.pair_key === second.pair_key);

    if (isMatch) {
      const newMatched = [...matchedIdsRef.current, firstId, secondId];
      matchedIdsRef.current = newMatched;
      setMatchedIds(newMatched);
      setFlipped([]);

      correctPairsRef.current += 1;
      setMatchingCorrectPairs(correctPairsRef.current);
      setMatchingBusy(false);

      if (newMatched.length >= itemsRef.current.length && itemsRef.current.length > 0) {
        await logProgress({
          isCorrect: true,
          totalAttempts: attemptsRef.current,
          correctCount: correctPairsRef.current,
        });
        setScore(correctPairsRef.current);
        matchingTimeoutRef.current = setTimeout(() => finishLesson(), 500);
      }
      return;
    }

    matchingTimeoutRef.current = setTimeout(() => {
      setFlipped([]);
      setMatchingBusy(false);
      matchingTimeoutRef.current = null;
    }, 700);
  };

  const startChallengeCamera = async () => {
    if (challengeActive) return;
    setError('');

    try {
      await loadModels();
      await startCamera(cameraRef.current);

      await new Promise((resolve) => {
        const video = cameraRef.current;
        if (!video) return resolve();
        if (video.readyState >= 2) return resolve();
        video.onloadeddata = () => resolve();
      });

      startDetection(cameraRef.current, 750);
      setChallengeActive(true);
      resetChallengeState();
    } catch (err) {
      setError(err?.message || 'Khong bat duoc camera.');
      stopDetection();
      stopCamera();
      setChallengeActive(false);
    }
  };

  const stopChallengeCamera = () => {
    stopDetection();
    stopCamera();
    setChallengeActive(false);
    resetChallengeState();
  };

  const captureAndAnalyze = async () => {
    if (!cameraRef.current || analyzing || !currentItem) return;

    const video = cameraRef.current;

    // Kiểm tra video đã sẵn sàng (tránh gửi canvas trắng lên Gemini)
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      setError('Camera chưa sẵn sàng. Vui lòng chờ một chút rồi thử lại.');
      return;
    }

    stopDetection();
    setError('');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      startDetection(cameraRef.current, 750);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Dùng JPEG thay PNG để giảm kích thước payload gửi lên Gemini
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageBase64);
    setAnalyzing(true);

    const scheduleAutoAdvance = (delay) => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = setTimeout(() => {
        autoAdvanceRef.current = null;
        if (index < items.length - 1) {
          setIndex((prev) => prev + 1);
          resetChallengeState();
          questionStartRef.current = Date.now();
          if (cameraRef.current && challengeActive) {
            startDetection(cameraRef.current, 750);
          }
        } else {
          finishLesson();
        }
      }, delay);
    };

    const applyCameraResult = async (resultPayload) => {
      const normalized = {
        isMatch: Boolean(resultPayload?.isMatch),
        confidence: Number(resultPayload?.confidence ?? 0),
        emoji: resultPayload?.emoji || (resultPayload?.isMatch ? '😊' : '🤔'),
        message: resultPayload?.message || (resultPayload?.isMatch ? 'Xuất sắc!' : 'Thử lại nhé!'),
        tip: resultPayload?.tip || '',
      };

      setAnalysis(normalized);
      speakFeedback(normalized.message);

      await logProgress({
        isCorrect: normalized.isMatch,
        questionId: currentItem.id || 0,
        duration: Math.round((Date.now() - questionStartRef.current) / 1000),
      });

      if (normalized.isMatch) {
        setScore((prev) => prev + 1);
        scheduleAutoAdvance(1200);
      }
    };

    try {
      const { data } = await client.post('/api/gemini/analyze', {
        imageBase64,
        targetEmotion,
      });

      await applyCameraResult(data);
    } catch (err) {
      const errorCode = err?.response?.data?.errorCode;
      const isConfigError =
        errorCode === 'GEMINI_KEY_MISSING' ||
        errorCode === 'GEMINI_KEY_INVALID' ||
        errorCode === 'GEMINI_KEY_LEAKED' ||
        errorCode === 'GEMINI_PROJECT_DENIED' ||
        errorCode === 'OPENROUTER_KEY_MISSING' ||
        errorCode === 'OPENROUTER_KEY_INVALID' ||
        errorCode === 'AI_PROVIDER_ALL_FAILED';

      if (isConfigError) {
        // Fallback: chấm điểm bằng face-api.js local
        const localPassed = localMatchScore >= 60;
        await applyCameraResult({
          isMatch: localPassed,
          confidence: localMatchScore,
          emoji: localPassed ? '😊' : '🤔',
          message: localPassed
            ? 'AI cloud đang bận, hệ thống chấm nội bộ: Con đạt yêu cầu!'
            : 'AI cloud đang bận, hệ thống chấm nội bộ: Chưa đạt, thử lại nhé!',
          tip: 'Kiểm tra cấu hình GEMINI_API_KEY trong backend để bật AI cloud.',
        });
      } else {
        const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
        const fail = {
          isMatch: false,
          confidence: 0,
          emoji: '⚠️',
          message: isTimeout
            ? 'AI mất quá nhiều thời gian để phân tích. Con thử chụp lại nhé!'
            : (err?.response?.data?.message || 'Không kết nối được AI, vui lòng thử lại.'),
          tip: isTimeout
            ? 'Đảm bảo mặt con rõ ràng trong khung hình và ánh sáng đủ tốt.'
            : (err?.response?.data?.tip || 'Kiểm tra kết nối mạng rồi chụp lại.'),
        };
        setAnalysis(fail);
        speakFeedback(fail.message);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const retryCameraChallenge = () => {
    resetChallengeState();
    if (cameraRef.current && challengeActive) {
      startDetection(cameraRef.current, 750);
    }
  };

  const renderQuiz = () => {
    if (!currentItem) return <p>Không có câu hỏi.</p>;

    return (
      <Card>
        <h2 style={{ fontSize: 30 }}>
          {lessonMeta[lessonType]?.icon} {titleOf(lessonType)}
        </h2>
        <p style={{ color: '#4f758a', marginTop: 4 }}>
          Câu {index + 1}/{items.length}
        </p>

        {currentItem.image ? (
          <div style={{ marginTop: 10 }}>
            <img
              src={currentItem.image}
              alt="lesson"
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 14,
                border: '2px solid #d7e7f2',
              }}
            />
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 24 }}>{currentItem.story || currentItem.question || currentItem.instruction}</h3>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {currentItem.options?.map((option) => {
            const isPicked = selectedAnswer === option;
            const isCorrect = option === currentItem.correct;

            return (
              <button
                key={option}
                onClick={() => handleQuizAnswer(option)}
                disabled={Boolean(selectedAnswer)}
                style={{
                  borderRadius: 14,
                  border: '1px solid #cde2ee',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: selectedAnswer ? (isCorrect ? '#e6fbef' : isPicked ? '#ffe9e4' : '#fff') : '#fff',
                  color: '#2e5e76',
                  fontWeight: 800,
                  cursor: selectedAnswer ? 'default' : 'pointer',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {feedback ? (
          <p style={{ marginTop: 10, color: feedback.startsWith('Chính') ? '#2f8b53' : '#bc4a36', fontWeight: 800 }}>
            {feedback}
          </p>
        ) : null}
      </Card>
    );
  };

  const renderMatching = () => {
    return (
      <Card>
        <h2 style={{ fontSize: 30 }}>🧩 Ghép cặp cùng cảm xúc</h2>
        <p style={{ color: '#4f758a', marginTop: 4 }}>
          Lần thử: {matchingAttempts} | Cặp đúng: {matchingCorrectPairs}
        </p>

        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
            gap: 10,
          }}
        >
          {items.map((card) => {
            const opened = flipped.includes(card.id) || matchedIds.includes(card.id);
            const matched = matchedIds.includes(card.id);
            return (
              <button
                key={card.id}
                onClick={() => handleMatchClick(card.id)}
                disabled={matched || matchingBusy}
                style={{
                  borderRadius: 16,
                  border: matched ? '2px solid #58c27d' : '1px solid #cde2ee',
                  minHeight: 145,
                  padding: 8,
                  background: opened ? '#fff' : 'linear-gradient(120deg,#e8f9ff,#e8ffe8)',
                  cursor: matched ? 'default' : 'pointer',
                }}
              >
                {opened ? (
                  <div>
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={card.emotion}
                        style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10 }}
                      />
                    ) : null}
                    <div style={{ marginTop: 8, fontWeight: 900, color: '#2e5e76' }}>{card.emotion}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 30, color: '#4f758a' }}>?</div>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderCameraChallenge = () => {
    if (!currentItem) return <p>Không có dữ liệu bài học.</p>;

    return (
      <div style={{ display: 'grid', gap: 14 }}>

        {/* ── Header: hướng dẫn bài học ───────────────────────────────────────── */}
        <Card style={{ background: 'linear-gradient(120deg,#f0f9ff,#fff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>

            {/* Ảnh hướng dẫn */}
            {currentItem.guideImage ? (
              <img
                src={currentItem.guideImage}
                alt={`Hướng dẫn biểu cảm ${targetEmotion}`}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'cover',
                  borderRadius: 16,
                  border: '3px solid #bae6fd',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 120, height: 120, borderRadius: 16, background: '#e0f2fe',
                display: 'grid', placeItems: 'center', fontSize: 52,
              }}>
                🎭
              </div>
            )}

            <div>
              <p className="pill" style={{ background: '#dbeafe', color: '#1d4ed8', marginBottom: 6 }}>
                Bài {index + 1} / {items.length}
              </p>
              <h2 style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)', color: '#0f3460' }}>
                Hãy thể hiện: <span style={{ color: '#0284c7' }}>"{targetEmotion}"</span>
              </h2>
              <p style={{ color: '#4f758a', marginTop: 6, fontSize: 15 }}>
                {currentItem.instruction || `Nhìn vào ảnh mẫu và cố gắng bắt chước biểu cảm "${targetEmotion}" nhé!`}
              </p>
              {currentItem.tips ? (
                <p style={{ marginTop: 6, color: '#0369a1', fontWeight: 700, fontSize: 14 }}>
                  💡 Gợi ý: {currentItem.tips}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* ── Main: Camera + Panel ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1.4fr 1fr' }}>

          {/* Camera */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CameraView
              videoRef={cameraRef}
              title="📷 Camera của con"
              subtitle={challengeActive ? `Đang nhận diện: ${getEmotionLabel(dominantEmotion)} (${localMatchScore}% khớp)` : 'Bật camera để bắt đầu'}
              isActive={challengeActive}
              onStart={startChallengeCamera}
              onStop={stopChallengeCamera}
              onCapture={captureAndAnalyze}
              captureDisabled={analyzing || !isModelLoaded}
            >
              {/* Badge realtime emotion */}
              {challengeActive && !capturedImage ? (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: localMatchScore >= 65
                      ? 'rgba(34,197,94,.92)'
                      : 'rgba(255,255,255,.92)',
                    color: localMatchScore >= 65 ? '#fff' : '#2b5e75',
                    borderRadius: 999,
                    padding: '6px 16px',
                    fontWeight: 900,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                  }}
                >
                  {localMatchScore >= 65 ? '✅ ' : ''}{getEmotionLabel(dominantEmotion)} — {localMatchScore}% khớp
                </div>
              ) : null}
            </CameraView>

            {/* Thanh cảm xúc realtime */}
            {challengeActive ? <EmotionBars emotions={emotions} dominantEmotion={dominantEmotion} /> : null}
          </div>

          {/* Panel bên phải: ảnh chụp + kết quả AI */}
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>

            {/* Ảnh vừa chụp */}
            {capturedImage ? (
              <Card>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>📸 Ảnh vừa chụp</h3>
                <img
                  src={capturedImage}
                  alt="Ảnh biểu cảm vừa chụp"
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #e0f2fe' }}
                />
              </Card>
            ) : null}

            {/* Đang phân tích */}
            {analyzing ? (
              <Card style={{ background: '#f0f9ff' }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 42, marginBottom: 10, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>🧠</div>
                  <p style={{ color: '#0369a1', fontWeight: 800, fontSize: 16 }}>Gemini AI đang phân tích...</p>
                  <p style={{ color: '#7cb9d4', fontSize: 13, marginTop: 4 }}>Đánh giá biểu cảm của con, chờ xíu nhé!</p>
                </div>
              </Card>
            ) : null}

            {/* Kết quả AI */}
            {analysis && !analyzing ? (
              <Card style={{
                background: analysis.isMatch
                  ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)'
                  : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                border: `2px solid ${analysis.isMatch ? '#6ee7b7' : '#fcd34d'}`,
              }}>
                {/* Header kết quả */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 38 }}>{analysis.emoji}</span>
                  <div>
                    <h3 style={{ fontSize: 20, color: analysis.isMatch ? '#065f46' : '#92400e' }}>
                      {analysis.isMatch ? '🎉 Xuất sắc!' : '💪 Gần đúng rồi!'}
                    </h3>
                    <p style={{ color: analysis.isMatch ? '#047857' : '#b45309', fontSize: 13, fontWeight: 700 }}>
                      {analysis.isMatch ? 'Con biểu đạt rất tốt!' : 'Thêm một chút nữa là được!'}
                    </p>
                  </div>
                </div>

                {/* Nhận xét của AI */}
                <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, marginBottom: 10 }}>
                  {analysis.message}
                </p>

                {/* Thanh confidence */}
                {typeof analysis.confidence === 'number' ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#4f758a', fontWeight: 700 }}>Mức độ khớp với "{targetEmotion}"</span>
                      <span style={{ fontWeight: 900, color: analysis.confidence >= 65 ? '#059669' : '#d97706' }}>
                        {analysis.confidence}%
                      </span>
                    </div>
                    <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${analysis.confidence}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: analysis.confidence >= 65
                            ? 'linear-gradient(90deg,#34d399,#10b981)'
                            : 'linear-gradient(90deg,#fbbf24,#f59e0b)',
                          transition: 'width .5s ease',
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Gợi ý cải thiện */}
                {analysis.tip ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    marginBottom: 10,
                    border: '1px solid rgba(0,0,0,.06)',
                  }}>
                    <p style={{ color: '#1e40af', fontWeight: 700, fontSize: 14 }}>
                      💡 {analysis.tip}
                    </p>
                  </div>
                ) : null}

                {/* Nút thử lại */}
                {!analysis.isMatch ? (
                  <Button variant="ghost" onClick={retryCameraChallenge}>
                    🔄 Thử lại
                  </Button>
                ) : (
                  <p style={{ color: '#059669', fontWeight: 700, fontSize: 13 }}>
                    ⏳ Đang chuyển sang bài tiếp theo...
                  </p>
                )}
              </Card>
            ) : null}

            {/* Hướng dẫn khi chưa bật camera */}
            {!challengeActive && !capturedImage && !analysis ? (
              <Card style={{ background: '#f8fafc' }}>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: '#334155' }}>📋 Cách chơi</h3>
                <ol style={{ color: '#4f758a', fontSize: 14, lineHeight: 2, paddingLeft: 18 }}>
                  <li>Bật camera và nhìn vào màn hình</li>
                  <li>Bắt chước biểu cảm <strong>"{targetEmotion}"</strong> trong ảnh mẫu</li>
                  <li>Khi đã sẵn sàng, bấm <strong>Chụp và phân tích</strong></li>
                  <li>Gemini AI sẽ nhận xét và hướng dẫn con!</li>
                </ol>
              </Card>
            ) : null}
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @media (max-width: 960px) {
            .emotion-training-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  };


  return (
    <div className="page-shell" style={{ display: 'grid', gap: 14 }}>
      <Card style={{ background: 'linear-gradient(130deg,#fff,#f2fdff)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)' }}>
              Level {levelId} - {titleOf(lessonType)}
            </h1>
            <p style={{ color: '#4f758a', marginTop: 6 }}>Tiến độ: {progress}%</p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant={isTtsEnabled ? 'primary' : 'ghost'} onClick={toggleTts}>
              {isTtsEnabled ? (isSpeaking ? 'TTS đang phát' : 'TTS bật') : 'TTS tắt'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/app')}>
              Về dashboard
            </Button>
          </div>
        </div>

        <div style={{ height: 10, background: '#edf4f8', borderRadius: 999, marginTop: 10 }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 999,
              background: 'linear-gradient(120deg,#17a2a2,#4d90fe)',
              transition: 'width .3s ease',
            }}
          />
        </div>
      </Card>

      {loading ? <p style={{ color: '#4f758a' }}>Đang tải bài học...</p> : null}
      {error ? (
        <p style={{ color: '#bc4a36', fontWeight: 800, background: '#ffe8e3', borderRadius: 12, padding: '8px 10px' }}>{error}</p>
      ) : null}

      {!loading && !error && !completed ? (
        <>
          {(lessonType === 'flashcard' || lessonType === 'context') && renderQuiz()}
          {lessonType === 'matching' && renderMatching()}
          {isCameraLesson && renderCameraChallenge()}
          {!items.length ? <p style={{ color: '#4f758a' }}>Chưa có dữ liệu bài học cho level này.</p> : null}
        </>
      ) : null}

      {completed ? (
        <Card style={{ textAlign: 'center', background: 'linear-gradient(130deg,#fffef1,#fff)' }}>
          <h2 style={{ fontSize: 36 }}>🏆 Hoàn thành bài học!</h2>
          <p style={{ color: '#4f758a', marginTop: 8 }}>Điểm của con: {score}</p>
          <div style={{ marginTop: 10, fontSize: 30 }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <span key={idx} style={{ opacity: idx < starCount ? 1 : 0.28 }}>
                ⭐
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            <Button variant="primary" onClick={() => navigate('/app')}>
              Về lộ trình
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Học lại
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
