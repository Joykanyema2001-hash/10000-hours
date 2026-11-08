/**
 * Small music-theory helpers for lesson diagrams. Chord shapes live here (not in the
 * AI's output) so the fingerings shown are always right; the coach only names chords.
 */

export type Instrument = 'guitar' | 'bass' | 'ukulele';
/** frets: one char per string, low to high ('x' muted, '0' open). fingers: same layout, '0' none. */
export type Shape = { frets: string; fingers?: string; barre?: number };

const GUITAR: Record<string, Shape> = {
  C: { frets: 'x32010', fingers: 'x32010' },
  D: { frets: 'xx0232', fingers: 'xx0132' },
  E: { frets: '022100', fingers: '023100' },
  F: { frets: '133211', fingers: '134211', barre: 1 },
  G: { frets: '320003', fingers: '210003' },
  A: { frets: 'x02220', fingers: 'x01230' },
  B: { frets: 'x24442', fingers: 'x13331', barre: 2 },
  Am: { frets: 'x02210', fingers: 'x02310' },
  Bm: { frets: 'x24432', fingers: 'x13421', barre: 2 },
  Cm: { frets: 'x35543', fingers: 'x13421', barre: 3 },
  Dm: { frets: 'xx0231', fingers: 'xx0231' },
  Em: { frets: '022000', fingers: '023000' },
  Fm: { frets: '133111', fingers: '134111', barre: 1 },
  Gm: { frets: '355333', fingers: '134111', barre: 3 },
  'F#m': { frets: '244222', fingers: '134111', barre: 2 },
  A7: { frets: 'x02020', fingers: 'x02030' },
  B7: { frets: 'x21202', fingers: 'x21304' },
  C7: { frets: 'x32310', fingers: 'x32410' },
  D7: { frets: 'xx0212', fingers: 'xx0213' },
  E7: { frets: '020100', fingers: '020100' },
  G7: { frets: '320001', fingers: '320001' },
  Am7: { frets: 'x02010', fingers: 'x02010' },
  Em7: { frets: '022030', fingers: '012040' },
  Dm7: { frets: 'xx0211', fingers: 'xx0211' },
  Cmaj7: { frets: 'x32000', fingers: 'x32000' },
  Fmaj7: { frets: 'xx3210', fingers: 'xx3210' },
  Gmaj7: { frets: '320002', fingers: '320001' },
  Cadd9: { frets: 'x32033', fingers: 'x21034' },
  Asus2: { frets: 'x02200', fingers: 'x01200' },
  Asus4: { frets: 'x02230', fingers: 'x01230' },
  Dsus2: { frets: 'xx0230', fingers: 'xx0130' },
  Dsus4: { frets: 'xx0233', fingers: 'xx0134' },
  E5: { frets: '022xxx', fingers: '012xxx' },
  A5: { frets: 'x022xx', fingers: 'x012xx' },
  G5: { frets: '355xxx', fingers: '134xxx' },
};

const UKULELE: Record<string, Shape> = {
  C: { frets: '0003', fingers: '0003' },
  D: { frets: '2220', fingers: '1230' },
  F: { frets: '2010', fingers: '2010' },
  G: { frets: '0232', fingers: '0132' },
  A: { frets: '2100', fingers: '2100' },
  Am: { frets: '2000', fingers: '2000' },
  Dm: { frets: '2210', fingers: '2310' },
  Em: { frets: '0432', fingers: '0321' },
  C7: { frets: '0001', fingers: '0001' },
  G7: { frets: '0212', fingers: '0213' },
  A7: { frets: '0100', fingers: '0100' },
  D7: { frets: '2223', fingers: '1112', barre: 2 },
};

/** Strings per instrument, low to high. */
export const STRINGS: Record<Instrument, string[]> = {
  guitar: ['E', 'A', 'D', 'G', 'B', 'e'],
  bass: ['E', 'A', 'D', 'G'],
  ukulele: ['G', 'C', 'E', 'A'],
};

const normaliseChord = (name: string) =>
  name
    .trim()
    .replace(/major$/i, '')
    .replace(/maj$/i, '')
    .replace(/minor$/i, 'm')
    .replace(/min$/i, 'm')
    .replace(/^([a-g])/, (c) => c.toUpperCase());

/**
 * The shape for a chord name, or a raw shape like "x32010" written by the coach.
 * Returns null if the name isn't known, so the diagram can say so rather than guess.
 */
export function chordShape(name: string, instrument: Instrument): Shape | null {
  const strings = STRINGS[instrument].length;
  const raw = name.trim().toLowerCase();
  if (new RegExp(`^[x0-9]{${strings}}$`).test(raw)) return { frets: raw };
  if (instrument === 'bass') return null; // bass lessons give shapes, not chord names
  const lib = instrument === 'ukulele' ? UKULELE : GUITAR;
  return lib[normaliseChord(name)] ?? null;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** "C4" → 60, "F#3" → 54, "Bb4" → 70. Octave defaults to 4. */
export function midi(note: string): number | null {
  const m = note.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d)?$/);
  if (!m) return null;
  const base = NOTE_INDEX[m[1].toUpperCase()];
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
  const octave = m[3] ? Number(m[3]) : 4;
  return (octave + 1) * 12 + base + acc;
}

const QUALITIES: [RegExp, number[]][] = [
  [/^(maj7|M7)$/, [0, 4, 7, 11]],
  [/^(m7|min7)$/, [0, 3, 7, 10]],
  [/^7$/, [0, 4, 7, 10]],
  [/^(dim|°)$/, [0, 3, 6]],
  [/^(aug|\+)$/, [0, 4, 8]],
  [/^sus2$/, [0, 2, 7]],
  [/^sus4$/, [0, 5, 7]],
  [/^(m|min|minor)$/, [0, 3, 7]],
  [/^(|maj|major)$/, [0, 4, 7]],
];

/** Notes (as MIDI numbers) of a chord name like "Am", "G7" or "Fmaj7", rooted in octave 4. */
export function chordNotes(name: string): number[] | null {
  const m = name.trim().match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!m) return null;
  const root = midi(`${m[1]}4`);
  if (root == null) return null;
  const q = QUALITIES.find(([re]) => re.test(m[2].trim()));
  return q ? q[1].map((i) => root + i) : null;
}
