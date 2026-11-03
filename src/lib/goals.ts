export const GOALS = [
  { label: '30m', min: 30, a11y: '30 minutes' },
  { label: '1h', min: 60, a11y: '1 hour' },
  { label: '2h', min: 120, a11y: '2 hours' },
  { label: '3h', min: 180, a11y: '3 hours' },
];

/** Reminder times offered in Settings (24h clock); null = off. */
export const REMINDER_HOURS: { label: string; hour: number | null }[] = [
  { label: 'Off', hour: null },
  { label: '9am', hour: 9 },
  { label: '6pm', hour: 18 },
  { label: '7pm', hour: 19 },
  { label: '9pm', hour: 21 },
];
