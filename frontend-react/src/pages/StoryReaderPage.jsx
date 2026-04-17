/* ─── StoryReaderPage — Visual Novel Reader ──────────────────
   Thiết kế dành cho trẻ tự kỷ: to rõ, màu sắc, có TTS,
   phân nhánh thực với "consequence" rõ ràng
────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/ui/Button';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

/* ── Emotion → màu ─────────────────────────────────────────── */
const MOOD_STYLE = {
  'vui':             { border: '#FCD34D', bg: '#FFF8D6', text: '#B45309' },
  'buồn':            { border: '#93C5FD', bg: '#DAEEFF', text: '#1D4ED8' },
  'tức giận':        { border: '#FCA5A5', bg: '#FFE8E0', text: '#B91C1C' },
  'mất kiểm soát':   { border: '#FCA5A5', bg: '#FFD6D6', text: '#991B1B' },
  'sợ hãi':          { border: '#C4B5FD', bg: '#EDE8FF', text: '#7C3AED' },
  'hồi hộp':         { border: '#FDE68A', bg: '#FFFBEB', text: '#92400E' },
  'lo lắng':         { border: '#FCA5A5', bg: '#FFF0EC', text: '#B91C1C' },
  'nhẹ nhõm':        { border: '#6EE7B7', bg: '#D8F5E8', text: '#065F46' },
  'bình tĩnh dần':   { border: '#6EE7B7', bg: '#D8F5E8', text: '#065F46' },
  'dũng cảm':        { border: '#6EE7B7', bg: '#D8F5E8', text: '#065F46' },
  'ấm áp':           { border: '#6EE7B7', bg: '#D8F5E8', text: '#065F46' },
  'nhẹ nhàng':       { border: '#93C5FD', bg: '#EBF8FF', text: '#1D4ED8' },
  'tự hào':          { border: '#FCD34D', bg: '#FFF8D6', text: '#B45309' },
  'hối hận':         { border: '#FCA5A5', bg: '#FFE8E0', text: '#B91C1C' },
};

const ENDING_META = {
  good:     { emoji: '🌟', label: 'Kết thúc tốt!',       bg: '#D8F5E8', border: '#6EE7B7', text: '#065F46' },
  neutral:  { emoji: '😊', label: 'Kết thúc ổn!',         bg: '#DAEEFF', border: '#93C5FD', text: '#1D4ED8' },
  learning: { emoji: '💡', label: 'Bài học quan trọng!',  bg: '#FFF8D6', border: '#FCD34D', text: '#B45309' },
};

const PAGE_TYPE_ICON = {
  narration:   '📖',
  dialogue:    '💬',
  consequence: '⚡',
  choice:      '🤔',
  ending:      '🏁',
};

