import { router } from 'expo-router';
import { elapsedOf, skillTotalMs, todayMs, useStore, type Session } from '../store';
import { haptics } from './haptics';
import { cancelSessionAlerts, ensurePermission, scheduleNudge, scheduleSessionAlerts } from './notifications';
import { MINUTE } from './time';

/** Session actions that keep store, haptics and notifications in step. */

async function planAlerts() {
  const s = useStore.getState();
  const a = s.active;
  if (!a || a.runningSince == null) return cancelSessionAlerts();
  const skill = s.skills.find((k) => k.id === a.skillId);
  if (!skill) return;
  await scheduleSessionAlerts({
    skillName: skill.name,
    skillTotalMs: skillTotalMs(s, skill.id),
    todayMs: todayMs(s),
    goalMs: s.dailyGoalMin * MINUTE,
  });
}

export function startSession(skillId: string) {
  const s = useStore.getState();
  if (!s.active) {
    haptics.commit();
    s.startSession(skillId);
  }
  router.push('/timer');
  // Permission is requested here — the moment it obviously helps — not at launch.
  ensurePermission()
    .then((ok) => (ok ? planAlerts() : undefined))
    .catch(() => {});
}

export function togglePause() {
  const s = useStore.getState();
  if (!s.active) return;
  haptics.soft();
  if (s.active.runningSince != null) s.pause();
  else s.resume();
  planAlerts().catch(() => {});
}

export function finishSession(): Session | null {
  const s = useStore.getState();
  const done = s.finish();
  cancelSessionAlerts().catch(() => {});
  if (done) {
    haptics.success();
    const after = useStore.getState();
    scheduleNudge(todayMs(after), after.dailyGoalMin * MINUTE).catch(() => {});
  }
  return done;
}

export function discardSession() {
  useStore.getState().discard();
  cancelSessionAlerts().catch(() => {});
}

export const activeElapsed = () => elapsedOf(useStore.getState().active);
