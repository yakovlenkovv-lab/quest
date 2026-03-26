import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { motion } from 'framer-motion';
import {
  SMILE_THRESHOLD,
  NEUTRAL_THRESHOLD,
  SURPRISED_THRESHOLD,
  SMILE_STABLE_MS,
  FACE_DETECT_INTERVAL_MS,
  MODELS_PATH,
} from '../constants';

type ScanStep = 'neutral' | 'happy' | 'surprised';
const SCAN_STEPS: ScanStep[] = ['neutral', 'happy', 'surprised'];

const STEP_LABELS: Record<ScanStep, string> = {
  neutral: 'Нейтральное',
  happy: 'Радость',
  surprised: 'Удивление',
};

const STEP_EMOJI: Record<ScanStep, string> = {
  neutral: '😐',
  happy: '😊',
  surprised: '😮',
};

interface CameraSmileCheckProps {
  onSuccess: (dataUrl: string) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

function createCollage(dataUrls: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const imgs: HTMLImageElement[] = [];
    let loaded = 0;

    dataUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === 3) {
          const w = imgs[0].naturalWidth;
          const h = imgs[0].naturalHeight;
          const gap = 8;
          const canvas = document.createElement('canvas');
          canvas.width = w * 3 + gap * 2;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No canvas context'));
            return;
          }
          ctx.fillStyle = '#0d0a1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          imgs.forEach((image, i) => {
            ctx.drawImage(image, i * (w + gap), 0, w, h);
          });
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
      imgs.push(img);
    });
  });
}

export default function CameraSmileCheck({ onSuccess }: CameraSmileCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const successFiredRef = useRef(false);
  const capturedRef = useRef<string[]>([]);
  const stepIdxRef = useRef(0);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [expressionPercent, setExpressionPercent] = useState(0);
  const [statusText, setStatusText] = useState('Загружаю модели…');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const currentStep = SCAN_STEPS[currentStepIdx];

  function captureFrame(): Promise<string> {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) {
        resolve('');
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
          faceapi.nets.faceExpressionNet.loadFromUri(MODELS_PATH),
        ]);

        if (cancelled) return;
        setStatusText('Открываю камеру…');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
        });

        if (cancelled) return;
        setLoadState('ready');
        setStatusText(`${STEP_LABELS[currentStep]} ${STEP_EMOJI[currentStep]}`);

        intervalRef.current = setInterval(async () => {
          if (successFiredRef.current || !videoRef.current) return;

          try {
            const detection = await faceapi
              .detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }),
              )
              .withFaceExpressions();

            if (!detection) {
              stableStartRef.current = null;
              setExpressionPercent(0);
              return;
            }

            const step = SCAN_STEPS[stepIdxRef.current];
            const expr = detection.expressions;
            const value =
              step === 'neutral' ? expr.neutral : step === 'happy' ? expr.happy : expr.surprised;
            const threshold =
              step === 'neutral' ? NEUTRAL_THRESHOLD : step === 'happy' ? SMILE_THRESHOLD : SURPRISED_THRESHOLD;

            const pct = Math.round(value * 100);
            setExpressionPercent(pct);

            if (value >= threshold) {
              if (stableStartRef.current === null) {
                stableStartRef.current = Date.now();
              } else if (Date.now() - stableStartRef.current >= SMILE_STABLE_MS) {
                const dataUrl = await captureFrame();
                if (!dataUrl) return;

                capturedRef.current = [...capturedRef.current, dataUrl];

                if (capturedRef.current.length === 3) {
                  successFiredRef.current = true;
                  cleanup();

                  createCollage(capturedRef.current)
                    .then((collageUrl) => onSuccess(collageUrl))
                    .catch(() => onSuccess(capturedRef.current[0]));
                } else {
                  stableStartRef.current = null;
                  stepIdxRef.current += 1;
                  const nextStep = SCAN_STEPS[stepIdxRef.current];
                  setCurrentStepIdx(stepIdxRef.current);
                  setStatusText(`${STEP_LABELS[nextStep]} ${STEP_EMOJI[nextStep]}`);
                }
              }
            } else {
              stableStartRef.current = null;
            }
          } catch {
            // ignore frame errors
          }
        }, FACE_DETECT_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Нет доступа к камере. Разреши в настройках браузера и перезагрузи страницу.'
            : 'Камера недоступна. Открой сайт в Safari или Chrome и выдай разрешение на камеру.';
        setCameraError(msg);
        setLoadState('error');
      }
    }

    function cleanup() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [onSuccess]);

  useEffect(() => {
    if (loadState === 'ready') {
      setStatusText(`${STEP_LABELS[currentStep]} ${STEP_EMOJI[currentStep]}`);
    }
  }, [loadState, currentStep]);

  const threshold =
    currentStep === 'neutral'
      ? NEUTRAL_THRESHOLD
      : currentStep === 'happy'
        ? SMILE_THRESHOLD
        : SURPRISED_THRESHOLD;
  const barColor =
    expressionPercent >= threshold * 100
      ? '#86efac'
      : expressionPercent > 30
        ? '#fde68a'
        : '#c084fc';

  return (
    <motion.div
      className="camera-wrap"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="camera-card">
        {loadState === 'error' ? (
          <div className="camera-fallback">
            <strong>Ошибка камеры</strong>
            {cameraError}
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
              {loadState === 'ready' && (
                <div className="camera-hud">
                  <div className="camera-hud-corner tl" />
                  <div className="camera-hud-corner tr" />
                  <div className="camera-hud-corner bl" />
                  <div className="camera-hud-corner br" />
                  <div className="camera-scan-line" />
                </div>
              )}
              {loadState === 'loading' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}
            </div>

            {/* Step indicators */}
            {loadState === 'ready' && (
              <div className="camera-steps">
                {SCAN_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    className={`camera-step ${i < currentStepIdx ? 'done' : ''} ${i === currentStepIdx ? 'active' : ''}`}
                    animate={{ scale: i === currentStepIdx ? 1.05 : 1 }}
                  >
                    {i < currentStepIdx ? '✓' : STEP_EMOJI[step]}
                    <span className="camera-step-label">{STEP_LABELS[step]}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {loadState === 'ready' && (
              <div className="camera-footer">
                <span className="camera-smile-label">{STEP_LABELS[currentStep].toUpperCase()}</span>
                <div className="camera-smile-bar-track">
                  <div
                    className="camera-smile-bar-fill"
                    style={{
                      width: `${expressionPercent}%`,
                      background: barColor,
                      boxShadow: `0 0 8px ${barColor}60`,
                    }}
                  />
                </div>
                <span className="camera-smile-value">{expressionPercent}%</span>
              </div>
            )}

            <div className="camera-status">{statusText}</div>
          </>
        )}
      </div>
    </motion.div>
  );
}
