import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const LOG_INTERVAL_MS = 1500;
const LOG_COUNT = 8;
const BOOT_DURATION_MS = LOG_INTERVAL_MS * LOG_COUNT;

const SYSTEM_LOG_POOL = [
  'нюхаю систему...',
  'ищу следы Вовы...',
  'проверяю миску данных...',
  'инициализирую хвост...',
  'загружаю нейронюх...',
  'проверяю уровень ласки...',
  'анализирую ваши воспоминания...',
  'ловлю запах подарка...',
  'калибрую уши...',
  'пытаюсь не зависнуть...',
  'перегрев... но держусь...',
  'ищу самый любимый запах...',
  'проверяю: это точно ты?',
  'виляю хвостом...',
  'обрабатываю тепло...',
  'собираю кусочки кода...',
  'почти понял...',
  'гав... почти готово...',
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface BootLoaderProps {
  onComplete: () => void;
}

export default function BootLoader({ onComplete }: BootLoaderProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const logSequence = useMemo(() => shuffle(SYSTEM_LOG_POOL).slice(0, LOG_COUNT), []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    logSequence.forEach((msg, i) => {
      const t = setTimeout(
        () => setLogs(prev => [...prev, msg]),
        LOG_INTERVAL_MS * (i + 1),
      );
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [logSequence]);

  useEffect(() => {
    if (logs.length > 0) {
      logsContainerRef.current?.scrollTo({ top: logsContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs.length]);

  return (
    <motion.div
      className="boot-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <div className="boot-scan-lines" />

      <div className="boot-inner">
        <div className="boot-logo-wrap">
          <div className="boot-pulse-ring" />
          <div className="boot-pulse-ring boot-pulse-ring-2" />
          <div className="boot-pulse-ring boot-pulse-ring-3" />
          <motion.div
            className="boot-icon"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: 'backOut' }}
          >
            <img src="/bot.png" alt="Бот" className="boot-icon-img" />
          </motion.div>
        </div>

        <motion.p
          className="boot-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          SHARIK AI BOOTING 🐶
        </motion.p>

        {/* System logs */}
        <div className="boot-logs" ref={logsContainerRef}>
          <AnimatePresence mode="sync">
            {logs.map((msg, i) => (
              <motion.div
                key={`${msg}-${i}`}
                className="boot-log-line"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="boot-log-prefix">[SYS]</span> {msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="boot-progress-track">
          <motion.div
            className="boot-progress-bar"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              delay: 0.3,
              duration: (BOOT_DURATION_MS - 300) / 1000,
              ease: 'easeInOut',
            }}
            onAnimationComplete={onComplete}
          />
        </div>

        <motion.p
          className="boot-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          v1.0 // 01.04.2026
        </motion.p>
      </div>
    </motion.div>
  );
}
