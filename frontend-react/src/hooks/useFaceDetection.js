import { useState, useRef, useCallback, useEffect } from 'react';

let faceapiModule = null;
let faceapiPromise = null;

let modelsLoaded = false;
let modelsLoadPromise = null;

const SMOOTHING_FRAMES = 5;

const initialEmotions = {
  neutral: 0,
  happy: 0,
  sad: 0,
  angry: 0,
  fearful: 0,
  disgusted: 0,
  surprised: 0,
};

const emotionKeys = Object.keys(initialEmotions);

function areEmotionMapsEqual(a, b) {
  for (const key of emotionKeys) {
    if ((a?.[key] || 0) !== (b?.[key] || 0)) return false;
  }
  return true;
}

async function getFaceApi() {
  if (faceapiModule) return faceapiModule;
  if (!faceapiPromise) {
    faceapiPromise = import('@vladmandic/face-api').then((module) => {
      faceapiModule = module;
      return module;
    });
  }
  return faceapiPromise;
}

export function useFaceDetection() {
  const [isModelLoaded, setIsModelLoaded] = useState(modelsLoaded);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [emotions, setEmotions] = useState(initialEmotions);
  const [dominantEmotion, setDominantEmotion] = useState('neutral');
  const [confidence, setConfidence] = useState(0);

  const emotionHistory = useRef([]);
  const detectionTimer = useRef(null);
  const detectionLoopActive = useRef(false);
  const latestState = useRef({
    faceDetected: false,
    dominantEmotion: 'neutral',
    confidence: 0,
    emotions: initialEmotions,
  });
  const videoStream = useRef(null);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) {
      setIsModelLoaded(true);
      return;
    }

    if (modelsLoadPromise) {
      await modelsLoadPromise;
      setIsModelLoaded(true);
      return;
    }

    modelsLoadPromise = (async () => {
      const faceapi = await getFaceApi();
      const modelUrl = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
      ]);
      modelsLoaded = true;
    })();

    await modelsLoadPromise;
    setIsModelLoaded(true);
  }, []);

  const detectFromElement = useCallback(async (element) => {
    if (!modelsLoaded || !element) return null;

    const faceapi = await getFaceApi();

    let detection = null;
    try {
      detection = await faceapi
        .detectSingleFace(
          element,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceExpressions();
    } catch {
      return null;
    }

    if (!detection) {
      if (latestState.current.faceDetected) {
        latestState.current.faceDetected = false;
        setFaceDetected(false);
      }
      return null;
    }

    if (!latestState.current.faceDetected) {
      latestState.current.faceDetected = true;
      setFaceDetected(true);
    }

    const raw = {
      neutral: Math.round(detection.expressions.neutral * 100),
      happy: Math.round(detection.expressions.happy * 100),
      sad: Math.round(detection.expressions.sad * 100),
      angry: Math.round(detection.expressions.angry * 100),
      fearful: Math.round(detection.expressions.fearful * 100),
      disgusted: Math.round(detection.expressions.disgusted * 100),
      surprised: Math.round(detection.expressions.surprised * 100),
    };

    emotionHistory.current.push(raw);
    if (emotionHistory.current.length > SMOOTHING_FRAMES) emotionHistory.current.shift();

    const smoothed = {};
    for (const key of Object.keys(raw)) {
      smoothed[key] = Math.round(
        emotionHistory.current.reduce((acc, h) => acc + h[key], 0) / emotionHistory.current.length
      );
    }

    if (!areEmotionMapsEqual(latestState.current.emotions, smoothed)) {
      latestState.current.emotions = smoothed;
      setEmotions(smoothed);
    }

    let maxKey = 'neutral';
    let maxVal = -1;
    for (const [key, val] of Object.entries(smoothed)) {
      if (val > maxVal) {
        maxVal = val;
        maxKey = key;
      }
    }

    if (latestState.current.dominantEmotion !== maxKey) {
      latestState.current.dominantEmotion = maxKey;
      setDominantEmotion(maxKey);
    }
    if (latestState.current.confidence !== maxVal) {
      latestState.current.confidence = maxVal;
      setConfidence(maxVal);
    }

    return { emotions: smoothed, dominant: maxKey, confidence: maxVal };
  }, []);

  const startCamera = useCallback(async (videoElement) => {
    videoStream.current?.getTracks().forEach((t) => t.stop());

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    });

    if (videoElement) videoElement.srcObject = stream;
    videoStream.current = stream;
    return stream;
  }, []);

  const startDetection = useCallback(
    (videoElement, intervalMs = 800) => {
      detectionLoopActive.current = false;
      if (detectionTimer.current) {
        clearTimeout(detectionTimer.current);
        detectionTimer.current = null;
      }

      detectionLoopActive.current = true;
      setIsDetecting(true);

      const tick = async () => {
        if (!detectionLoopActive.current) return;

        if (videoElement?.readyState >= 2) {
          await detectFromElement(videoElement);
        }

        if (detectionLoopActive.current) {
          detectionTimer.current = setTimeout(tick, intervalMs);
        }
      };

      tick();
    },
    [detectFromElement]
  );

  const stopDetection = useCallback(() => {
    detectionLoopActive.current = false;
    if (detectionTimer.current) {
      clearTimeout(detectionTimer.current);
      detectionTimer.current = null;
    }
    setIsDetecting(false);
  }, []);

  const stopCamera = useCallback(() => {
    videoStream.current?.getTracks().forEach((t) => t.stop());
    videoStream.current = null;
  }, []);

  const resetHistory = useCallback(() => {
    emotionHistory.current = [];
    latestState.current = {
      faceDetected: false,
      dominantEmotion: 'neutral',
      confidence: 0,
      emotions: initialEmotions,
    };
    setEmotions(initialEmotions);
    setDominantEmotion('neutral');
    setConfidence(0);
    setFaceDetected(false);
  }, []);

  useEffect(
    () => () => {
      stopDetection();
      stopCamera();
    },
    [stopDetection, stopCamera]
  );

  return {
    isModelLoaded,
    isDetecting,
    faceDetected,
    emotions,
    dominantEmotion,
    confidence,
    loadModels,
    detectFromElement,
    startDetection,
    stopDetection,
    startCamera,
    stopCamera,
    resetHistory,
  };
}
