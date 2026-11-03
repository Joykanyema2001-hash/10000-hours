import { requireOptionalNativeModule } from 'expo';

/** Times are epoch milliseconds. */
export type SessionActivityState = {
  skillName: string;
  symbol: string;
  startDate: number;
  pausedElapsedMs: number | null;
  nextHour: number;
  hourStart: number;
  hourEnd: number;
};

type TenkActivityModule = {
  isSupported(): boolean;
  sync(state: SessionActivityState): Promise<void>;
  end(): Promise<void>;
};

/** Null in Expo Go, on web and on Android: callers must treat it as optional. */
export const TenkActivity = requireOptionalNativeModule<TenkActivityModule>('TenkActivity');
