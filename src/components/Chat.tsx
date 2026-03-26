import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChatItem } from '../types';
import TypingMessage from './TypingMessage';
import PhotoReveal from './PhotoReveal';
import PhotoDownloadButton from './PhotoDownloadButton';

interface ChatProps {
  items: ChatItem[];
  onTypingDone: (id: string) => void;
  children?: React.ReactNode;
  /** Резервирует место под фиксированную кнопку «Ввести код» */
  hasCodeButton?: boolean;
  /** Триггер прокрутки вниз при появлении кнопок/камеры/тапов */
  scrollTrigger?: unknown;
}

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export default function Chat({ items, onTypingDone, children, hasCodeButton, scrollTrigger }: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new items or action buttons appear
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(t);
  }, [items.length, scrollTrigger]);

  return (
    <div
      className={`chat-container${hasCodeButton ? ' chat-container-with-code-btn' : ''}`}
      ref={containerRef}
    >
      <AnimatePresence initial={false}>
        {items.map(item => {
          if (item.type === 'photo') {
            return (
              <motion.div
                key={item.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
              >
                <PhotoReveal
                  src={item.src}
                  caption={item.src ? '✨ Ты' : undefined}
                />
              </motion.div>
            );
          }

          return (
            <motion.div
              key={item.id}
              className="message-wrap"
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              layout="position"
            >
              <div className="message-avatar" aria-hidden="true">
                <img src="/bot.png" alt="" aria-hidden />
              </div>
              <div className="message-bubble">
                {item.status === 'typing' ? (
                  <TypingMessage
                    text={item.text}
                    onDone={() => onTypingDone(item.id)}
                    minLoadingMs={item.minLoadingMs}
                    photoSrc={item.photoSrc}
                  />
                ) : (
                  <>
                    {item.photoSrc && (
                      <div className="message-bubble-photo">
                        <img src={item.photoSrc} alt="✨ Ты" />
                        <PhotoDownloadButton src={item.photoSrc} className="photo-download-btn" />
                      </div>
                    )}
                    <span style={{ whiteSpace: 'pre-wrap' }}>{item.text}</span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Inline interactive UI (scan, tap, buttons) injected as children */}
      {children}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}
