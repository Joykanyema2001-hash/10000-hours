export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const GOAL_HOURS = 10_000;

/** 1234567 → "1,234,567" (Hermes-safe, no Intl dependency). */
export function withCommas(n: number): string {
  const [int, frac] = String(n).split('.');
  const out = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${out}.${frac}` : out;
}

/** 5_100_000 → "1h 25m"; 300_000 → "5m"; 0 → "0m". */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / MINUTE);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Stopwatch format: "42:18" or "1:02:05". */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${String(m).padStart(2, '0')}:${ss}`;
}

export const wholeHours = (ms: number) => Math.floor(ms / HOUR);

/** Percent of 10,000 hours with one decimal: "12.4%". */
export function percentOfGoal(ms: number): string {
  const pct = (ms / HOUR / GOAL_HOURS) * 100;
  return `${pct >= 100 ? '100' : (Math.floor(pct * 10) / 10).toFixed(1)}%`;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Today at hh:mm, or tomorrow if that time has passed. */
export function nextClockTime(hour: number, minute = 0, now = Date.now()): Date {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d;
}
