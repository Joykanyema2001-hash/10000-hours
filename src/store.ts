import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { latestLevel } from './lib/levels';
import { guessIcon } from './lib/skillIcons';
import { DAY, HOUR, MINUTE, startOfDay } from './lib/time';

export type Skill = { id: string; name: string; priorMs: number; createdAt: number; icon?: string; updatedAt?: number };
export type Session = {
  id: string;
  skillId: string;
  start: number;
  end: number;
  ms: number;
  /** Skill-tree step this session was spent on, if any. */
  nodeId?: string | null;
  note?: string | null;
  updatedAt?: number;
};

/** A step in a skill's tree, e.g. "G major chord" under "Open chords". */
export type NodeStatus = 'todo' | 'learning' | 'mastered';
export type SkillNode = {
  id: string;
  skillId: string;
  /** null = a top-level step directly under the skill. */
  parentId: string | null;
  title: string;
  notes?: string;
  status: NodeStatus;
  createdAt: number;
  updatedAt: number;
  masteredAt?: number | null;
};

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
  /** Elapsed time when the person last confirmed they're still practising (forgotten-timer check). */
  checkedMs?: number;
};

type State = {
  skills: Skill[];
  sessions: Session[];
  nodes: SkillNode[];
  dailyGoalMin: number;
  active: ActiveSession | null;
  lastSkillId: string | null;
  /** Deletions not yet sent to the cloud, so a synced copy can't bring them back. */
  tombstones: Tombstones;
  /** Replace local data with a sync result and forget tombstones the cloud now has. */
  applySync: (skills: Skill[], sessions: Session[], nodes: SkillNode[], sentTombstones: Tombstones) => void;
  addNode: (skillId: string, parentId: string | null, title: string, extra?: { notes?: string; createdAt?: number }) => string;
  updateNode: (id: string, patch: Partial<Pick<SkillNode, 'title' | 'notes' | 'status' | 'parentId'>>) => void;
  /** Deletes a step and everything below it. */
  deleteNode: (id: string) => void;
  updateSession: (id: string, patch: Partial<Pick<Session, 'nodeId' | 'note'>>) => void;
  /** Highest level (in hours) already celebrated per skill, so each pop-up shows once. */
  celebrated: Record<string, number>;
  markCelebrated: (skillId: string, hours: number) => void;
  /** Settings */
  reminderHour: number | null;
  hapticsOn: boolean;
  minuteTicks: boolean;
  setSetting: (patch: Partial<Pick<State, 'reminderHour' | 'hapticsOn' | 'minuteTicks' | 'dailyGoalMin'>>) => void;
  addSkill: (name: string, priorHours: number, icon?: string) => string;
  updateSkill: (id: string, patch: Partial<Pick<Skill, 'name' | 'icon' | 'priorMs'>>) => void;
  /** Removes the skill and all of its sessions. Refused while it has a running session. */
  deleteSkill: (id: string) => boolean;
  /** Log time by hand, e.g. a session you forgot to time. */
  logSession: (skillId: string, ms: number, end: number) => Session;
  deleteSession: (id: string) => void;
  resetAll: () => void;
  /** Replace skills and sessions with a merged import; levels already reached don't pop up again. */
  applyImport: (skills: Skill[], sessions: Session[], dailyGoalMin?: number) => void;
  setDailyGoal: (min: number) => void;
  startSession: (skillId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Save the running session; `ms` overrides the length (e.g. trimmed after a forgotten timer). */
  finish: (ms?: number) => Session | null;
  confirmStillGoing: () => void;
  discard: () => void;
};

export type Tombstones = { skills: string[]; sessions: string[]; nodes: string[] };
const noTombstones = (): Tombstones => ({ skills: [], sessions: [], nodes: [] });

/** A step and all its descendants. */
export function subtreeIds(nodes: SkillNode[], rootId: string): string[] {
  const out = [rootId];
  for (let i = 0; i < out.length; i++) for (const n of nodes) if (n.parentId === out[i]) out.push(n.id);
  return out;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const elapsedOf = (a: ActiveSession | null, now = Date.now()) =>
  a ? a.bankedMs + (a.runningSince != null ? Math.max(0, now - a.runningSince) : 0) : 0;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      skills: [],
      sessions: [],
      nodes: [],
      dailyGoalMin: 120,
      active: null,
      lastSkillId: null,
      celebrated: {},
      tombstones: noTombstones(),
      reminderHour: 19,
      hapticsOn: true,
      minuteTicks: true,

      setSetting: (patch) => set(patch),

      markCelebrated: (skillId, hours) => set((s) => ({ celebrated: { ...s.celebrated, [skillId]: hours } })),

      addSkill: (name, priorHours, icon) => {
        const id = uid();
        const now = Date.now();
        const skill: Skill = { id, name: name.trim(), priorMs: Math.max(0, priorHours) * HOUR, createdAt: now, updatedAt: now, icon };
        // Levels already earned before the app don't pop up.
        const already = latestLevel(Math.floor(skill.priorMs / HOUR))?.hours ?? 0;
        set((s) => ({ skills: [...s.skills, skill], lastSkillId: s.lastSkillId ?? id, celebrated: { ...s.celebrated, [id]: already } }));
        return id;
      },

      updateSkill: (id, patch) =>
        set((s) => ({ skills: s.skills.map((k) => (k.id === id ? { ...k, ...patch, name: (patch.name ?? k.name).trim(), updatedAt: Date.now() } : k)) })),

      deleteSkill: (id) => {
        if (get().active?.skillId === id) return false;
        set((s) => {
          const skills = s.skills.filter((k) => k.id !== id);
          const { [id]: _, ...celebrated } = s.celebrated;
          return {
            skills,
            sessions: s.sessions.filter((x) => x.skillId !== id),
            nodes: s.nodes.filter((n) => n.skillId !== id),
            tombstones: {
              skills: [...s.tombstones.skills, id],
              sessions: [...s.tombstones.sessions, ...s.sessions.filter((x) => x.skillId === id).map((x) => x.id)],
              nodes: [...s.tombstones.nodes, ...s.nodes.filter((n) => n.skillId === id).map((n) => n.id)],
            },
            celebrated,
            lastSkillId: s.lastSkillId === id ? (skills[0]?.id ?? null) : s.lastSkillId,
          };
        });
        return true;
      },

      logSession: (skillId, ms, end) => {
        const session: Session = { id: uid(), skillId, start: end - ms, end, ms };
        set((s) => ({ sessions: [...s.sessions, session] }));
        return session;
      },

      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id), tombstones: { ...s.tombstones, sessions: [...s.tombstones.sessions, id] } })),

      addNode: (skillId, parentId, title, extra) => {
        const id = uid();
        const now = Date.now();
        const notes = extra?.notes?.trim() || undefined;
        const node: SkillNode = { id, skillId, parentId, title: title.trim(), notes, status: 'todo', createdAt: extra?.createdAt ?? now, updatedAt: now };
        set((s) => ({ nodes: [...s.nodes, node] }));
        return id;
      },

      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) => {
            if (n.id !== id) return n;
            const status = patch.status ?? n.status;
            const masteredAt = status === 'mastered' ? (n.status === 'mastered' ? n.masteredAt : Date.now()) : null;
            return { ...n, ...patch, title: (patch.title ?? n.title).trim(), masteredAt, updatedAt: Date.now() };
          }),
        })),

      deleteNode: (id) =>
        set((s) => {
          const gone = new Set(subtreeIds(s.nodes, id));
          return {
            nodes: s.nodes.filter((n) => !gone.has(n.id)),
            // Sessions keep their hours; they just stop pointing at a deleted step.
            sessions: s.sessions.map((x) => (x.nodeId && gone.has(x.nodeId) ? { ...x, nodeId: null, updatedAt: Date.now() } : x)),
            tombstones: { ...s.tombstones, nodes: [...s.tombstones.nodes, ...gone] },
          };
        }),

      updateSession: (id, patch) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)) })),

      applySync: (skills, sessions, nodes, sent) =>
        set((s) => {
          // Data arriving from the cloud shouldn't replay level pop-ups already earned elsewhere.
          const celebrated = { ...s.celebrated };
          for (const k of skills) {
            if (celebrated[k.id] !== undefined) continue;
            const hours = Math.floor(skillTotalMs({ skills, sessions, active: s.active }, k.id) / HOUR);
            celebrated[k.id] = latestLevel(hours)?.hours ?? 0;
          }
          const sentSkills = new Set(sent.skills);
          const sentSessions = new Set(sent.sessions);
          const sentNodes = new Set(sent.nodes);
          const active = s.active && skills.some((k) => k.id === s.active?.skillId) ? s.active : null;
          return {
            skills,
            sessions,
            nodes,
            celebrated,
            active,
            lastSkillId: skills.some((k) => k.id === s.lastSkillId) ? s.lastSkillId : (skills[0]?.id ?? null),
            tombstones: {
              skills: s.tombstones.skills.filter((t) => !sentSkills.has(t)),
              sessions: s.tombstones.sessions.filter((t) => !sentSessions.has(t)),
              nodes: s.tombstones.nodes.filter((t) => !sentNodes.has(t)),
            },
          };
        }),

      applyImport: (skills, sessions, dailyGoalMin) =>
        set((s) => {
          const celebrated = { ...s.celebrated };
          for (const k of skills) {
            const hours = Math.floor(skillTotalMs({ skills, sessions, active: s.active }, k.id) / HOUR);
            celebrated[k.id] = Math.max(celebrated[k.id] ?? 0, latestLevel(hours)?.hours ?? 0);
          }
          return {
            skills,
            sessions,
            celebrated,
            lastSkillId: s.lastSkillId ?? skills[0]?.id ?? null,
            dailyGoalMin: s.skills.length === 0 && dailyGoalMin ? dailyGoalMin : s.dailyGoalMin,
          };
        }),

      resetAll: () => set({ skills: [], sessions: [], nodes: [], active: null, lastSkillId: null, celebrated: {}, dailyGoalMin: 120, tombstones: noTombstones() }),

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

      finish: (override) => {
        const a = get().active;
        if (!a) return null;
        const elapsed = elapsedOf(a);
        const ms = override != null ? Math.max(0, Math.min(override, elapsed)) : elapsed;
        // A trimmed session ends when the practice did, not when the timer was noticed.
        const end = override != null ? Math.min(Date.now(), a.startedAt + ms) : Date.now();
        const session: Session = { id: uid(), skillId: a.skillId, start: a.startedAt, end, ms };
        set((s) => ({ active: null, sessions: [...s.sessions, session] }));
        return session;
      },

      discard: () => set({ active: null }),

      confirmStillGoing: () => {
        const a = get().active;
        if (a) set({ active: { ...a, checkedMs: elapsedOf(a) } });
      },
    }),
    {
      name: 'tenk-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted, version) => {
        const p = persisted as Partial<State>;
        // v0 → v1: skills gain an icon; pick one from the name so existing skills aren't blank.
        if (version < 1 && Array.isArray(p.skills)) p.skills = p.skills.map((k) => ({ ...k, icon: k.icon ?? guessIcon(k.name) }));
        // v1 → v2: skills gain updatedAt for sync; deletions are tracked.
        if (version < 2) {
          if (Array.isArray(p.skills)) p.skills = p.skills.map((k) => ({ ...k, updatedAt: k.updatedAt ?? k.createdAt }));
          p.tombstones = p.tombstones ?? noTombstones();
        }
        // v2 → v3: skill trees.
        if (version < 3) {
          p.nodes = p.nodes ?? [];
          p.tombstones = { ...noTombstones(), ...(p.tombstones ?? {}) };
        }
        return p as State;
      },
      partialize: ({ skills, sessions, nodes, dailyGoalMin, active, lastSkillId, celebrated, reminderHour, hapticsOn, minuteTicks, tombstones }) => ({
        skills, sessions, nodes, dailyGoalMin, active, lastSkillId, celebrated, reminderHour, hapticsOn, minuteTicks, tombstones,
      }),
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

/**
 * Rate for the "you reach 10,000 in …" projection. Uses your recent average once
 * there are at least 3 practice days in the last 14; before that, your daily goal
 * (a 2-session average would project a meaningless, discouraging year).
 */
export function projectionRate(s: Pick<State, 'skills' | 'sessions' | 'dailyGoalMin'>, skillId: string, now = Date.now()) {
  const since = now - 14 * DAY;
  const days = new Set(s.sessions.filter((x) => x.skillId === skillId && x.end >= since).map((x) => startOfDay(x.end)));
  if (days.size >= 3) return { ms: dailyRateMs(s, skillId, now), fromGoal: false };
  return { ms: s.dailyGoalMin * MINUTE, fromGoal: true };
}

/** Hours logged against one step (sessions where you picked it). */
export function nodeMs(sessions: Session[], nodeId: string) {
  let ms = 0;
  for (const x of sessions) if (x.nodeId === nodeId) ms += x.ms;
  return ms;
}
