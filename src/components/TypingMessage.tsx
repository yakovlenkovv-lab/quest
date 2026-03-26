import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PhotoDownloadButton from './PhotoDownloadButton';
import {
  TYPING_SPEED_MS,
  MESSAGE_LOADING_MS_MIN,
  MESSAGE_LOADING_MS_MAX,
} from '../constants';

interface TypingMessageProps {
  text: string;
  onDone: () => void;
  instant?: boolean;
  /** Override loading phase duration (ms). When set, loading dots show for this long. */
  minLoadingMs?: number;
  /** Photo to show above text. Shown first with animation, then text types below */
  photoSrc?: string;
}

type Phase = 'loading' | 'photo' | 'typing' | 'done';

function getRandomLoadingDelay(): number {
  return MESSAGE_LOADING_MS_MIN + Math.random() * (MESSAGE_LOADING_MS_MAX - MESSAGE_LOADING_MS_MIN);
}

export default function TypingMessage({
  text,
  onDone,
  instant = false,
  minLoadingMs,
  photoSrc,
}: TypingMessageProps) {
  const chars = useRef(Array.from(text));
  const [phase, setPhase] = useState<Phase>(instant ? 'done' : 'loading');
  const [displayed, setDisplayed] = useState(instant ? text : '');
  const indexRef = useRef(0);
  const doneCalledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random per-dot animation params (stable per instance)
  const dotDelays = useMemo(
    () => [0, 0.15 + Math.random() * 0.25, 0.35 + Math.random() * 0.3],
    [],
  );
  const dotDuration = useMemo(() => 1 + Math.random() * 0.6, []);

  // Always keep the latest onDone so timers don't capture stale closures
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    function callDone() {
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onDoneRef.current();
      }
    }

    function clearTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    if (instant) {
      timerRef.current = setTimeout(callDone, 10);
      return clearTimer;
    }

    if (phase === 'loading') {
      const delay = minLoadingMs ?? getRandomLoadingDelay();
      timerRef.current = setTimeout(
        () => setPhase(photoSrc ? 'photo' : 'typing'),
        delay,
      );
      return clearTimer;
    }

    if (phase === 'photo') {
      // Photo animation handled in render via onAnimationComplete
      return clearTimer;
    }

    if (phase === 'typing') {
      function tick() {
        if (indexRef.current >= chars.current.length) {
          setPhase('done');
          callDone();
          return;
        }
        indexRef.current += 1;
        setDisplayed(chars.current.slice(0, indexRef.current).join(''));
        const delay = TYPING_SPEED_MS + (Math.random() * 12 - 6);
        timerRef.current = setTimeout(tick, delay);
      }
      timerRef.current = setTimeout(tick, 50);
      return clearTimer;
    }

    // phase === 'done': nothing to do
  }, [phase, instant, minLoadingMs, photoSrc]); // onDone intentionally via ref, not deps

  if (phase === 'loading') {
    return (
      <div className="typing-dots">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="typing-dot"
            style={{
              animationDelay: `${dotDelays[i]}s`,
              animationDuration: `${dotDuration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {photoSrc && (phase === 'photo' || phase === 'typing' || phase === 'done') && (
        <motion.div
          className="message-bubble-photo"
          initial={phase === 'photo' ? { opacity: 0, scale: 0.95, y: 8 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onAnimationComplete={
            phase === 'photo' ? () => setPhase('typing') : undefined
          }
        >
          <img src={photoSrc} alt="✨ Ты" />
          <PhotoDownloadButton src={photoSrc} className="photo-download-btn" />
        </motion.div>
      )}
      {phase !== 'photo' && (
        <>
          <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>
          {phase === 'typing' && <span className="cursor" aria-hidden="true" />}
        </>
      )}
    </>
  );
}
