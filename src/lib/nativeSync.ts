import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { TenkActivity } from '../../modules/tenk-activity';
import { elapsedOf, skillTotalMs, todayMs, useStore } from '../store';
import { sfSymbolFor } from './skillIcons';
import { HOUR, MINUTE, startOfDay } from './time';

/**
 * Keeps the iOS Live Activity (lock screen + Dynamic Island) and the home-screen
 * widget in step with the app. Both are no-ops in Expo Go, on Android and on web.
 */

/** What the Live Activity last did, shown in Settings so problems aren't silent. */
export const useLiveActivityStatus = create<{ status: string }>()(() => ({ status: 'Not checked yet. Start a session to test it.' }));
const setStatus = (status: string) => useLiveActivityStatus.setState({ status });

export function checkLiveActivitySupport() {
  if (Platform.OS !== 'ios') return setStatus('Only on iPhone.');
  if (!TenkActivity) return setStatus("Not in this app version. Expo Go can't show it; use your own build or TestFlight.");
  try {
    if (!TenkActivity.isSupported()) setStatus('Turned off: Settings → 10,000 Hours → Live Activities.');
    else if (!useStore.getState().active) setStatus('Ready. Start a session, then lock the phone or go home.');
  } catch (e) {
    setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const APP_GROUP = 'group.com.joykanyema.tenthousandhours';
const storage = new ExtensionStorage(APP_GROUP);

export function syncLiveActivity() {
  if (Platform.OS !== 'ios' || !TenkActivity) return checkLiveActivitySupport();
  const s = useStore.getState();
  const a = s.active;
  const skill = a ? s.skills.find((k) => k.id === a.skillId) : undefined;
  if (!a || !skill) {
    TenkActivity.end().catch(() => {});
    checkLiveActivitySupport();
    return;
  }
  if (!TenkActivity.isSupported()) return setStatus('Turned off: Settings → 10,000 Hours → Live Activities.');
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
  })
    .then(() => setStatus(`Showing ${skill.name} on the lock screen and Dynamic Island.`))
    .catch((e: unknown) => setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`));
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
