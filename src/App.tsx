import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';

import { useMessageQueue } from './hooks/useMessageQueue';
import { loadState, saveState } from './storage';
import {
  STAGE_MESSAGES,
  SUCCESS_OPEN_FILE_AFTER_MSG_IDX,
  INTRO_CODE_BUTTON_MSG,
  TAP_COUNT_1,
  TAP_COUNT_2,
  TAP_RETRY_LOADING_MS_MIN,
  TAP_RETRY_LOADING_MS_MAX,
} from './constants';
import type { Stage } from './types';

import BootLoader from './components/BootLoader';
import Chat from './components/Chat';
import Actions from './components/Actions';
import CameraSmileCheck from './components/CameraSmileCheck';
import TapArea from './components/TapArea';
import CodeModal from './components/CodeModal';
import FixedBottomButton from './components/FixedBottomButton';

// Ordered list of stages (boot excluded from message logic)
const STAGE_ORDER: Stage[] = [
  'boot', 'intro', 'scan', 'scan_success',
  'tap', 'tap_retry', 'tap_success', 'hints', 'await_code', 'success',
];

function stageGte(a: Stage, b: Stage): boolean {
  return STAGE_ORDER.indexOf(a) >= STAGE_ORDER.indexOf(b);
}


function launchConfetti() {
  const colors = ['#f9a8d4', '#c084fc', '#67e8f9', '#fde68a', '#86efac'];
  const end = Date.now() + 3200;

  function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 58,
      origin: { x: 0, y: 0.7 },
      colors,
      gravity: 0.9,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 58,
      origin: { x: 1, y: 0.7 },
      colors,
      gravity: 0.9,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }
  frame();
}

