import type { Flashcard, IconPack, Settings, TabId } from './types';

export const STORAGE_KEY = 'sprout-study-v1';

export const ICON_PACKS = {
  sprout: { name: 'Sprout garden', mascot: '🌱', home: '🏡', units: '🌿', cards: '🍀', quiz: '🌼', planner: '🗓️', notes: '📝', graph: '🌳', bindery: '📗', custom: '🎨', done: '🌸', timer: '⏳' },
  froggy: { name: 'Froggy pond', mascot: '🐸', home: '🪷', units: '🍄', cards: '🐛', quiz: '🦋', planner: '🐌', notes: '🌾', graph: '🕸️', bindery: '🪵', custom: '🎀', done: '⭐', timer: '🫧' },
  kitty: { name: 'Kitty cafe', mascot: '🐱', home: '🧸', units: '🐾', cards: '🧶', quiz: '🐟', planner: '🍵', notes: '🍓', graph: '✨', bindery: '📚', custom: '🎀', done: '💚', timer: '☕' },
  techy: { name: 'Cosy tech', mascot: '🤖', home: '🖥️', units: '💾', cards: '⌨️', quiz: '🖱️', planner: '📡', notes: '📎', graph: '🛰️', bindery: '💿', custom: '🔧', done: '✅', timer: '⏱️' },
  bunny: { name: 'Bunny meadow', mascot: '🐰', home: '🌷', units: '🥕', cards: '🌙', quiz: '🍡', planner: '🧺', notes: '✉️', graph: '🌌', bindery: '📖', custom: '🌈', done: '💮', timer: '🕰️' },
} satisfies Record<string, IconPack>;
export type IconPackName = keyof typeof ICON_PACKS;

/** Accent colour for light and dark mode. */
export const ACCENTS = {
  mint: { light: '#3fae6a', dark: '#6fd394' },
  sage: { light: '#6f9a6b', dark: '#a3c79e' },
  matcha: { light: '#7aa22c', dark: '#b3d465' },
  forest: { light: '#2f7d55', dark: '#5fbf8a' },
  teal: { light: '#1f9a8a', dark: '#5fd1c2' },
  pistachio: { light: '#86b049', dark: '#c0e07f' },
} satisfies Record<string, { light: string; dark: string }>;
export type AccentName = keyof typeof ACCENTS;

export const WALLPAPERS = [
  { id: 'leaves', label: 'Leaves' },
  { id: 'circuit', label: 'Circuit' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'polka', label: 'Polka' },
  { id: 'gingham', label: 'Gingham' },
  { id: 'plain', label: 'Plain' },
  { id: 'photo', label: 'Your photo' },
] as const;
export type WallpaperId = (typeof WALLPAPERS)[number]['id'];

/** Colour of the wallpaper patterns. */
export const WALL_INK = { light: '#bfe3c8', dark: '#24402f' };

/** The side ribbon, top to bottom. Customise sits on its own at the bottom. */
export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'graph', label: 'Graph' },
  { id: 'home', label: 'Today' },
  { id: 'planner', label: 'Planner' },
  { id: 'units', label: 'Subjects' },
  { id: 'cards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'bindery', label: 'Book maker' },
  { id: 'custom', label: 'Customise' },
];

/** Opens here the first time; after that, wherever you left off. */
export const DEFAULT_TAB: TabId = 'notes';

export const SUBJECT_STATUSES = ['Not started', 'In progress', 'Reviewed', 'Complete'] as const;
export const STATUS_COMPLETE = 3;

export const TIPS = [
  'Tiny steps still grow big plants.',
  'Drink some water, little sprout.',
  'One subject at a time. You are doing great.',
  'Ask a teacher, classmate, or mentor if a question feels fuzzy.',
  'Pomodoro time? 25 minutes, then a stretch.',
];

export const DEFAULT_CARDS: readonly Flashcard[] = [
  ['Active recall', 'Try to remember an idea before looking at your notes. This strengthens learning more than rereading alone.'],
  ['Spaced practice', 'Review material over several days instead of cramming it all into one session.'],
  ['Pomodoro', 'Focus for a short, planned interval, then take a brief break before the next session.'],
  ['Interleaving', 'Mix related topics or problem types during practice to improve your ability to choose the right approach.'],
].map(([q, a], index) => ({ id: `c${index}`, q, a, known: false }));

export const DEFAULT_SETTINGS: Settings = {
  wall: 'leaves',
  icons: 'sprout',
  accent: 'mint',
  theme: 'system',
  photo: null,
  focus: 25,
  brk: 5,
};

export const MAX_TIMER_MINUTES = 120;
