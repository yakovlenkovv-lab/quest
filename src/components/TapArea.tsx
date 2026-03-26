import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TapAreaProps {
  requiredCount: number;
  initialCount: number;
  onSuccess: () => void;
  onCountChange: (n: number) => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function TapArea({
  requiredCount,
  initialCount,
  onSuccess,
  onCountChange,
}: TapAreaProps) {
  const [count, setCount] = useState(initialCount);
  const [showError, setShowError] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const successFiredRef = useRef(false);
  const rippleIdRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (successFiredRef.current) return;
      const now = Date.now();
      if (now - lastTapTimeRef.current < 100) return;
      lastTapTimeRef.current = now;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const id = ++rippleIdRef.current;
      setRipples(prev => [...prev, { id, x, y }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 500);

      setCount(prev => {
        const next = prev + 1;
        onCountChange(next);

        if (next === requiredCount) {
          if (!successFiredRef.current) {
            successFiredRef.current = true;
            setShowError(false);
            setTimeout(onSuccess, 200);
          }
          return next;
        }

        if (next > requiredCount) {
          setShowError(true);
          return next;
        }

        setShowError(false);
        return next;
      });
    },
    [onSuccess, onCountChange],
  );

  const handleReset = useCallback(() => {
    setCount(0);
    setShowError(false);
    successFiredRef.current = false;
    onCountChange(0);
  }, [onCountChange]);

  const progress = Math.min(count / requiredCount, 1);
  const isOver = count > requiredCount;

  return (
    <motion.div
      className="tap-wrap"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="tap-card">
        {/* Tap zone */}
        <div
          className="tap-area"
          onPointerDown={handleTap}
          role="button"
          aria-label={`Тапни ${requiredCount} раз. Текущее количество: ${count}`}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              const target = e.currentTarget;
              const rect = target.getBoundingClientRect();
              handleTap({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, currentTarget: target } as React.PointerEvent<HTMLDivElement>);
            }
          }}
        >
          {/* Ripples */}
          {ripples.map(r => (
            <span
              key={r.id}
              className="ripple"
              style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40 }}
            />
          ))}

          <motion.div
            className="tap-count-display"
            key={count}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {count}
          </motion.div>

          <div className="tap-target-label">
            / {requiredCount} тапов
          </div>

          <div className="tap-hint">
            {count === 0 ? 'Нажимай здесь 👆' : count < requiredCount ? 'Продолжай!' : ''}
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {showError && (
            <motion.div
              className="tap-error-msg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              Перебор. Давай ещё раз?
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar + reset */}
        <div className="tap-footer">
          <div className="tap-progress-track">
            <div
              className="tap-progress-bar"
              style={{
                width: `${progress * 100}%`,
                background: isOver
                  ? 'linear-gradient(90deg, #fca5a5, #f87171)'
                  : 'linear-gradient(90deg, #c084fc, #f9a8d4)',
              }}
            />
          </div>

          {(isOver || count > 0) && (
            <button
              className="tap-reset-btn"
              onClick={e => { e.stopPropagation(); handleReset(); }}
              type="button"
            >
              Сброс
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