export default function App() {
  const [isBooted, setIsBooted] = useState(false);
  const [stage, setStageRaw] = useState<Stage>('boot');
  const [clickCount, setClickCount] = useState(0);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showTap, setShowTap] = useState(false);
  const [showScanButton, setShowScanButton] = useState(false);
  const [showDigit1Button, setShowDigit1Button] = useState(false);
  const [showHintsButton, setShowHintsButton] = useState(false);
  const [showOpenFileButton, setShowOpenFileButton] = useState(false);
  const [showSuccessGlow, setShowSuccessGlow] = useState(false);
  const [showCodeButton, setShowCodeButton] = useState(false);

  const {
    chatItems,
    doneCount,
    doneSyncCountRef,
    enqueue,
    instantAdd,
    addPhoto,
    onTypingDone,
  } = useMessageQueue();

  // Track expected done-count callback
  const pendingCbRef = useRef<{ count: number; cb: () => void } | null>(null);
  const firedCbCountRef = useRef(-1);

  // Show "Ввести код" button only after the message has finished typing
  useEffect(() => {
    const codeMsgDone = chatItems.some(
      item => item.type === 'bot' && item.text === INTRO_CODE_BUTTON_MSG && item.status === 'done',
    );
    if (codeMsgDone) setShowCodeButton(true);
  }, [chatItems]);

  // Restore: if past intro, button should be visible
  useEffect(() => {
    if (stage !== 'intro' && stage !== 'boot' && stage !== 'success') {
      setShowCodeButton(true);
    }
  }, [stage]);

  // When doneCount changes, check if a pending callback should fire
  useEffect(() => {
    if (
      pendingCbRef.current !== null &&
      doneCount >= pendingCbRef.current.count &&
      firedCbCountRef.current !== pendingCbRef.current.count
    ) {
      firedCbCountRef.current = pendingCbRef.current.count;
      const cb = pendingCbRef.current.cb;
      pendingCbRef.current = null;
      const t = setTimeout(cb, 500);
      return () => clearTimeout(t);
    }
  }, [doneCount]);

  /**
   * Enqueue messages and run cb when all are done typing.
   * Uses doneSyncCountRef (updated synchronously) so the target is correct
   * even when called immediately after instantAdd().
   */
  const enqueueAndThen = useCallback(
    (items: Parameters<typeof enqueue>[0], cb: () => void) => {
      const target = doneSyncCountRef.current + items.length;
      pendingCbRef.current = { count: target, cb };
      firedCbCountRef.current = -1;
      enqueue(items);
    },
    [doneSyncCountRef, enqueue],
  );

  // ─── Stage setters (save to localStorage) ─────────────────────────────────
  const setStage = useCallback((s: Stage) => {
    setStageRaw(s);
    saveState({ stage: s });
  }, []);

  // ─── Stage flow functions ──────────────────────────────────────────────────

  function startSuccess() {
    setStage('success');
    setShowSuccessGlow(true);
    launchConfetti();

    const msgs = [...STAGE_MESSAGES.success];
    const part1 = msgs.slice(0, SUCCESS_OPEN_FILE_AFTER_MSG_IDX + 1);
    const part2 = msgs.slice(SUCCESS_OPEN_FILE_AFTER_MSG_IDX + 1);

    enqueueAndThen(part1, () => {
      setShowOpenFileButton(true);
    });
  }

  function onOpenFileClick() {
    setShowOpenFileButton(false);
    addPhoto();
    setTimeout(() => enqueue(STAGE_MESSAGES.success.slice(SUCCESS_OPEN_FILE_AFTER_MSG_IDX + 1)), 400);
  }

  function startAwaitCode() {
    setStage('await_code');
    // No messages for await_code stage
  }

  function startHints() {
    setStage('hints');
    // Show first 3 hint messages (through "Возвращайся как только найдешь ее!"), then "Нашла" button
    enqueueAndThen(STAGE_MESSAGES.hints.slice(0, 3), () => {
      setShowHintsButton(true);
    });
  }

  function startTapSuccess() {
    setStage('tap_success');
    setShowTap(false);
    enqueueAndThen(STAGE_MESSAGES.tap_success, startHints);
  }

  function startTapRetry() {
    setStage('tap_retry');
    setClickCount(0);
    saveState({ stage: 'tap_retry', clickCount: 0 });
    enqueueAndThen(
      [{
        text: STAGE_MESSAGES.tap_retry[0],
        minLoadingMs: TAP_RETRY_LOADING_MS_MIN + Math.random() * (TAP_RETRY_LOADING_MS_MAX - TAP_RETRY_LOADING_MS_MIN),
      }],
      () => setShowTap(true),
    );
  }

  function onFirstTapSuccess() {
    setShowTap(false);
    startTapRetry();
  }

  function startTap() {
    setStage('tap');
    enqueueAndThen(STAGE_MESSAGES.tap, () => {
      setShowTap(true);
    });
  }

  function startScanSuccess(dataUrl: string) {
    setStage('scan_success');
    setShowCamera(false);
    const [first, ...rest] = STAGE_MESSAGES.scan_success;
    enqueueAndThen(
      [{ text: first, photoSrc: dataUrl }, ...rest],
      () => setShowDigit1Button(true),
    );
  }

  function startScan() {
    setStage('scan');
    enqueueAndThen(STAGE_MESSAGES.scan, () => {
      setShowCamera(true);
    });
  }

  function startIntro() {
    setStage('intro');
    enqueueAndThen(STAGE_MESSAGES.intro, () => {
      setShowScanButton(true);
    });
  }

  // ─── Boot complete: restore or fresh start ─────────────────────────────────
  const handleBootComplete = useCallback(() => {
    setIsBooted(true);
    const saved = loadState();

    if (saved.stage === 'boot' || saved.stage === 'intro') {
      startIntro();
      return;
    }

    const s = saved.stage;
    setStageRaw(s);
    setClickCount(saved.clickCount);

    // Show all past messages instantly based on saved stage
    if (stageGte(s, 'intro')) {
      // Non-hints stages: show all their messages
      const baseStages: Stage[] = ['intro', 'scan', 'scan_success', 'tap', 'tap_retry', 'tap_success'];
      const stagesToShow = baseStages.filter(st => stageGte(s, st));
      const msgs = stagesToShow.flatMap(st => STAGE_MESSAGES[st as keyof typeof STAGE_MESSAGES] ?? []);

      // Hints: only show part 1 (first 2 msgs) when at 'hints' stage (button not clicked yet).
      // Show all 3 when past hints (await_code, success).
      if (stageGte(s, 'hints')) {
        if (s === 'hints') {
          msgs.push(...STAGE_MESSAGES.hints.slice(0, 3));
        } else {
          msgs.push(...STAGE_MESSAGES.hints);
        }
      }

      instantAdd(msgs);
    }

    // For success: show all success messages instantly + photo
    if (s === 'success') {
      instantAdd(STAGE_MESSAGES.success);
      // Add photo after PHOTO_AFTER_SUCCESS_MSG_IDX-th success message
      // Actually just add it immediately; it appears at end of chat
      setTimeout(addPhoto, 50);
      setShowSuccessGlow(true);
      return;
    }

    // Resume at appropriate stage
    if (s === 'scan') {
      setShowCamera(true);
      return;
    }
    if (s === 'scan_success') {
      // Was in transition — сначала показать сообщение про капчу, потом тап
      setStageRaw('tap');
      saveState({ stage: 'tap' });
      enqueueAndThen(STAGE_MESSAGES.tap, () => setShowTap(true));
      return;
    }
    if (s === 'tap') {
      setShowTap(true);
      return;
    }
    if (s === 'tap_retry') {
      setShowTap(true);
      return;
    }
    if (s === 'tap_success') {
      // Was transitioning — show hints part 1, then button
      setStageRaw('hints');
      saveState({ stage: 'hints' });
      enqueueAndThen(STAGE_MESSAGES.hints.slice(0, 3), () => setShowHintsButton(true));
      return;
    }
    if (s === 'hints') {
      // All hints were shown — show the "Found it" button again
      setShowHintsButton(true);
      return;
    }
    if (s === 'await_code') {
      // Just wait for code
      return;
    }
    // All called functions (startIntro, startScan, etc.) only call stable
    // state setters and stable useCallback hooks, so [] deps is correct.
  }, []); // eslint-disable-line

  // ─── Handle code success ───────────────────────────────────────────────────
  const handleCodeSuccess = useCallback(() => {
    setIsCodeModalOpen(false);
    startSuccess();
  }, []); // eslint-disable-line

  // ─── Count changes ─────────────────────────────────────────────────────────
  const handleCountChange = useCallback((n: number) => {
    setClickCount(n);
    saveState({ clickCount: n });
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <AnimatePresence>
        {!isBooted && (
          <BootLoader key="boot" onComplete={handleBootComplete} />
        )}
      </AnimatePresence>

      {isBooted && (
        <motion.div
          className={showCodeButton && stage !== 'success' ? 'main-content-with-code-btn' : ''}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {showSuccessGlow && <div className="success-glow" />}

          <Chat
            items={chatItems}
            onTypingDone={onTypingDone}
            hasCodeButton={showCodeButton && stage !== 'success'}
            scrollTrigger={`${showScanButton}-${showDigit1Button}-${showHintsButton}-${showOpenFileButton}-${showTap}-${showCamera}`}
          >
            {/* Inline scan button (intro stage) */}
            <AnimatePresence>
              {showScanButton && (
                <Actions
                  key="scan-btn"
                  label="Начать сканирование"
                  icon="📷"
                  onClick={() => {
                    setShowScanButton(false);
                    startScan();
                  }}
                />
              )}
            </AnimatePresence>

            {/* Camera component (scan stage) */}
            <AnimatePresence>
              {showCamera && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CameraSmileCheck onSuccess={startScanSuccess} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap area (tap / tap_retry stages) */}
            <AnimatePresence>
              {showTap && (
                <motion.div
                  key={stage === 'tap_retry' ? 'tap-retry' : 'tap'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TapArea
                    requiredCount={stage === 'tap_retry' ? TAP_COUNT_2 : TAP_COUNT_1}
                    initialCount={clickCount}
                    onSuccess={stage === 'tap_retry' ? startTapSuccess : onFirstTapSuccess}
                    onCountChange={handleCountChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* "Continue" button (after scan_success messages) */}
            <AnimatePresence>
              {showDigit1Button && (
                <Actions
                  key="digit1-btn"
                  label="Продолжить"
                  onClick={() => {
                    setShowDigit1Button(false);
                    startTap();
                  }}
                />
              )}
            </AnimatePresence>

            {/* "Found it" button (hints stage) */}
            <AnimatePresence>
              {showHintsButton && (
                <Actions
                  key="hints-btn"
                  label="Продолжить"
                  onClick={() => {
                    setShowHintsButton(false);
                    enqueueAndThen(STAGE_MESSAGES.hints.slice(3), startAwaitCode);
                  }}
                />
              )}
            </AnimatePresence>

            {/* "Open file" button (success stage) */}
            <AnimatePresence>
              {showOpenFileButton && (
                <Actions
                  key="open-file-btn"
                  label="Открыть файл"
                  icon="📁"
                  onClick={onOpenFileClick}
                />
              )}
            </AnimatePresence>
          </Chat>

          {/* Fixed bottom code button — появляется с сообщением про кнопку, скрывается после успеха */}
          <AnimatePresence>
            {showCodeButton && stage !== 'success' && (
              <FixedBottomButton
                key="code-btn"
                onClick={() => setIsCodeModalOpen(true)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Code modal */}
      <AnimatePresence>
        {isCodeModalOpen && (
          <CodeModal
            key="code-modal"
            stage={stage}
            onClose={() => setIsCodeModalOpen(false)}
            onSuccess={handleCodeSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
