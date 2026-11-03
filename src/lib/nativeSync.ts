import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import { TenkActivity } from '../../modules/tenk-activity';
import { elapsedOf, skillTotalMs, todayMs, useStore } from '../store';
import { sfSymbolFor } from './skillIcons';
import { HOUR, MINUTE, startOfDay } from './time';

/**
 * Keeps the iOS Live Activity (lock screen + Dynamic Island) and the home-screen
 * widget in step with the app. Both are no-ops in Expo Go, on Android and on web.
 */

export const APP_GROUP = 'group.com.joykanyema.tenthousandhours';
const storage = new ExtensionStorage(APP_GROUP);

export function syncLiveActivity() {
  if (Platform.OS !== 'ios' || !TenkActivity) return;
  const s = useStore.getState();
  const a = s.active;
  const skill = a ? s.skills.find((k) => k.id === a.skillId) : undefined;
  if (!a || !skill) {
    TenkActivity.end().catch(() => {});
    return;
  }
  const now = Date.now();
  const elapsed = elapsedOf(a, now);
  const total = skillTotalMs(s, skill.id, now);
  const intoHour = total % HOUR;
  TenkActivity.sync({
    skillName: skill.name,
    symbol: sfSymbolFor(skill.icon),
    startDate: now - elapsed,
    pausedElapsedMs: a.runningSince == null ? elapsed : null,
    nextHour: Math.floor(total / HOUR) + 1,
    hourStart: now - intoHour,
    hourEnd: now - intoHour + HOUR,
  }).catch(() => {});
}

export function syncWidget() {
  if (Platform.OS !== 'ios') return;
  const s = useStore.getState();
  const now = Date.now();
  const a = s.active;
  const activeSkill = a ? s.skills.find((k) => k.id === a.skillId) : undefined;
  const skills = s.skills
    .map((k) => ({ name: k.name, hours: Math.floor(skillTotalMs(s, k.id, now) / HOUR), symbol: sfSymbolFor(k.icon) }))
    .sort((x, y) => y.hours - x.hours);
  const elapsed = elapsedOf(a, now);
  const data = {
    dayStart: startOfDay(now),
    todayMs: todayMs(s, now),
    goalMs: s.dailyGoalMin * MINUTE,
    skills,
    active:
      a && activeSkill
        ? { skillName: activeSkill.name, symbol: sfSymbolFor(activeSkill.icon), startDate: now - elapsed, pausedElapsedMs: a.runningSince == null ? elapsed : null }
        : null,
  };
  try {
    storage.set('widget', JSON.stringify(data));
    ExtensionStorage.reloadWidget();
  } catch {
    // Native module missing (Expo Go): nothing to update.
  }
}

/** Sync both, at most once per tick of changes. */
let pending: ReturnType<typeof setTimeout> | null = null;
export function syncNative() {
  if (Platform.OS !== 'ios' || pending) return;
  pending = setTimeout(() => {
    pending = null;
    syncLiveActivity();
    syncWidget();
  }, 250);
}

/** Re-sync whenever skills, sessions, the running session or the goal change. */
export function startNativeSync() {
  syncNative();
  return useStore.subscribe((state, prev) => {
    if (state.active !== prev.active || state.sessions !== prev.sessions || state.skills !== prev.skills || state.dailyGoalMin !== prev.dailyGoalMin) {
      syncNative();
    }
  });
}
