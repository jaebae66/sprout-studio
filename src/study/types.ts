import type { AccentName, IconPackName, WallpaperId } from './constants';

/*
 * Field names (units, q, a, pct, brk, …) match what earlier versions saved to
 * localStorage and to backup files, so existing progress keeps loading.
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
}

export interface DailyStats {
  /** The day the counters below belong to (YYYY-MM-DD). */
  day: string;
  mins: number;
  sessions: number;
  /** All-time focus minutes. */
  total: number;
}

export interface StudyData {
  name: string;
  course: string;
  settings: Settings;
  units: Subject[];
  cards: Flashcard[];
  tasks: Task[];
  notes: string;
  stats: DailyStats;
  quizBest: number;
}

export type TabId = 'home' | 'units' | 'cards' | 'quiz' | 'planner' | 'notes' | 'custom';

export type IconKey = TabId | 'mascot' | 'done' | 'timer';

export interface IconPack extends Record<IconKey, string> {
  name: string;
}
