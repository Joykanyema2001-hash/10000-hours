import { useEffect, useRef } from 'react';
import { useNow } from '../lib/hooks';
import { latestLevel } from '../lib/levels';
import { celebrate, notify } from '../lib/notify';
import { formatDuration, HOUR, MINUTE, withCommas } from '../lib/time';
import { skillTotalMs, todayMs, useStore } from '../store';

/**
 * Watches progress while the app is open and raises the branded pop-ups:
 *  - a banner each new whole hour of the running skill,
 *  - a banner when today's goal is reached,
 *  - the milestone celebration when a skill reaches a new level (once per level).
 * The matching iOS notifications are scheduled separately and only appear when the app is closed.
 */
export function SessionWatcher() {
  const skills = useStore((s) => s.skills);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const goalMin = useStore((s) => s.dailyGoalMin);
  const celebrated = useStore((s) => s.celebrated);
  const markCelebrated = useStore((s) => s.markCelebrated);
  const now = useNow(1000, active?.runningSince != null);

  const prevHours = useRef<{ id: string; hours: number } | null>(null);
  const prevToday = useRef<number | null>(null);

  const state = { skills, sessions, active };
  const goalMs = goalMin * MINUTE;
  const today = todayMs(state, now);

  // Hour banners for the running skill.
  const activeSkill = active ? skills.find((k) => k.id === active.skillId) : undefined;
  const activeHours = activeSkill ? Math.floor(skillTotalMs(state, activeSkill.id, now) / HOUR) : null;
  useEffect(() => {
    if (!activeSkill || activeHours == null) {
      prevHours.current = null;
      return;
    }
    const prev = prevHours.current;
    if (prev && prev.id === activeSkill.id && activeHours > prev.hours && latestLevel(activeHours)?.hours !== activeHours) {
      notify({ kind: 'hour', title: `Hour ${withCommas(activeHours)} of ${activeSkill.name}`, body: 'Another hour in the bank. Keep going.', href: '/timer' });
    }
    prevHours.current = { id: activeSkill.id, hours: activeHours };
  }, [activeSkill?.id, activeHours]);

  // Daily goal banner (only when it's crossed while you watch, not on launch).
  useEffect(() => {
    const prev = prevToday.current;
    if (prev != null && prev < goalMs && today >= goalMs) {
      notify({ kind: 'goal', title: 'Daily goal done', body: `${formatDuration(goalMs)} today. Anything more is a bonus.` });
    }
    prevToday.current = today;
  }, [today >= goalMs]);

  // Milestone celebrations, once per level per skill.
  useEffect(() => {
    for (const k of skills) {
      const level = latestLevel(Math.floor(skillTotalMs(state, k.id, now) / HOUR));
      const seen = celebrated[k.id];
      if (seen === undefined) {
        markCelebrated(k.id, level?.hours ?? 0); // data from before this feature: don't replay old levels
      } else if (level && level.hours > seen) {
        markCelebrated(k.id, level.hours);
        celebrate({ level, skillName: k.name, skillId: k.id });
        break;
      }
    }
  }, [now, skills, sessions, celebrated]);

  return null;
}
