import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { levelAt, withArticle } from './levels';
import { formatDuration, HOUR, nextClockTime, withCommas } from './time';

/**
 * Local notifications only (they work in Expo Go and need no server):
 *  - each whole hour reached during a running session (milestone copy at 10/100/1,000…)
 *  - daily goal reached during a session
 *  - one gentle daily nudge at the time chosen in Settings when today's goal isn't met (no streak guilt —
 *    "miss a day and nothing resets")
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // While the app is open the timer screen celebrates in-app, so keep banners quiet.
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const SESSION_IDS = ['session-hour-1', 'session-hour-2', 'session-hour-3', 'session-goal'];
const NUDGE_ID = 'daily-nudge';

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Practice',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Ask only at a meaningful moment (starting the first session), never at launch. */
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

async function cancel(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

async function scheduleIn(id: string, ms: number, title: string, body: string) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data: { url: '/timer' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
  });
}

export async function scheduleSessionAlerts(opts: { skillName: string; skillTotalMs: number; todayMs: number; goalMs: number }) {
  await cancel(SESSION_IDS);
  const { skillName, skillTotalMs, todayMs, goalMs } = opts;
  const firstHour = Math.floor(skillTotalMs / HOUR) + 1;
  for (let k = 0; k < 3; k++) {
    const hour = firstHour + k;
    const level = levelAt(hour);
    const title = level ? `You're ${withArticle(level.name)}` : `Hour ${withCommas(hour)} of ${skillName}`;
    const body = level
      ? `${withCommas(hour)} hours of ${skillName}. That one's worth sharing.`
      : 'Another hour in the bank. Keep going.';
    await scheduleIn(SESSION_IDS[k], hour * HOUR - skillTotalMs, title, body);
  }
  if (todayMs < goalMs) {
    await scheduleIn('session-goal', goalMs - todayMs, 'Daily goal done', `That's ${formatDuration(goalMs)} today. Anything more is a bonus.`);
  }
}

export const cancelSessionAlerts = () => cancel(SESSION_IDS);

/** Re-plan the single evening nudge. Call on launch, on foreground and after each session. */
export async function scheduleNudge(todayMs: number, goalMs: number, hour: number | null) {
  await cancel([NUDGE_ID]);
  if (hour == null) return; // reminders turned off in Settings
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  const now = Date.now();
  const todayAt = new Date(now);
  todayAt.setHours(hour, 0, 0, 0);
  const remindToday = todayMs < goalMs && todayAt.getTime() > now;
  const when = remindToday ? todayAt : nextClockTime(hour, 0, todayAt.getTime());
  const body = remindToday
    ? `${formatDuration(goalMs - todayMs)} left of today's goal. Even ten minutes counts.`
    : 'Ten minutes today still adds up. Your hours are waiting.';
  await Notifications.scheduleNotificationAsync({
    identifier: NUDGE_ID,
    content: { title: '10,000 Hours', body, data: { url: '/' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}
