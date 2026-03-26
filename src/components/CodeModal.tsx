import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CODE_DIGITS } from '../constants';
import type { Stage } from '../types';

const STAGE_ORDER: Stage[] = [
  'boot', 'intro', 'scan', 'scan_success', 'tap',
  'tap_success', 'hints', 'await_code', 'success',
];

function stageGte(a: Stage, b: Stage): boolean {
  return STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b);
}

interface CodeModalProps {
  stage: Stage;
  onClose: () => void;
  onSuccess: () => void;
}

type MessageKind = 'error' | 'warning' | 'info';

interface ModalMessage {
  text: string;
  kind: MessageKind;
}

export default function CodeModal({ stage, onClose, onSuccess }: CodeModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [message, setMessage] = useState<ModalMessage | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  // Focus first input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Trap focus inside modal
  useEffect(() => {
    function onFocusOut(e: FocusEvent) {
      const modal = document.getElementById('code-modal-sheet');
      if (modal && !modal.contains(e.relatedTarget as Node)) {
        inputRefs.current[0]?.focus();
      }
    }
    document.addEventListener('focusout', onFocusOut);
    return () => document.removeEventListener('focusout', onFocusOut);
  }, []);

  const submit = useCallback(() => {
    if (digits.some(d => d === '')) return;

    if (!stageGte(stage, 'await_code')) {
      setMessage({
        text: 'Я ещё не могу принять код. Сначала пройди проверку 😊',
        kind: 'warning',
      });
      return;
    }

    const entered = digits.map(Number) as [number, number, number, number];
    const correct = CODE_DIGITS.every((d, i) => d === entered[i]);

    if (correct) {
      onSuccess();
    } else {
      setMessage({ text: 'Код неверный. Попробуй ещё раз ❤️', kind: 'error' });
      // Shake & clear
      setDigits(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [digits, stage, onSuccess]);

  const handleInput = useCallback(
    (idx: number, value: string) => {
      const digit = value.replace(/\D/g, '').slice(-1);
      setMessage(null);

      setDigits(prev => {
        const next = [...prev];
        next[idx] = digit;
        return next;
      });

      if (digit && idx < 3) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [submit],
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (digits[idx] !== '') {
          setDigits(prev => { const n = [...prev]; n[idx] = ''; return n; });
        } else if (idx > 0) {
          inputRefs.current[idx - 1]?.focus();
          setDigits(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
        }
        setMessage(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      } else if (e.key === 'ArrowRight' && idx < 3) {
        inputRefs.current[idx + 1]?.focus();
      }
    },
    [digits, submit],
  );

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Введи код"
    >
      <motion.div
        className="modal-sheet"
        id="code-modal-sheet"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Закрыть"
          type="button"
        >
          ✕
        </button>

        <div className="modal-sheet-inner">
          <h2 className="modal-title">Код</h2>

          {/* 4-digit inputs */}
          <div className="modal-digits" role="group" aria-label="Поле ввода кода">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                className={`digit-input${d ? ' filled' : ''}`}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => e.target.select()}
                aria-label={`Цифра ${i + 1}`}
              />
            ))}
          </div>

          {/* Message */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key={message.text}
                className={`modal-message ${message.kind}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="modal-submit-btn"
            onClick={submit}
            type="button"
          >
            Проверить
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
