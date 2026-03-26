import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FINAL_PHOTO_PATH } from '../constants';
import PhotoDownloadButton from './PhotoDownloadButton';

/** Background color for scratch overlay — matches app dark theme */
const SCRATCH_COVER_COLOR = '#0d0a1e';
const SCRATCH_RADIUS = 32;
const FINGER_HINT_DELAY_MS = 1000;
const FINGER_HINT_DURATION_MS = 2500;

interface PhotoRevealProps {
  /** When provided, shows this image (e.g. selfie). No scratch effect. */
  src?: string;
  caption?: string;
}

function ScratchOverlay({
  containerRef,
  imgRef,
  onScratchStart,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onScratchStart?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratchingRef = useRef(false);

  const initCanvas = useCallback(() => {
    const wrap = containerRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const rect = wrap.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.fillStyle = SCRATCH_COVER_COLOR;
    ctx.fillRect(0, 0, w, h);
  }, [containerRef, imgRef]);

  useEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;

    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(initCanvas);
      });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [containerRef, imgRef, initCanvas]);

  const getPoint = useCallback(
    (e: React.TouchEvent | React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX == null || clientY == null) return null;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const scratchAt = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    },
    [],
  );

  const handleStart = useCallback(
    (e: React.TouchEvent | React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pt = getPoint(e);
      if (pt) {
        isScratchingRef.current = true;
        onScratchStart?.();
        scratchAt(ctx, pt.x, pt.y);
      }
    },
    [getPoint, scratchAt, onScratchStart],
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.PointerEvent) => {
      if (!isScratchingRef.current) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pt = getPoint(e);
      if (pt) scratchAt(ctx, pt.x, pt.y);
    },
    [getPoint, scratchAt],
  );

  const handleEnd = useCallback(() => {
    isScratchingRef.current = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="photo-scratch-canvas"
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      style={{ touchAction: 'none', cursor: 'grab' }}
      aria-hidden
    />
  );
}

export default function PhotoReveal({ src, caption = '📍 Место подарка' }: PhotoRevealProps) {
  const imgSrc = src ?? FINAL_PHOTO_PATH;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showFingerHint, setShowFingerHint] = useState(false);
  const [hideFingerHint, setHideFingerHint] = useState(false);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isScratchMode = !src;

  // Показать подсказку через 1 сек после появления
  useEffect(() => {
    if (!isScratchMode || !loaded) return;
    const t = setTimeout(() => setShowFingerHint(true), FINGER_HINT_DELAY_MS);
    return () => clearTimeout(t);
  }, [isScratchMode, loaded]);

  // Скрыть подсказку через N сек или при первом скретче
  useEffect(() => {
    if (!showFingerHint) return;
    const t = setTimeout(() => setHideFingerHint(true), FINGER_HINT_DURATION_MS);
    return () => clearTimeout(t);
  }, [showFingerHint]);

  const handleScratchStart = useCallback(() => {
    setHideFingerHint(true);
  }, []);

  const hintVisible = showFingerHint && !hideFingerHint;

  return (
    <motion.div
      className="photo-card"
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {error ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎁</div>
          <div>Фото не найдено.</div>
          <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
            Положи файл в <code style={{ color: 'var(--primary)' }}>public/reveal.png</code>
          </div>
        </div>
      ) : (
        <>
          <div ref={imgWrapRef} className="photo-card-img-wrap">
            <PhotoDownloadButton
              src={imgSrc}
              filename={src ? 'quest-selfie.jpg' : 'quest-gift.jpg'}
              className="photo-download-btn"
            />
            <img
              ref={imgRef}
              src={imgSrc}
              alt={caption}
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
            {isScratchMode && loaded && (
              <ScratchOverlay
                containerRef={imgWrapRef}
                imgRef={imgRef}
                onScratchStart={handleScratchStart}
              />
            )}
            <AnimatePresence>
              {isScratchMode && hintVisible && (
                <motion.div
                  className="photo-scratch-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.span
                    className="photo-scratch-hint-emoji"
                    animate={{
                      x: [-140, 140, -140, 140, 0],
                    }}
                    transition={{
                      duration: 2.8,
                      times: [0, 0.25, 0.5, 0.75, 1],
                      ease: 'easeInOut',
                    }}
                  >
                    👆
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!loaded && !error && (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div className="photo-card-caption">{caption}</div>
        </>
      )}
    </motion.div>
  );
}
