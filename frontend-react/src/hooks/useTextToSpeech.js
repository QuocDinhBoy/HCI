import { useCallback, useEffect, useRef, useState } from 'react';

export function useTextToSpeech() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text, options = {}) => {
      if (!isEnabled || !text) return;

      stop();

      const safeText = String(text).trim().slice(0, 180);
      if (!safeText) return;

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = `${baseUrl}/api/tts/audio?text=${encodeURIComponent(safeText)}`;
      const audio = new Audio(url);

      audio.playbackRate = options.rate || 0.92;
      audio.volume = options.volume || 1;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audioRef.current = audio;
      audio.play().catch(() => {
        setIsSpeaking(false);
        audioRef.current = null;
      });
    },
    [isEnabled, stop]
  );

  const speakInstruction = useCallback(
    (text) => {
      speak(text, { rate: 0.9 });
    },
    [speak]
  );

  const speakFeedback = useCallback(
    (text) => {
      speak(text, { rate: 0.96 });
    },
    [speak]
  );

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      if (!next) stop();
      return next;
    });
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isEnabled,
    isSpeaking,
    speak,
    speakInstruction,
    speakFeedback,
    toggle,
    stop,
  };
}
