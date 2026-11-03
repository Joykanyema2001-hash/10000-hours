import type { LucideIcon } from 'lucide-react-native';
import Activity from 'lucide-react-native/icons/activity';
import Bike from 'lucide-react-native/icons/bike';
import BookOpen from 'lucide-react-native/icons/book-open';
import Brain from 'lucide-react-native/icons/brain';
import Brush from 'lucide-react-native/icons/brush';
import Calculator from 'lucide-react-native/icons/calculator';
import Camera from 'lucide-react-native/icons/camera';
import Car from 'lucide-react-native/icons/car';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import ChessKnight from 'lucide-react-native/icons/chess-knight';
import Code from 'lucide-react-native/icons/code';
import Drum from 'lucide-react-native/icons/drum';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Feather from 'lucide-react-native/icons/feather';
import Film from 'lucide-react-native/icons/film';
import Footprints from 'lucide-react-native/icons/footprints';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import Goal from 'lucide-react-native/icons/goal';
import Guitar from 'lucide-react-native/icons/guitar';
import Hammer from 'lucide-react-native/icons/hammer';
import Languages from 'lucide-react-native/icons/languages';
import Mic from 'lucide-react-native/icons/mic';
import Mountain from 'lucide-react-native/icons/mountain';
import Music from 'lucide-react-native/icons/eighth-notes';
import Palette from 'lucide-react-native/icons/palette';
import PenTool from 'lucide-react-native/icons/pen-tool';
import Piano from 'lucide-react-native/icons/piano';
import Scissors from 'lucide-react-native/icons/scissors';
import Sprout from 'lucide-react-native/icons/sprout';
import Swords from 'lucide-react-native/icons/swords';
import Target from 'lucide-react-native/icons/target';
import Terminal from 'lucide-react-native/icons/terminal';
import Trophy from 'lucide-react-native/icons/trophy';
import Volleyball from 'lucide-react-native/icons/volleyball';
import Waves from 'lucide-react-native/icons/waves-horizontal';

/** Skill icons: line icons that match the app's stroke style. Stored by key. */
export const SKILL_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  guitar: { Icon: Guitar, label: 'Guitar' },
  piano: { Icon: Piano, label: 'Piano' },
  drum: { Icon: Drum, label: 'Drums' },
  mic: { Icon: Mic, label: 'Voice' },
  music: { Icon: Music, label: 'Music' },
  languages: { Icon: Languages, label: 'Language' },
  book: { Icon: BookOpen, label: 'Reading' },
  feather: { Icon: Feather, label: 'Writing' },
  pen: { Icon: PenTool, label: 'Design' },
  brush: { Icon: Brush, label: 'Painting' },
  palette: { Icon: Palette, label: 'Art' },
  camera: { Icon: Camera, label: 'Photography' },
  film: { Icon: Film, label: 'Film' },
  code: { Icon: Code, label: 'Coding' },
  terminal: { Icon: Terminal, label: 'Terminal' },
  calculator: { Icon: Calculator, label: 'Maths' },
  brain: { Icon: Brain, label: 'Study' },
  chess: { Icon: ChessKnight, label: 'Chess' },
  gamepad: { Icon: Gamepad2, label: 'Gaming' },
  football: { Icon: Goal, label: 'Football' },
  ball: { Icon: Volleyball, label: 'Ball sport' },
  running: { Icon: Footprints, label: 'Running' },
  bike: { Icon: Bike, label: 'Cycling' },
  swim: { Icon: Waves, label: 'Swimming' },
  gym: { Icon: Dumbbell, label: 'Strength' },
  climb: { Icon: Mountain, label: 'Climbing' },
  fight: { Icon: Swords, label: 'Martial arts' },
  activity: { Icon: Activity, label: 'Fitness' },
  cooking: { Icon: ChefHat, label: 'Cooking' },
  craft: { Icon: Hammer, label: 'Making' },
  sewing: { Icon: Scissors, label: 'Sewing' },
  garden: { Icon: Sprout, label: 'Gardening' },
  driving: { Icon: Car, label: 'Driving' },
  target: { Icon: Target, label: 'Focus' },
  trophy: { Icon: Trophy, label: 'Competition' },
};

export const DEFAULT_ICON = 'target';

export const iconFor = (key?: string) => SKILL_ICONS[key ?? ''] ?? SKILL_ICONS[DEFAULT_ICON];

