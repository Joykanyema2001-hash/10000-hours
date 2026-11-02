import * as Haptics from 'expo-haptics';

/**
 * Haptics follow Apple's three rules: causality (fire on the actual event),
 * harmony (same frame as the visual change — call these synchronously in the
 * handler that starts the animation), utility (only meaningful moments).
 */
const safe = (p: Promise<void>) => p.catch(() => {});

export const haptics = {
  /** Picking from a set: chips, tabs, segmented controls. */
  select: () => safe(Haptics.selectionAsync()),
  /** Committing a primary action (start a session). */
  commit: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Soft state changes (pause / resume). */
  soft: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** A crisp tick: each minute of a running session. */
  tick: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Completion: session logged, hour reached, milestone. */
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
