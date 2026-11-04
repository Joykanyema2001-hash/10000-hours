import type { Session, Skill } from '../store';

/** What Settings → Export a backup produces. */
export type Backup = { skills: Skill[]; sessions: Session[]; dailyGoalMin?: number };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Parse pasted backup text. Tolerates text around the JSON (e.g. when pasted
 * from Notes or Messages) and drops any malformed entries rather than failing.
 */
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: "That doesn't look like a backup. Paste the whole text you exported." };
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: 'The backup text is incomplete. Make sure you copied all of it, from the first { to the last }.' };
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.skills)) return { ok: false, error: 'No skills found in that text.' };

  const skills: Skill[] = (obj.skills as Record<string, unknown>[])
    .filter((k) => isStr(k.id) && isStr(k.name))
    .map((k) => ({
      id: k.id as string,
      name: (k.name as string).trim(),
      priorMs: isNum(k.priorMs) ? Math.max(0, k.priorMs) : 0,
      createdAt: isNum(k.createdAt) ? k.createdAt : Date.now(),
      icon: isStr(k.icon) ? k.icon : undefined,
    }));
  const ids = new Set(skills.map((k) => k.id));
  const sessions: Session[] = (Array.isArray(obj.sessions) ? (obj.sessions as Record<string, unknown>[]) : [])
    .filter((x) => isStr(x.id) && isStr(x.skillId) && ids.has(x.skillId as string) && isNum(x.ms) && x.ms > 0 && isNum(x.end))
    .map((x) => ({
      id: x.id as string,
      skillId: x.skillId as string,
      ms: x.ms as number,
      end: x.end as number,
      start: isNum(x.start) ? x.start : (x.end as number) - (x.ms as number),
    }));
  if (skills.length === 0) return { ok: false, error: 'No skills found in that text.' };
  return { ok: true, backup: { skills, sessions, dailyGoalMin: isNum(obj.dailyGoalMin) ? obj.dailyGoalMin : undefined } };
}

export type MergePlan = {
  skills: Skill[];
  sessions: Session[];
  addedSkills: string[];
  matchedSkills: string[];
  addedSessions: number;
  skippedSessions: number;
};

/**
 * Merge a backup into the current data. Skills match by name (case-insensitive),
 * so importing into an app that already has "Guitar" adds the sessions to it.
 * Sessions already present (same id, or same skill + start + length) are skipped,
 * so importing the same backup twice changes nothing.
 */
export function planMerge(current: { skills: Skill[]; sessions: Session[] }, backup: Backup): MergePlan {
  const skills = [...current.skills];
  const sessions = [...current.sessions];
  const byName = new Map(skills.map((k) => [k.name.toLowerCase(), k]));
  const idMap = new Map<string, string>();
  const addedSkills: string[] = [];
  const matchedSkills: string[] = [];

  for (const k of backup.skills) {
    const existing = byName.get(k.name.toLowerCase());
    if (existing) {
      idMap.set(k.id, existing.id);
      matchedSkills.push(existing.name);
      // Keep the larger "hours before the app" guess.
      if (k.priorMs > existing.priorMs) skills[skills.indexOf(existing)] = { ...existing, priorMs: k.priorMs };
    } else {
      const id = skills.some((s) => s.id === k.id) ? `${k.id}-imported` : k.id;
      idMap.set(k.id, id);
      const added = { ...k, id };
      skills.push(added);
      byName.set(k.name.toLowerCase(), added);
      addedSkills.push(k.name);
    }
  }

  const seen = new Set(sessions.map((x) => x.id));
  const fingerprint = new Set(sessions.map((x) => `${x.skillId}|${x.start}|${x.ms}`));
  let addedSessions = 0;
  let skippedSessions = 0;
  for (const x of backup.sessions) {
    const skillId = idMap.get(x.skillId);
    if (!skillId) continue;
    const fp = `${skillId}|${x.start}|${x.ms}`;
    if (seen.has(x.id) || fingerprint.has(fp)) {
      skippedSessions++;
      continue;
    }
    sessions.push({ ...x, skillId });
    seen.add(x.id);
    fingerprint.add(fp);
    addedSessions++;
  }

  return { skills, sessions, addedSkills, matchedSkills, addedSessions, skippedSessions };
}