/** Starter ideas shown when adding a skill. */
export const SUGGESTIONS: { group: string; items: { name: string; icon: string }[] }[] = [
  { group: 'Music', items: [{ name: 'Guitar', icon: 'guitar' }, { name: 'Piano', icon: 'piano' }, { name: 'Singing', icon: 'mic' }, { name: 'Drums', icon: 'drum' }] },
  { group: 'Languages', items: [{ name: 'Spanish', icon: 'languages' }, { name: 'French', icon: 'languages' }, { name: 'Japanese', icon: 'languages' }, { name: 'Mandarin', icon: 'languages' }] },
  { group: 'Sport', items: [{ name: 'Football', icon: 'football' }, { name: 'Basketball', icon: 'ball' }, { name: 'Running', icon: 'running' }, { name: 'Swimming', icon: 'swim' }] },
  { group: 'Make', items: [{ name: 'Drawing', icon: 'pen' }, { name: 'Writing', icon: 'feather' }, { name: 'Photography', icon: 'camera' }, { name: 'Cooking', icon: 'cooking' }] },
  { group: 'Mind', items: [{ name: 'Coding', icon: 'code' }, { name: 'Chess', icon: 'chess' }, { name: 'Maths', icon: 'calculator' }, { name: 'Reading', icon: 'book' }] },
];

const KEYWORDS: [RegExp, string][] = [
  [/guitar|bass|ukulele/i, 'guitar'], [/piano|keys|keyboard/i, 'piano'], [/drum|percussion/i, 'drum'],
  [/sing|vocal|voice|rap/i, 'mic'], [/violin|cello|music|dj|produc/i, 'music'],
  [/spanish|french|german|italian|japanese|mandarin|chinese|korean|arabic|swahili|language|portuguese|russian|hindi/i, 'languages'],
  [/football|soccer/i, 'football'], [/basket|volley|tennis|rugby|cricket|netball|golf/i, 'ball'],
  [/run|marathon|jog/i, 'running'], [/cycl|bike/i, 'bike'], [/swim/i, 'swim'], [/gym|lift|strength|weights/i, 'gym'],
  [/climb|boulder|hik/i, 'climb'], [/box|karate|judo|jiu|martial|fenc/i, 'fight'], [/yoga|dance|fitness|pilates/i, 'activity'],
  [/draw|sketch|design|illustr/i, 'pen'], [/paint/i, 'brush'], [/art/i, 'palette'], [/photo/i, 'camera'], [/film|video|edit/i, 'film'],
  [/writ|poetry|journal/i, 'feather'], [/read|book/i, 'book'], [/cod|program|develop|software/i, 'code'],
  [/math|calculus|algebra/i, 'calculator'], [/study|learn|science|physics/i, 'brain'], [/chess/i, 'chess'], [/gam/i, 'gamepad'],
  [/cook|bak|chef/i, 'cooking'], [/wood|craft|build|carpent/i, 'craft'], [/sew|knit|crochet/i, 'sewing'], [/garden|plant/i, 'garden'],
  [/driv/i, 'driving'],
];

/** Best-guess icon from a skill name ("Spanish" → languages). */
export function guessIcon(name: string): string {
  for (const [re, key] of KEYWORDS) if (re.test(name)) return key;
  return DEFAULT_ICON;
}

/** SF Symbols used by the iOS widget and Live Activity (Lucide icons can't run there). */
const SF_SYMBOLS: Record<string, string> = {
  guitar: 'guitars', piano: 'pianokeys', drum: 'music.note', mic: 'music.mic', music: 'music.note',
  languages: 'character.bubble', book: 'book.fill', feather: 'pencil.line', pen: 'pencil.tip', brush: 'paintbrush.fill',
  palette: 'paintpalette.fill', camera: 'camera.fill', film: 'film', code: 'chevron.left.forwardslash.chevron.right',
  terminal: 'apple.terminal', calculator: 'function', brain: 'brain.head.profile', chess: 'crown.fill', gamepad: 'gamecontroller.fill',
  football: 'soccerball', ball: 'basketball.fill', running: 'figure.run', bike: 'bicycle', swim: 'figure.pool.swim',
  gym: 'dumbbell.fill', climb: 'mountain.2.fill', fight: 'figure.boxing', activity: 'figure.yoga', cooking: 'fork.knife',
  craft: 'hammer.fill', sewing: 'scissors', garden: 'leaf.fill', driving: 'car.fill', target: 'target', trophy: 'trophy.fill',
};

export const sfSymbolFor = (key?: string) => SF_SYMBOLS[key ?? ''] ?? 'clock.fill';
