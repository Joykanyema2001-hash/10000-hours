import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { latestLevel } from './lib/levels';
import { DAY, HOUR, MINUTE, startOfDay } from './lib/time';

export type Skill = { id: string; name: string; priorMs: number; createdAt: number };
export type Session = { id: string; skillId: string; start: number; end: number; ms: number };

/**
 * A running session is stored as timestamps, never as a ticking counter,
 * so it stays correct while the app is backgrounded or killed.
 */
export type ActiveSession = {
  skillId: string;
  startedAt: number;
  /** Time banked before the current run (from earlier pauses). */
  bankedMs: number;
  /** When the current run started; null while paused. */
  runningSince: number | null;
};

type State = {
  skills: Skill[];
  sessions: Session[];
  dailyGoalMin: number;
  active: ActiveSession | null;
  lastSkillId: string | null;
  /** Highest level (in hours) already celebrated per skill, so each pop-up shows once. */
  celebrated: Record<string, number>;
  markCelebrated: (skillId: string, hours: number) => void;
  addSkill: (name: string, priorHours: number) => string;
  setDailyGoal: (min: number) => void;
  startSession: (skillId: string) => void;
  pause: () => void;
  resume: () => void;
  finish: () => Session | null;
  discard: () => void;
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const elapsedOf = (a: ActiveSession | null, now = Date.now()) =>
  a ? a.bankedMs + (a.runningSince != null ? Math.max(0, now - a.runningSince) : 0) : 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      skills: [],
      sessions: [],
      dailyGoalMin: 120,
      active: null,
      lastSkillId: null,
      celebrated: {},

      markCelebrated: (skillId, hours) => set((s) => ({ celebrated: { ...s.celebrated, [skillId]: hours } })),

      addSkill: (name, priorHours) => {
        const id = uid();
        const skill: Skill = { id, name: name.trim(), priorMs: Math.max(0, priorHours) * HOUR, createdAt: Date.now() };
        // Levels already earned before the app don't pop up.
        const already = latestLevel(Math.floor(skill.priorMs / HOUR))?.hours ?? 0;
        set((s) => ({ skills: [...s.skills, skill], lastSkillId: s.lastSkillId ?? id, celebrated: { ...s.celebrated, [id]: already } }));
        return id;
      },

      setDailyGoal: (min) => set({ dailyGoalMin: min }),

      startSession: (skillId) => {
        if (get().active) return;
        const now = Date.now();
        set({ active: { skillId, startedAt: now, bankedMs: 0, runningSince: now }, lastSkillId: skillId });
      },

      pause: () => {
        const a = get().active;
        if (!a || a.runningSince == null) return;
        set({ active: { ...a, bankedMs: elapsedOf(a), runningSince: null } });
      },

      resume: () => {
        const a = get().active;
        if (!a || a.runningSince != null) return;
        set({ active: { ...a, runningSince: Date.now() } });
      },

      finish: () => {
        const a = get().active;
        if (!a) return null;
        const ms = elapsedOf(a);
        const session: Session = { id: uid(), skillId: a.skillId, start: a.startedAt, end: Date.now(), ms };
        set((s) => ({ active: null, sessions: [...s.sessions, session] }));
        return session;
      },

      discard: () => set({ active: null }),
    }),
    {
      name: 'tenk-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ skills, sessions, dailyGoalMin, active, lastSkillId, celebrated }) => ({ skills, sessions, dailyGoalMin, active, lastSkillId, celebrated }),
    },
  ),
);

/* ---------- derived values (pure, take `now` so callers control ticking) ---------- */

export function skillTotalMs(s: Pick<State, 'skills' | 'sessions' | 'active'>, skillId: string, now = Date.now()) {
  const skill = s.skills.find((k) => k.id === skillId);
  if (!skill) return 0;
  let total = skill.priorMs;
  for (const x of s.sessions) if (x.skillId === skillId) total += x.ms;
  if (s.active?.skillId === skillId) total += elapsedOf(s.active, now);
  return total;
}

export function todayMs(s: Pick<State, 'sessions' | 'active'>, now = Date.now()) {
  const dayStart = startOfDay(now);
  let total = 0;
  for (const x of s.sessions) if (x.end >= dayStart) total += x.ms;
  return total + elapsedOf(s.active, now);
}

/**
 * Practice rate used for the "you reach 10,000 in …" projection:
 * the average over the last 14 days (or since the skill was added, if newer);
 * falls back to the daily goal when there's no history yet.
 */
export function dailyRateMs(s: Pick<State, 'skills' | 'sessions' | 'dailyGoalMin'>, skillId: string, now = Date.now()) {
  const skill = s.skills.find((k) => k.id === skillId);
  if (!skill) return s.dailyGoalMin * MINUTE;
  const windowStart = Math.max(now - 14 * DAY, startOfDay(skill.createdAt));
  const days = Math.max(1, Math.ceil((now - windowStart) / DAY));
  let ms = 0;
  for (const x of s.sessions) if (x.skillId === skillId && x.end >= windowStart) ms += x.ms;
  return ms > 0 ? ms / days : s.dailyGoalMin * MINUTE;
}

export function projectedYear(remainingMs: number, rateMsPerDay: number, now = Date.now()) {
  if (remainingMs <= 0) return new Date(now).getFullYear();
  const days = remainingMs / Math.max(rateMsPerDay, MINUTE);
  return new Date(now + days * DAY).getFullYear();
}

/** Practice per day for the last `days` days (oldest first), today included. */
export function dayTotals(s: Pick<State, 'sessions' | 'active'>, days = 7, now = Date.now()) {
  const today = startOfDay(now);
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return { start: d.getTime(), ms: 0 };
  });
  const first = out[0].start;
  for (const x of s.sessions) {
    if (x.end < first) continue;
    const day = startOfDay(x.end);
    const slot = out.find((o) => o.start === day);
    if (slot) slot.ms += x.ms;
  }
  out[out.length - 1].ms += elapsedOf(s.active, now);
  return out;
}

export function allTimeMs(s: Pick<State, 'skills' | 'sessions' | 'active'>, now = Date.now()) {
  return s.skills.reduce((sum, k) => sum + skillTotalMs(s, k.id, now), 0);
}
