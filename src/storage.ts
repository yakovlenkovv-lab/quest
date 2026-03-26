import { STORAGE_KEY } from './constants';
import type { SavedState, Stage } from './types';

const CURRENT_VERSION = 1;

const VALID_STAGES: Stage[] = [
  'boot', 'intro', 'scan', 'scan_success', 'tap', 'tap_retry',
  'tap_success', 'hints', 'await_code', 'success',
];

const DEFAULT_STATE: SavedState = {
  stage: 'boot',
  clickCount: 0,
  version: CURRENT_VERSION,
};

export function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed['version'] !== CURRENT_VERSION
    ) {
      return { ...DEFAULT_STATE };
    }

    const stage = parsed['stage'] as Stage;
    const clickCount = parsed['clickCount'] as number;

    if (!VALID_STAGES.includes(stage)) return { ...DEFAULT_STATE };
    if (typeof clickCount !== 'number') return { ...DEFAULT_STATE };

    return { stage, clickCount, version: CURRENT_VERSION };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(partial: Partial<Omit<SavedState, 'version'>>): void {
  try {
    const current = loadState();
    const next: SavedState = { ...current, ...partial, version: CURRENT_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors silently
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
