export type Level = { name: string; hours: number };

export const LEVELS: Level[] = [
  { name: 'Starter', hours: 10 },
  { name: 'Beginner', hours: 100 },
  { name: 'Practitioner', hours: 1_000 },
  { name: 'Skilled', hours: 2_500 },
  { name: 'Expert', hours: 5_000 },
  { name: 'Master', hours: 10_000 },
];

/** Highest level reached for a number of whole hours, or null. */
export function latestLevel(hours: number): Level | null {
  let found: Level | null = null;
  for (const l of LEVELS) if (hours >= l.hours) found = l;
  return found;
}

export function nextLevel(hours: number): Level | null {
  return LEVELS.find((l) => hours < l.hours) ?? null;
}

export function levelAt(hours: number): Level | undefined {
  return LEVELS.find((l) => l.hours === hours);
}

/** "a Starter" / "an Expert". */
export const withArticle = (name: string) => `${/^[AEIOU]/i.test(name) ? 'an' : 'a'} ${name}`;
