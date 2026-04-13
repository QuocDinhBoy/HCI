import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client from '../api/client';
import CameraView from '../components/emotion/CameraView';
import EmotionBars from '../components/emotion/EmotionBars';
import MusicPlayer from '../components/emotion/MusicPlayer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useEmotionMusic } from '../hooks/useEmotionMusic';
import { getEmotionLabel, getRandomSuggestion } from '../utils/emotionHelpers';

const PRACTICE_SECONDS = 10;
const PRACTICE_TARGETS = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted'];

function pickNextTarget(current = '') {
  const pool = PRACTICE_TARGETS.filter((item) => item !== current);
  const list = pool.length ? pool : PRACTICE_TARGETS;
  return list[Math.floor(Math.random() * list.length)];
}

function average(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / values.length);
}

export default function EmotionDetectorPage({ practiceMode = false }) {
  const videoRef = useRef(null);
  const collectTimerRef = useRef(null);
  const flushTimerRef = useRef(null);
  const practiceTimerRef = useRef(null);
  const snapshotsRef = useRef([]);
  const roundSamplesRef = useRef([]);
  const latestEmotionRef = useRef({ dominant: 'neutral', emotions: {} });
  const targetEmotionRef = useRef('happy');
  const sessionIdRef = useRef(null);
  const closingRef = useRef(false);

  const {
    isModelLoaded,
    emotions,
    dominantEmotion,
    confidence,
    faceDetected,
    loadModels,
    startDetection,
    stopDetection,
    startCamera,
    stopCamera,
  } = useFaceDetection();

  const {
    isPlaying: musicPlaying,
    currentEmotion: musicEmotion,
    volume: musicVolume,
    isMuted: musicMuted,
    isEnabled: musicEnabled,
    trackError: musicError,
    onEmotionChange: onMusicEmotionChange,
    pausePlayback: pauseMusic,
    resumePlayback: resumeMusic,
    stopMusic,
    setVolume: setMusicVolume,
    toggleMute: toggleMusicMute,
    toggleEnabled: toggleMusicEnabled,
  } = useEmotionMusic();

  const [cameraActive, setCameraActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [targetEmotion, setTargetEmotion] = useState('happy');
  const [practiceSecondsLeft, setPracticeSecondsLeft] = useState(PRACTICE_SECONDS);
  const [practiceRounds, setPracticeRounds] = useState(0);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceBest, setPracticeBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastRoundAvg, setLastRoundAvg] = useState(null);
  const [lastRoundPassed, setLastRoundPassed] = useState(null);

  useEffect(() => {
    latestEmotionRef.current = { dominant: dominantEmotion, emotions };
  }, [dominantEmotion, emotions]);

  // Cập nhật nhạc theo cảm xúc realtime (chỉ khi KHÔNG ở practice mode)
  useEffect(() => {
    if (!practiceMode && cameraActive && dominantEmotion) {
      onMusicEmotionChange(dominantEmotion);
    }
  }, [dominantEmotion, practiceMode, cameraActive, onMusicEmotionChange]);

  useEffect(() => {
    targetEmotionRef.current = targetEmotion;
  }, [targetEmotion]);

  const suggestion = useMemo(() => getRandomSuggestion(dominantEmotion), [dominantEmotion]);
  const targetMatchScore = useMemo(() => {
    return Math.max(0, Math.min(100, Number(emotions[targetEmotion] || 0)));
  }, [emotions, targetEmotion]);

  const flushSnapshots = useCallback(async (forceSessionId) => {
    const targetSessionId = forceSessionId || sessionIdRef.current;
    if (!targetSessionId || snapshotsRef.current.length === 0) return;

    const payload = snapshotsRef.current.splice(0, snapshotsRef.current.length);
    try {
      await client.post(`/api/emotion-sessions/${targetSessionId}/snapshots`, {
        snapshots: payload,
      });
    } catch {
      snapshotsRef.current = [...payload, ...snapshotsRef.current].slice(-80);
    }
  }, []);

  const clearTelemetryIntervals = useCallback(() => {
    if (collectTimerRef.current) {
      clearInterval(collectTimerRef.current);
      collectTimerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const clearPracticeInterval = useCallback(() => {
    if (practiceTimerRef.current) {
      clearInterval(practiceTimerRef.current);
      practiceTimerRef.current = null;
    }
  }, []);

  const rotatePracticeTarget = useCallback(() => {
    const next = pickNextTarget(targetEmotionRef.current);
    targetEmotionRef.current = next;
    setTargetEmotion(next);
  }, []);

  const finishPracticeRound = useCallback(() => {
    const avg = average(roundSamplesRef.current);
    const passed = avg >= 60;

    setLastRoundAvg(avg);
    setLastRoundPassed(passed);
    setPracticeRounds((prev) => prev + 1);
    setPracticeBest((prev) => Math.max(prev, avg));

    setCombo((prevCombo) => {
      const nextCombo = passed ? prevCombo + 1 : 0;
      setPracticeScore((prevScore) => prevScore + (passed ? avg + nextCombo * 5 : Math.round(avg * 0.4)));
      return nextCombo;
    });

    roundSamplesRef.current = [];
    rotatePracticeTarget();
    setPracticeSecondsLeft(PRACTICE_SECONDS);
  }, [rotatePracticeTarget]);

  const startPracticeLoop = useCallback(() => {
    clearPracticeInterval();
    roundSamplesRef.current = [];
    setPracticeSecondsLeft(PRACTICE_SECONDS);

    practiceTimerRef.current = setInterval(() => {
      const target = targetEmotionRef.current;
      const liveValue = Number(latestEmotionRef.current.emotions?.[target] || 0);
      roundSamplesRef.current.push(Math.max(0, Math.min(100, liveValue)));

      setPracticeSecondsLeft((prev) => {
        if (prev <= 1) {
          finishPracticeRound();
          return PRACTICE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearPracticeInterval, finishPracticeRound]);

  const resetPracticeStats = useCallback(() => {
    setPracticeRounds(0);
    setPracticeScore(0);
    setPracticeBest(0);
    setCombo(0);
    setLastRoundAvg(null);
    setLastRoundPassed(null);
    setPracticeSecondsLeft(PRACTICE_SECONDS);
  }, []);

  const startFlow = async () => {
    if (cameraActive || busy) return;
    setError('');
    setBusy(true);
    setSessionSummary(null);
    closingRef.current = false;
    roundSamplesRef.current = [];

    try {
      await loadModels();
      await startCamera(videoRef.current);

      await new Promise((resolve) => {
        const video = videoRef.current;
        if (!video) return resolve();
        if (video.readyState >= 2) return resolve();
        video.onloadeddata = () => resolve();
      });

      startDetection(videoRef.current, practiceMode ? 500 : 350);

      const sessionType = practiceMode ? 'PRACTICE' : 'REALTIME';
      const { data } = await client.post('/api/emotion-sessions', { sessionType });
      const sid = data?.sessionId;
  sessionIdRef.current = sid || null;
      setSessionId(sid);

      collectTimerRef.current = setInterval(() => {
        const payload = latestEmotionRef.current;
        if (!payload || !payload.emotions) return;

        snapshotsRef.current.push({
          dominant: payload.dominant,
          neutral: payload.emotions.neutral || 0,
          happy: payload.emotions.happy || 0,
          sad: payload.emotions.sad || 0,
          angry: payload.emotions.angry || 0,
          fearful: payload.emotions.fearful || 0,
          disgusted: payload.emotions.disgusted || 0,
          surprised: payload.emotions.surprised || 0,
        });

        if (snapshotsRef.current.length > 80) {
          snapshotsRef.current.shift();
        }
      }, 2000);

      flushTimerRef.current = setInterval(() => {
        void flushSnapshots(sid);
      }, 10000);

      if (practiceMode) {
        resetPracticeStats();
        const firstTarget = pickNextTarget('');
        targetEmotionRef.current = firstTarget;
        setTargetEmotion(firstTarget);
        startPracticeLoop();
      }

      setCameraActive(true);
    } catch (err) {
      setError(err?.message || 'Khong the bat camera hoac tao session.');
      stopDetection();
      stopCamera();
      clearTelemetryIntervals();
      clearPracticeInterval();
      sessionIdRef.current = null;
      setSessionId(null);
    } finally {
      setBusy(false);
    }
  };

  const stopFlow = useCallback(
    async ({ endSession = true } = {}) => {
      if (closingRef.current) return;
      closingRef.current = true;

      clearTelemetryIntervals();
      clearPracticeInterval();
      roundSamplesRef.current = [];
      stopDetection();
      stopMusic();
      stopCamera();
      setCameraActive(false);

      const sid = sessionIdRef.current;

      if (endSession && sid) {
        await flushSnapshots(sid);
        try {
          const { data } = await client.put(`/api/emotion-sessions/${sid}/end`);
          setSessionSummary(data || null);
        } catch {
          setSessionSummary(null);
        }
      }

      sessionIdRef.current = null;
      setSessionId(null);
    },
    [clearPracticeInterval, clearTelemetryIntervals, flushSnapshots, stopCamera, stopDetection, stopMusic]
  );

  useEffect(() => {
    return () => {
      void stopFlow({ endSession: true });
    };
  }, [stopFlow]);

  const skipPracticeTarget = () => {
    if (!practiceMode || !cameraActive) return;
    roundSamplesRef.current = [];
    setLastRoundAvg(null);
    setLastRoundPassed(null);
    setPracticeSecondsLeft(PRACTICE_SECONDS);
    rotatePracticeTarget();
  };

  return (
    <div className="page-shell" style={{ display: 'grid', gap: 14 }}>
      <Card style={{ background: 'linear-gradient(130deg,#fff,#f2fdff)' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.7rem)' }}>
          {practiceMode ? 'Luyện biểu cảm' : 'Nhận diện cảm xúc realtime'}
        </h1>
        <p style={{ color: '#4f758a', marginTop: 6 }}>
          {practiceMode
            ? 'Chế độ nhanh: mỗi 10 giây đổi một cảm xúc mục tiêu, camera chấm theo thời gian thực.'
            : 'Camera xử lý ngay trên trình duyệt, hệ thống lưu snapshots và thống kê độ hiệu quả.'}
        </p>
      </Card>

      {error ? (
        <p style={{ color: '#bc4a36', fontWeight: 800, background: '#ffe8e3', borderRadius: 12, padding: '8px 10px' }}>{error}</p>
      ) : null}

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1.2fr .8fr' }}>
        <CameraView
          videoRef={videoRef}
          title={practiceMode ? 'Tập biểu cảm với camera' : 'Camera detector'}
          subtitle={
            isModelLoaded ? 'Mở camera và theo dõi cảm xúc theo thời gian thực.' : 'Đang nạp models face-api...'
          }
          isActive={cameraActive}
          onStart={startFlow}
          onStop={() => stopFlow({ endSession: true })}
        >
          {cameraActive ? (
            <>
              {practiceMode ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: 10,
                      background: 'rgba(255,255,255,.94)',
                      borderRadius: 12,
                      padding: '7px 10px',
                      fontWeight: 900,
                      color: '#2b5e75',
                    }}
                  >
                    Mục tiêu: {getEmotionLabel(targetEmotion)}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      background: 'rgba(23,162,162,.92)',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontWeight: 900,
                      color: '#fff',
                    }}
                  >
                    {practiceSecondsLeft}s
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 10,
                      background: 'rgba(255,255,255,.92)',
                      borderRadius: 999,
                      padding: '6px 10px',
                      fontWeight: 900,
                      color: '#2b5e75',
                    }}
                  >
                    Match: {targetMatchScore}%
                  </div>
                </>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    background: 'rgba(255,255,255,.92)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontWeight: 800,
                    color: '#2b5e75',
                  }}
                >
                  {faceDetected ? `${getEmotionLabel(dominantEmotion)} ${confidence}%` : 'Chưa thấy khuôn mặt'}
                </div>
              )}
            </>
          ) : null}
        </CameraView>

        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <EmotionBars emotions={emotions} dominantEmotion={dominantEmotion} />

          {/* Music Player - chỉ hiển thị ở realtime mode */}
          {!practiceMode && (
            <MusicPlayer
              isPlaying={musicPlaying}
              currentEmotion={musicEmotion}
              volume={musicVolume}
              isMuted={musicMuted}
              isEnabled={musicEnabled}
              trackError={musicError}
              onToggleMute={toggleMusicMute}
              onToggleEnabled={toggleMusicEnabled}
              onVolumeChange={setMusicVolume}
              onPause={pauseMusic}
              onResume={resumeMusic}
            />
          )}

          {practiceMode ? (
            <>
              <Card style={{ background: 'linear-gradient(130deg,#fff4e7,#fff)' }}>
                <h3 style={{ fontSize: 22 }}>Luyện biểu cảm nhanh</h3>
                <p style={{ marginTop: 6, color: '#4f758a', lineHeight: 1.5 }}>
                  Cứ mỗi 10 giây hệ thống đổi mục tiêu. Con hãy bắt chước thật nhanh để tăng điểm.
                </p>

                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  <div className="pill" style={{ background: '#e8f3ff', color: '#2d6ec5' }}>
                    Mục tiêu hiện tại: {getEmotionLabel(targetEmotion)}
                  </div>
                  <div style={{ height: 8, background: '#edf4f8', borderRadius: 999 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${((PRACTICE_SECONDS - practiceSecondsLeft) / PRACTICE_SECONDS) * 100}%`,
                        borderRadius: 999,
                        background: 'linear-gradient(120deg,#ff7f6a,#f9b233)',
                        transition: 'width .35s ease',
                      }}
                    />
                  </div>
                  <p style={{ color: '#2e5e76', fontWeight: 800 }}>Còn lại: {practiceSecondsLeft}s</p>
                </div>

                <div style={{ marginTop: 10 }}>
                  <Button variant="warm" onClick={skipPracticeTarget} disabled={!cameraActive}>
                    Đổi cảm xúc ngay
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 style={{ fontSize: 22 }}>Bảng điểm nhanh</h3>
                <p style={{ color: '#4f758a', marginTop: 6 }}>Vòng đã chơi: {practiceRounds}</p>
                <p style={{ color: '#4f758a', marginTop: 4 }}>Tổng điểm: {practiceScore}</p>
                <p style={{ color: '#4f758a', marginTop: 4 }}>Combo liên tiếp: x{combo}</p>
                <p style={{ color: '#4f758a', marginTop: 4 }}>Vòng tốt nhất: {practiceBest}%</p>

                {lastRoundAvg !== null ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontWeight: 900,
                      color: lastRoundPassed ? '#2f8b53' : '#bc4a36',
                      background: lastRoundPassed ? '#e6fbef' : '#ffe9e4',
                      borderRadius: 10,
                      padding: '6px 10px',
                    }}
                  >
                    Vòng trước: {lastRoundAvg}% {lastRoundPassed ? '— Đạt yêu cầu' : '— Thử thêm nhé'}
                  </div>
                ) : null}
              </Card>
            </>
          ) : (
            <>
              <Card style={{ background: 'linear-gradient(130deg,#fff4e7,#fff)' }}>
                <h3 style={{ fontSize: 22 }}>Gợi ý hiện tại</h3>
                <p style={{ marginTop: 6, color: '#4f758a', lineHeight: 1.5 }}>{suggestion}</p>
              </Card>

              <Card>
                <h3 style={{ fontSize: 22 }}>Phiên theo dõi</h3>
                <p style={{ color: '#4f758a', marginTop: 6 }}>Trạng thái: {cameraActive ? 'Đang ghi nhận' : 'Đã dừng'}</p>
                <p style={{ color: '#4f758a', marginTop: 4 }}>ID: {sessionId || '--'}</p>
                {sessionSummary ? (
                  <div style={{ marginTop: 8, fontWeight: 800, color: '#2f8b53' }}>
                    Tổng kết: {getEmotionLabel(sessionSummary.dominantEmotion)} - {sessionSummary.avgConfidence}%
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .page-shell > div:nth-of-type(3) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
