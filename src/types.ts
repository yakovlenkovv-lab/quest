export type Stage =
  | 'boot'
  | 'intro'
  | 'scan'
  | 'scan_success'
  | 'tap'
  | 'tap_retry'
  | 'tap_success'
  | 'hints'
  | 'await_code'
  | 'success';

export type ChatItemType = 'bot' | 'photo';

export interface BotMessage {
  type: 'bot';
  id: string;
  text: string;
  status: 'typing' | 'done';
  /** Override loading phase duration (ms) before typing starts */
  minLoadingMs?: number;
  /** Photo to show together with the message (e.g. selfie in auth message) */
  photoSrc?: string;
}

export interface PhotoMessage {
  type: 'photo';
  id: string;
  /** Data URL or path. When absent, uses FINAL_PHOTO_PATH (reveal) */
  src?: string;
}

export type ChatItem = BotMessage | PhotoMessage;

export interface SavedState {
  stage: Stage;
  clickCount: number;
  version: number;
}
