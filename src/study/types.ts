import type { PaperStyle } from '../shared/lib/paper';
import type { StickyColor } from './lib/stationery';
import type { AccentName, IconPackName, WallpaperId } from './constants';

/*
 * Field names (units, q, a, pct, brk, …) match what earlier versions saved to
 * localStorage and to backup files, so existing progress keeps loading. The desktop app's
 * database (electron/database.cjs) maps them to clearer column names.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

/** 0 Not started · 1 In progress · 2 Reviewed · 3 Complete */
export type SubjectStatus = 0 | 1 | 2 | 3;

export interface Subject {
  id: string;
  code: string;
  name: string;
  status: SubjectStatus;
  /** Progress percentage, 0–100. */
  pct: number;
}

export interface Flashcard {
  id: string;
  /** The term. */
  q: string;
  /** Its meaning. */
  a: string;
  known: boolean;
}

export interface Task {
  id: string;
  title: string;
  /** Subject code or name, or '' for none. */
  unit: string;
  /** YYYY-MM-DD, or '' for no date. */
  due: string;
  done: boolean;
}

/** Your own colours for the whole app, as hex (#rrggbb). */
export interface ColorSet {
  accent: string;
  background: string;
  /** Panels and cards. */
  card: string;
  text: string;
  /** Secondary text, hints and labels. */
  faded: string;
  border: string;
}

export interface Settings {
  wall: WallpaperId;
  icons: IconPackName;
  accent: AccentName;
  theme: ThemePreference;
  /** Uploaded wallpaper as a JPEG data URL. */
  photo: string | null;
  /** Focus length in minutes. */
  focus: number;
  /** Break length in minutes. */
  brk: number;
  /** Your own colours, or null for the Sprout theme (which follows light/dark and `accent`). */
  colors: ColorSet | null;
  /** Paper pattern behind your notes. */
  notePaper: PaperStyle;
  /** How the Stickies tab is laid out: a free corkboard, or columns like a kanban board. */
  stickyLayout: StickyLayout;
  /** The kanban board's columns, left to right. */
  kanbanLanes: KanbanLane[];
}

export type StickyLayout = 'corkboard' | 'kanban';

/** A column on the kanban board. */
export interface KanbanLane {
  id: string;
  name: string;
}

export interface DailyStats {
  /** The day the counters below belong to (YYYY-MM-DD). */
  day: string;
  mins: number;
  sessions: number;
  /** All-time focus minutes. */
  total: number;
}

/** One Markdown note. In the desktop app each is a `<name>.md` file in the vault folder. */
export interface Note {
  /** The title, which is also the file name and what [[links]] point to. */
  name: string;
  body: string;
  /** Last edited, in milliseconds since 1970. */
  updated: number;
}

/** A sticky note on the Stickies board. */
export interface Sticky {
  id: string;
  text: string;
  color: StickyColor;
  /** Position on the corkboard, in pixels from its top-left corner. */
  x: number;
  y: number;
  /** The kanban column it's in (a KanbanLane id). '' or an unknown id means the first column. */
  lane: string;
}

export interface StudyData {
  name: string;
  course: string;
  settings: Settings;
  units: Subject[];
  cards: Flashcard[];
  tasks: Task[];
  /** Notes kept in the browser. The desktop app moves these into its vault folder. */
  pages: Note[];
  stickies: Sticky[];
  stats: DailyStats;
  quizBest: number;
}

export type TabId = 'home' | 'units' | 'cards' | 'quiz' | 'planner' | 'notes' | 'graph' | 'stickies' | 'bindery' | 'custom';

export type IconKey = TabId | 'mascot' | 'done' | 'timer';

export interface IconPack extends Record<IconKey, string> {
  name: string;
}
