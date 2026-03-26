import { useState, useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatItem, BotMessage, PhotoMessage } from '../types';

let _idCounter = 0;
function nextId(): string {
  return `item-${++_idCounter}`;
}

export type EnqueueItem = string | { text: string; minLoadingMs?: number; photoSrc?: string };

interface UseMessageQueueReturn {
  chatItems: ChatItem[];
  isAllDone: boolean;
  /** Reactive count of done messages (updated after React re-render). */
  doneCount: number;
  /** Synchronous ref that updates immediately (safe to read in callbacks). */
  doneSyncCountRef: MutableRefObject<number>;
  enqueue: (items: readonly EnqueueItem[]) => void;
  instantAdd: (texts: readonly string[]) => void;
  addPhoto: (src?: string) => void;
  onTypingDone: (id: string) => void;
  reset: () => void;
}

export function useMessageQueue(): UseMessageQueueReturn {
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [queue, setQueue] = useState<EnqueueItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Synchronous counter — updated immediately in callbacks (no async state lag)
  const doneSyncCountRef = useRef(0);

  const isAllDone = queue.length === 0 && !isTyping;
  const doneCount = chatItems.filter(
    (item): item is BotMessage => item.type === 'bot' && item.status === 'done',
  ).length;

  // When not typing and queue has items, start the next message
  useEffect(() => {
    if (!isTyping && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setIsTyping(true);
      const id = nextId();
      const text = typeof next === 'string' ? next : next.text;
      const minLoadingMs = typeof next === 'string' ? undefined : next.minLoadingMs;
      const photoSrc = typeof next === 'string' ? undefined : next.photoSrc;
      setChatItems(prev => [
        ...prev,
        { type: 'bot', id, text, status: 'typing', minLoadingMs, photoSrc } satisfies BotMessage,
      ]);
    }
  }, [isTyping, queue]);

  const enqueue = useCallback((items: readonly EnqueueItem[]) => {
    setQueue(prev => [...prev, ...items]);
  }, []);

  const instantAdd = useCallback((texts: readonly string[]) => {
    doneSyncCountRef.current += texts.length; // synchronous update
    setChatItems(prev => [
      ...prev,
      ...texts.map(
        (text): BotMessage => ({
          type: 'bot',
          id: nextId(),
          text,
          status: 'done',
        }),
      ),
    ]);
  }, []);

  const addPhoto = useCallback((src?: string) => {
    setChatItems(prev => [
      ...prev,
      { type: 'photo', id: nextId(), ...(src && { src }) } satisfies PhotoMessage,
    ]);
  }, []);

  const onTypingDone = useCallback((id: string) => {
    doneSyncCountRef.current += 1; // synchronous update
    setChatItems(prev =>
      prev.map(item =>
        item.type === 'bot' && item.id === id
          ? { ...item, status: 'done' }
          : item,
      ),
    );
    setIsTyping(false);
  }, []);

  const reset = useCallback(() => {
    doneSyncCountRef.current = 0;
    setChatItems([]);
    setQueue([]);
    setIsTyping(false);
  }, []);

  return {
    chatItems,
    isAllDone,
    doneCount,
    doneSyncCountRef,
    enqueue,
    instantAdd,
    addPhoto,
    onTypingDone,
    reset,
  };
}