/* ── Component chính ───────────────────────────────────────── */
export default function StoryReaderPage() {
  const { storyId } = useParams();
  const navigate    = useNavigate();

  const tts = useTextToSpeech?.();
  const speak    = tts?.speak;
  const stopTts  = tts?.stop;
  const isSpeaking = tts?.isSpeaking;

  const [story,         setStory]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [curOrder,      setCurOrder]      = useState(1);
  const [history,       setHistory]       = useState([]);      // stack of page_orders
  const [transitioning, setTransitioning] = useState(false);
  const [choiceFlash,   setChoiceFlash]   = useState(null);    // { emoji, label } shown after choice
  const [showFlash,     setShowFlash]     = useState(false);

  const pageRef = useRef(null);

  /* ── Load data ─────────────────────────────────────────── */
  useEffect(() => {
    client.get(`/api/stories/${storyId}`)
      .then(({ data }) => { setStory(data); setLoading(false); })
      .catch((err)     => { setError(err?.response?.data?.message || 'Không tải được truyện'); setLoading(false); });
    return () => stopTts?.();
  }, [storyId]);

  /* ── Derived state ─────────────────────────────────────── */
  const pageMap = {};
  story?.pages?.forEach((p) => { pageMap[p.pageOrder] = p; });

  const currentPage  = pageMap[curOrder] || null;
  const totalPages   = story?.pages?.length || 0;
  const visitedCount = history.length + 1;

  /* ── Navigate ──────────────────────────────────────────── */
  const goTo = useCallback((nextOrder, flash = null) => {
    if (transitioning) return;
    stopTts?.();

    if (flash) {
      setChoiceFlash(flash);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 1200);
    }

    setTransitioning(true);
    setTimeout(() => {
      setHistory((h) => [...h, curOrder]);
      setCurOrder(nextOrder);
      setTransitioning(false);
      pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, flash ? 900 : 220);
  }, [transitioning, curOrder, stopTts]);

  /* Nút "Tiếp theo" cho trang không phải choice */
  const handleNext = useCallback(() => {
    if (!currentPage || transitioning) return;
    const nextOrder = currentPage.nextPageOrder;
    if (nextOrder) {
      goTo(nextOrder);
    } else {
      // Tìm trang kế tiếp theo thứ tự trong mảng
      const pages = story?.pages || [];
      const idx   = pages.findIndex((p) => p.pageOrder === curOrder);
      if (idx < pages.length - 1) goTo(pages[idx + 1].pageOrder);
    }
  }, [currentPage, transitioning, goTo, story, curOrder]);

  /* Nút "Quay lại" */
  const handleBack = useCallback(() => {
    if (history.length === 0 || transitioning) return;
    stopTts?.();
    setTransitioning(true);
    setTimeout(() => {
      const prev = [...history];
      const last = prev.pop();
      setHistory(prev);
      setCurOrder(last);
      setTransitioning(false);
    }, 200);
  }, [history, transitioning, stopTts]);

  /* TTS */
  const handleTts = useCallback(() => {
    if (!currentPage) return;
    if (isSpeaking) { stopTts?.(); return; }
    const text = currentPage.characterName
      ? `${currentPage.characterName} nói: ${currentPage.content}`
      : currentPage.content;
    speak?.(text);
  }, [currentPage, isSpeaking, speak, stopTts]);

  /* Lưu progress khi đến ending */
  useEffect(() => {
    if (!currentPage?.isEnding) return;
    client.post(`/api/stories/${storyId}/complete`, {
      lastPageOrder: currentPage.pageOrder,
      completed:     true,
      endingType:    currentPage.endingType,
    }).catch(() => {});
  }, [currentPage, storyId]);

  /* ── Mood style của trang hiện tại ─────────────────────── */
  const moodKey  = currentPage?.characterMood?.toLowerCase() || '';
  const moodSty  = MOOD_STYLE[moodKey] || null;
  const endMeta  = currentPage?.endingType ? (ENDING_META[currentPage.endingType] || ENDING_META.good) : ENDING_META.good;
  const pageIcon = PAGE_TYPE_ICON[currentPage?.pageType] || '📖';

  /* ── Loading / Error ────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'bounce-soft 1s ease infinite alternate' }}>📖</div>
        <p style={{ color: '#64748B', fontWeight: 700 }}>Đang tải truyện...</p>
      </div>
    </div>
  );
  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ background: '#FFE8E0', border: '2px solid #FCA5A5', borderRadius: 16, padding: 20, marginBottom: 16, color: '#B91C1C' }}>{error}</div>
      <Button variant="ghost" onClick={() => navigate('/stories')}>← Về thư viện</Button>
    </div>
  );

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div ref={pageRef} style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ───────────────────────────────────────── */}
      <div style={{
        position:     'sticky', top: 0, zIndex: 100,
        background:   'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(148,163,184,0.12)',
        padding:      '10px 16px',
        display:      'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/stories')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748B', padding: '4px 8px', borderRadius: 8, flexShrink: 0 }}>
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {story?.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
            Trang {visitedCount} / {totalPages}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {(story?.pages || []).slice(0, 14).map((p) => {
            const vis = history.includes(p.pageOrder);
            const cur = p.pageOrder === curOrder;
            return (
              <div key={p.pageOrder} style={{
                width:      cur ? 20 : 7,
                height:     7,
                borderRadius: 4,
                background: cur ? '#4EB8F8' : vis ? '#6EE7B7' : '#E2E8F0',
                transition: 'all 0.3s',
                flexShrink: 0,
              }} />
            );
          })}
          {totalPages > 14 && <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>…</span>}
        </div>

        {/* TTS */}
        {speak && (
          <button onClick={handleTts} title={isSpeaking ? 'Dừng đọc' : 'Nghe đọc'} style={{
            width: 38, height: 38, borderRadius: '50%', border: `2px solid ${isSpeaking ? '#4EB8F8' : 'rgba(148,163,184,0.25)'}`,
            background: isSpeaking ? '#DAEEFF' : 'white', cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0,
          }}>
            {isSpeaking ? '🔊' : '🔈'}
          </button>
        )}
      </div>

      {/* ── TRANSITION FADE ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        opacity:   transitioning ? 0 : 1,
        transform: transitioning ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
      }}>

        {/* ── CHOICE FLASH CONSEQUENCE ──────────────────────── */}
        {showFlash && choiceFlash && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(30,41,59,0.60)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{
              background: 'white', borderRadius: 24, padding: '36px 40px',
              textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              animation: 'bounce-soft 0.4s ease',
            }}>
              <div style={{ fontSize: '5rem', marginBottom: 12 }}>{choiceFlash.emoji}</div>
              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1E293B' }}>{choiceFlash.label}</div>
            </div>
          </div>
        )}

        {/* ── NORMAL PAGE ─────────────────────────────────────── */}
        {currentPage && !currentPage.isEnding && (
          <>
            {/* SCENE PANEL */}
            <div style={{
              minHeight:       260,
              background:      currentPage.sceneBg || '#FFF9F0',
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              justifyContent:  'center',
              padding:         '32px 20px 24px',
              position:        'relative',
              transition:      'background 0.4s ease',
            }}>
              {/* Page type label */}
              <div style={{
                position:     'absolute',
                top:          12, left:         12,
                background:   'rgba(255,255,255,0.80)',
                backdropFilter: 'blur(8px)',
                borderRadius: 20, padding: '4px 12px',
                fontSize:     '0.78rem', fontWeight: 800, color: '#64748B',
                display:      'flex', alignItems: 'center', gap: 5,
              }}>
                <span>{pageIcon}</span>
                <span>{currentPage.pageType === 'narration' ? 'Kể chuyện'
                      : currentPage.pageType === 'dialogue'   ? 'Hội thoại'
                      : currentPage.pageType === 'consequence' ? 'Hậu quả'
                      : 'Lựa chọn'}</span>
              </div>

              {/* Scene emoji — large */}
              <div style={{
                fontSize:  currentPage.pageType === 'choice' ? '5rem' : '7rem',
                lineHeight: 1,
                marginBottom: 12,
                animation:  'bounce-soft 2.5s ease infinite alternate',
                filter:     'drop-shadow(0 8px 20px rgba(0,0,0,0.10))',
                display:    'inline-block',
              }}>
                {currentPage.sceneEmoji || '🏠'}
              </div>

              {/* Character + mood chip */}
              {currentPage.characterName && (
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          8,
                  background:   moodSty ? moodSty.bg : 'rgba(255,255,255,0.85)',
                  border:       `2px solid ${moodSty ? moodSty.border : 'rgba(148,163,184,0.25)'}`,
                  borderRadius: 24,
                  padding:      '6px 16px',
                  fontWeight:   800,
                  fontSize:     '0.95rem',
                  backdropFilter: 'blur(8px)',
                }}>
                  <span style={{ fontSize: '1.8rem' }}>{currentPage.characterEmoji || '😊'}</span>
                  <span style={{ color: moodSty ? moodSty.text : '#1E293B' }}>{currentPage.characterName}</span>
                  {currentPage.characterMood && (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color:    moodSty ? moodSty.text : '#64748B',
                      opacity:  0.8,
                    }}>
                      — {currentPage.characterMood}
                    </span>
                  )}
                </div>
              )}

              {/* Emotion hint */}
              {currentPage.emotionHint && (
                <div style={{
                  position:   'absolute', bottom: 10, right: 12,
                  background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)',
                  borderRadius: 20, padding: '3px 12px',
                  fontSize:   '0.76rem', fontWeight: 800, color: '#475569',
                }}>
                  💭 {currentPage.emotionHint}
                </div>
              )}
            </div>

            {/* TEXT + INTERACTION PANEL */}
            <div style={{ flex: 1, background: 'white', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Content text */}
              {currentPage.pageType !== 'choice' && (
                <div style={{
                  fontSize:   'clamp(1.1rem,2.5vw,1.35rem)',
                  color:      '#1E293B',
                  lineHeight: 1.75,
                  fontWeight: currentPage.pageType === 'narration' ? 500 : 700,
                  borderLeft: currentPage.pageType === 'dialogue' || currentPage.pageType === 'consequence'
                    ? `5px solid ${moodSty ? moodSty.border : '#4EB8F8'}` : 'none',
                  paddingLeft: currentPage.pageType !== 'narration' ? 16 : 0,
                  background: currentPage.pageType === 'consequence'
                    ? (moodSty ? moodSty.bg + 'AA' : '#F0FDF4') : 'transparent',
                  borderRadius: currentPage.pageType === 'consequence' ? '0 12px 12px 0' : 0,
                  padding: currentPage.pageType === 'consequence' ? '12px 16px' : (currentPage.pageType !== 'narration' ? '0 0 0 16px' : 0),
                }}>
                  {currentPage.pageType === 'narration' && (
                    <span style={{ marginRight: 8, opacity: 0.5, fontSize: '1rem' }}>📖</span>
                  )}
                  {currentPage.content}
                </div>
              )}

              {/* CHOICE PANEL ─────────────────────────────── */}
              {currentPage.pageType === 'choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Question */}
                  <div style={{
                    background:   '#F8FAFC',
                    borderRadius: 16,
                    padding:      '16px 18px',
                    border:       '1.5px solid #E2E8F0',
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🤔 Con sẽ chọn điều gì?
                    </div>
                    <p style={{ fontSize: 'clamp(1rem,2.2vw,1.2rem)', fontWeight: 700, color: '#1E293B', lineHeight: 1.6, margin: 0 }}>
                      {currentPage.content}
                    </p>
                  </div>

                  {/* Choice buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentPage.choices.map((choice, ci) => {
                      const isGoodChoice = ['🗣️','🌟','🌬️','😄','😢','🤗','💙'].includes(choice.emoji);
                      return (
                        <button
                          key={choice.id}
                          onClick={() => goTo(choice.nextPageOrder, { emoji: choice.resultEmoji || '✨', label: choice.resultLabel || '...' })}
                          style={{
                            padding:      '18px 20px',
                            borderRadius: 18,
                            border:       `2.5px solid ${isGoodChoice ? 'rgba(78,184,248,0.40)' : 'rgba(148,163,184,0.25)'}`,
                            background:   isGoodChoice ? 'linear-gradient(135deg, #F0FAFF, white)' : 'linear-gradient(135deg, #F8FAFC, white)',
                            cursor:       'pointer',
                            textAlign:    'left',
                            display:      'flex',
                            alignItems:   'center',
                            gap:          14,
                            boxShadow:    '0 2px 12px rgba(0,0,0,0.06)',
                            transition:   'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
                        >
                          {/* Choice letter */}
                          <div style={{
                            width:          40, height: 40, borderRadius: '50%', flexShrink: 0,
                            display:        'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize:       '1.4rem',
                            background:     isGoodChoice ? '#DAEEFF' : '#F1F5F9',
                            border:         isGoodChoice ? '2px solid rgba(78,184,248,0.35)' : '2px solid #E2E8F0',
                          }}>
                            {choice.emoji}
                          </div>
                          <span style={{
                            fontSize:   'clamp(1rem,2.2vw,1.15rem)',
                            fontWeight: 700,
                            color:      '#1E293B',
                            flex:       1,
                            lineHeight: 1.5,
                          }}>
                            {choice.text}
                          </span>
                          <span style={{ color: '#94A3B8', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NAVIGATION for non-choice pages */}
              {currentPage.pageType !== 'choice' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
                  {history.length > 0 && (
                    <Button variant="ghost" onClick={handleBack} size="sm">
                      ← Quay lại
                    </Button>
                  )}
                  <button
                    onClick={handleNext}
                    style={{
                      flex: 1, maxWidth: 300,
                      padding: '16px 24px',
                      borderRadius: 18,
                      border: 'none',
                      background: 'linear-gradient(135deg, #4EB8F8, #3B82F6)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(78,184,248,0.35)',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    Tiếp theo <span style={{ fontSize: '1.2rem' }}>→</span>
                  </button>
                </div>
              )}

              {currentPage.pageType === 'choice' && history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleBack} style={{ alignSelf: 'flex-start' }}>
                  ← Quay lại
                </Button>
              )}
            </div>
          </>
        )}

        {/* ── ENDING SCREEN ─────────────────────────────────── */}
        {currentPage?.isEnding && (
          <div style={{
            minHeight:      '90vh',
            background:     `linear-gradient(180deg, ${endMeta.bg} 0%, white 60%)`,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '48px 24px',
            textAlign:      'center',
            gap:            0,
          }}>
            {/* Big scene emoji */}
            <div style={{ fontSize: '7rem', marginBottom: 12, animation: 'bounce-soft 1s ease infinite alternate' }}>
              {currentPage.sceneEmoji || endMeta.emoji}
            </div>

            {/* Ending type pill */}
            <div style={{
              display:      'inline-flex', alignItems: 'center', gap: 8,
              padding:      '8px 22px', marginBottom: 18,
              borderRadius: 24,
              background:   endMeta.border + '33',
              border:       `2.5px solid ${endMeta.border}`,
              fontWeight:   900, fontSize: '1rem', color: endMeta.text,
            }}>
              {endMeta.emoji} {endMeta.label}
            </div>

            {/* Character + content */}
            {currentPage.characterName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '2.5rem' }}>{currentPage.characterEmoji}</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B' }}>{currentPage.characterName}</span>
              </div>
            )}
            <p style={{
              fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', color: '#1E293B',
              fontWeight: 600, lineHeight: 1.75, maxWidth: 500, marginBottom: 28,
            }}>
              {currentPage.content}
            </p>

            {/* Lesson box */}
            {currentPage.lessonText && (
              <div style={{
                background:   'white',
                border:       `2.5px solid ${endMeta.border}`,
                borderRadius: 24, padding: '22px 26px',
                maxWidth: 520, width: '100%',
                marginBottom: 32,
                boxShadow:    '0 8px 32px rgba(0,0,0,0.08)',
                textAlign:    'left',
              }}>
                <div style={{ fontWeight: 900, color: endMeta.text, fontSize: '0.85rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '1.3rem' }}>💡</span> CON ĐÃ HỌC ĐƯỢC:
                </div>
                <p style={{ color: '#1E293B', lineHeight: 1.75, fontWeight: 600, fontSize: 'clamp(0.95rem,2vw,1.1rem)', margin: 0 }}>
                  {currentPage.lessonText}
                </p>
              </div>
            )}

            {/* Stars */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 32, fontSize: '3rem' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  display:    'inline-block',
                  animation:  `bounce-soft 0.7s ease ${i * 0.2}s infinite alternate`,
                  filter:     currentPage.endingType === 'good'
                    ? 'drop-shadow(0 0 10px rgba(255,200,0,0.8))' : 'grayscale(0.5) brightness(0.9)',
                }}>⭐</span>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/stories')}
                style={{
                  padding: '16px 28px', borderRadius: 18, border: 'none',
                  background: 'linear-gradient(135deg, #4EB8F8, #3B82F6)', color: 'white',
                  fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(78,184,248,0.35)',
                }}
              >
                📚 Về thư viện
              </button>
              <button
                onClick={() => { setHistory([]); setCurOrder(1); setTransitioning(false); setChoiceFlash(null); }}
                style={{
                  padding: '16px 28px', borderRadius: 18,
                  border: `2px solid ${endMeta.border}`,
                  background: 'white', color: endMeta.text,
                  fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer',
                }}
              >
                🔁 Đọc lại từ đầu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
