import type { Session, Skill, SkillNode } from '../store';
import { DAY, formatDuration, MINUTE, startOfDay } from './time';

export type Insight = { id: string; title: string; body: string; skillId?: string; action?: 'tree' | 'start' | 'skill' };

/**
 * Coaching insights worked out from your own data, on the phone (no AI, no network).
 * Kept encouraging: there are no streaks to lose, so nothing here scolds.
 */
export function buildInsights(skills: Skill[], sessions: Session[], nodes: SkillNode[], goalMin: number, now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const today = startOfDay(now);
  const weekAgo = today - 6 * DAY;

  const recent = sessions.filter((x) => x.end >= weekAgo);
  const days = new Set(recent.map((x) => startOfDay(x.end))).size;
  const weekMs = recent.reduce((a, x) => a + x.ms, 0);
  if (sessions.length) {
    out.push({
      id: 'week',
      title: days >= 5 ? 'A strong week' : days >= 3 ? 'Steady week' : 'Ease back in',
      body:
        days === 0
          ? 'No sessions this week yet. Ten minutes today is a perfectly good restart.'
          : `You practised on ${days} of the last 7 days, ${formatDuration(weekMs)} in total. ${days >= 5 ? 'That consistency is what compounds.' : `Your goal is ${formatDuration(goalMin * MINUTE)} a day; short sessions count.`}`,
    });
  }

  // Skill that hasn't had a session in the longest time (if over 5 days).
  let quiet: { skill: Skill; gap: number } | null = null;
  for (const k of skills) {
    const last = sessions.filter((x) => x.skillId === k.id).reduce((m, x) => Math.max(m, x.end), 0) || k.createdAt;
    const gap = Math.floor((today - startOfDay(last)) / DAY);
    if (gap > 5 && (!quiet || gap > quiet.gap)) quiet = { skill: k, gap };
  }
  if (quiet) {
    out.push({
      id: 'quiet',
      title: `${quiet.skill.name} misses you`,
      body: `No ${quiet.skill.name} for ${quiet.gap} days. A 15-minute session keeps it warm, and nothing you've built is lost.`,
      skillId: quiet.skill.id,
      action: 'start',
    });
  }

  // Steps in progress: the most-practised one, so the suggestion feels earned.
  const learning = nodes.filter((n) => n.status === 'learning');
  if (learning.length) {
    const scored = learning
      .map((n) => ({ n, ms: sessions.filter((x) => x.nodeId === n.id).reduce((a, x) => a + x.ms, 0) }))
      .sort((a, b) => b.ms - a.ms)[0];
    const skill = skills.find((k) => k.id === scored.n.skillId);
    out.push({
      id: 'learning',
      title: `Keep going on ${scored.n.title}`,
      body: scored.ms
        ? `${formatDuration(scored.ms)} logged on it so far${skill ? ` in ${skill.name}` : ''}. When it feels easy, mark it mastered and branch off it.`
        : `It's marked as learning${skill ? ` in ${skill.name}` : ''}. Pick it when you finish your next session to track time on it.`,
      skillId: scored.n.skillId,
      action: 'tree',
    });
  }

  // A skill with hours but no tree yet.
  const untreed = skills.find((k) => !nodes.some((n) => n.skillId === k.id) && sessions.some((x) => x.skillId === k.id));
  if (untreed) {
    out.push({
      id: 'map',
      title: `Map out ${untreed.name}`,
      body: `Break ${untreed.name} into the things you're learning. You'll see what you've built, not just the hours.`,
      skillId: untreed.id,
      action: 'tree',
    });
  }
  return out;
}
