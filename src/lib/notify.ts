import { create } from 'zustand';
import type { Level } from './levels';

/**
 * In-app, branded notifications. While the app is open, every alert shows here
 * (lime/navy banner or a milestone celebration) instead of an iOS banner.
 * iOS notifications are only used when the app is closed.
 */

export type BannerKind = 'hour' | 'goal' | 'logged' | 'info' | 'nudge';
export type Banner = { id: number; kind: BannerKind; title: string; body?: string; href?: string };
export type Celebration = { id: number; level: Level; skillName: string; skillId: string };

type NotifyState = {
  banner: Banner | null;
  queue: Banner[];
  celebration: Celebration | null;
  push: (b: Omit<Banner, 'id'>) => void;
  next: () => void;
  celebrate: (c: Omit<Celebration, 'id'>) => void;
  closeCelebration: () => void;
};

let seq = 1;

export const useNotify = create<NotifyState>()((set, get) => ({
  banner: null,
  queue: [],
  celebration: null,
  push: (b) => {
    const banner = { ...b, id: seq++ };
    if (get().banner) set((s) => ({ queue: [...s.queue, banner].slice(-3) }));
    else set({ banner });
  },
  next: () => {
    const [head, ...rest] = get().queue;
    set({ banner: head ?? null, queue: rest });
  },
  celebrate: (c) => set({ celebration: { ...c, id: seq++ } }),
  closeCelebration: () => set({ celebration: null }),
}));

export const notify = (b: Omit<Banner, 'id'>) => useNotify.getState().push(b);
export const celebrate = (c: Omit<Celebration, 'id'>) => useNotify.getState().celebrate(c);
