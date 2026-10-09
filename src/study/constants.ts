import type { ColorSet, Flashcard, IconPack, Settings, TabId } from './types';

export const STORAGE_KEY = 'sprout-study-v1';

export const ICON_PACKS = {
  sprout: { name: 'Sprout garden', mascot: '🌱', home: '🏡', units: '🌿', cards: '🍀', quiz: '🌼', planner: '🗓️', notes: '📝', graph: '🌳', stickies: '🗒️', bindery: '📗', custom: '🎨', done: '🌸', timer: '⏳' },
  froggy: { name: 'Froggy pond', mascot: '🐸', home: '🪷', units: '🍄', cards: '🐛', quiz: '🦋', planner: '🐌', notes: '🌾', graph: '🕸️', stickies: '🍃', bindery: '🪵', custom: '🎀', done: '⭐', timer: '🫧' },
  kitty: { name: 'Kitty cafe', mascot: '🐱', home: '🧸', units: '🐾', cards: '🧶', quiz: '🐟', planner: '🍵', notes: '🍓', graph: '✨', stickies: '💌', bindery: '📚', custom: '🎀', done: '💚', timer: '☕' },
  techy: { name: 'Cosy tech', mascot: '🤖', home: '🖥️', units: '💾', cards: '⌨️', quiz: '🖱️', planner: '📡', notes: '📎', graph: '🛰️', stickies: '📌', bindery: '💿', custom: '🔧', done: '✅', timer: '⏱️' },
  bunny: { name: 'Bunny meadow', mascot: '🐰', home: '🌷', units: '🥕', cards: '🌙', quiz: '🍡', planner: '🧺', notes: '✉️', graph: '🌌', stickies: '🎀', bindery: '📖', custom: '🌈', done: '💮', timer: '🕰️' },
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
  { id: 'stickies', label: 'Stickies' },
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
  colors: null,
  notePaper: 'plain',
  stickyLayout: 'corkboard',
  kanbanLanes: [
    { id: 'todo', name: 'To do' },
    { id: 'doing', name: 'Doing' },
    { id: 'done', name: 'Done' },
  ],
};

/** The Sprout theme's own colours (src/shared/styles/theme.css), used as a starting point for your own. */
export const SPROUT_COLORS: Record<'light' | 'dark', Omit<ColorSet, 'accent'>> = {
  light: { background: '#eef7ef', card: '#ffffff', text: '#1f3a2a', faded: '#5c7a66', border: '#cfe5d4' },
  dark: { background: '#13211a', card: '#1a2c22', text: '#e3f4e8', faded: '#9dbfa8', border: '#2e4a3a' },
};

/** Ready-made colour themes. Each one is fixed light or dark. */
export const COLOR_THEMES: readonly { id: string; label: string; colors: ColorSet }[] = [
  {
    id: 'lavender',
    label: 'Lavender',
    colors: { accent: '#8a6fd1', background: '#f3effb', card: '#ffffff', text: '#2c2540', faded: '#6e6488', border: '#ddd3f0' },
  },
  {
    id: 'peach',
    label: 'Peach',
    colors: { accent: '#e07b52', background: '#fdf1ea', card: '#fffaf6', text: '#3a2a22', faded: '#8a6d60', border: '#f2d6c6' },
  },
  {
    id: 'strawberry',
    label: 'Strawberry',
    colors: { accent: '#d9577a', background: '#fdf0f3', card: '#ffffff', text: '#3a2a2f', faded: '#8d6570', border: '#f3cfd8' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    colors: { accent: '#2f86c9', background: '#ecf4fb', card: '#ffffff', text: '#1f2c3a', faded: '#5b7186', border: '#cfe0ef' },
  },
  {
    id: 'paper',
    label: 'Paper',
    colors: { accent: '#4a4a4a', background: '#f4f2ee', card: '#ffffff', text: '#1d1d1d', faded: '#6b6b6b', border: '#dedad2' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    colors: { accent: '#8fa8ff', background: '#141826', card: '#1d2336', text: '#e6e9f5', faded: '#a3abc9', border: '#2e3653' },
  },
  {
    id: 'coffee',
    label: 'Coffee',
    colors: { accent: '#d9a36a', background: '#1f1813', card: '#2a211a', text: '#f1e6da', faded: '#bba58f', border: '#45372b' },
  },
];

export const COLOR_FIELDS: readonly { key: keyof ColorSet; label: string }[] = [
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'card', label: 'Cards' },
  { key: 'text', label: 'Text' },
  { key: 'faded', label: 'Faded text' },
  { key: 'border', label: 'Borders' },
];

export const MAX_TIMER_MINUTES = 120;
