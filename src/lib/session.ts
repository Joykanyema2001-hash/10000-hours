import { router } from 'expo-router';
import { Alert } from 'react-native';
import { elapsedOf, skillTotalMs, todayMs, useStore, type Session } from '../store';
import { haptics } from './haptics';
import { cancelSessionAlerts, ensurePermission, scheduleNudge, scheduleSessionAlerts } from './notifications';
import { notify } from './notify';
import { formatClock, formatDuration, HOUR, MINUTE, withCommas } from './time';

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

function begin(skillId: string) {
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

/**
 * Start (or reopen) a session. Only one session runs at a time, so if another
 * skill's session is open, ask what to do instead of silently doing nothing.
 */
export function startSession(skillId: string) {
  const s = useStore.getState();
  const a = s.active;
  if (!a || a.skillId === skillId) return begin(skillId);

  const other = s.skills.find((k) => k.id === a.skillId);
  const target = s.skills.find((k) => k.id === skillId);
  if (!other) {
    // Orphaned session (its skill no longer exists): clear it and carry on.
    discardSession();
    return begin(skillId);
  }
  const elapsed = elapsedOf(a);
  const state = a.runningSince != null ? 'running' : 'paused';
  haptics.warning();
  Alert.alert(
    `${other.name} session is ${state}`,
    `${formatClock(elapsed)} so far. Only one session can run at a time.`,
    [
      {
        text: elapsed >= MINUTE ? `Save it and start ${target?.name ?? 'this'}` : `Discard it and start ${target?.name ?? 'this'}`,
        onPress: () => {
          if (elapsed >= MINUTE) finishSession();
          else discardSession();
          begin(skillId);
        },
      },
      { text: `Open ${other.name} timer`, onPress: () => router.push('/timer') },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
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
    const after = useStore.getState();
    const skill = after.skills.find((k) => k.id === done.skillId);
    if (skill) {
      // Banner carries the success haptic on the same frame it appears.
      notify({ kind: 'logged', title: `Logged ${formatDuration(done.ms)} of ${skill.name}`, body: `${withCommas(Math.floor(skillTotalMs(after, skill.id) / HOUR))} hours in total.` });
    }
    scheduleNudge(todayMs(after), after.dailyGoalMin * MINUTE, after.reminderHour).catch(() => {});
  }
  return done;
}

export function discardSession() {
  useStore.getState().discard();
  cancelSessionAlerts().catch(() => {});
}

export const activeElapsed = () => elapsedOf(useStore.getState().active);

/** Re-plan the daily reminder after settings or data change. */
export function replanNudge() {
  const s = useStore.getState();
  scheduleNudge(todayMs(s), s.dailyGoalMin * MINUTE, s.skills.length ? s.reminderHour : null).catch(() => {});
}
