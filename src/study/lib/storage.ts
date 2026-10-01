import { DEFAULT_CARDS, DEFAULT_SETTINGS, STORAGE_KEY } from '../constants';
import type { StudyData } from '../types';
import { today } from './dates';

export function createDefaultData(): StudyData {
  return {
    name: '',
    course: '',
    settings: { ...DEFAULT_SETTINGS },
    units: [],
    cards: DEFAULT_CARDS.map((card) => ({ ...card })),
    tasks: [],
    notes: '',
    stats: { day: today(), mins: 0, sessions: 0, total: 0 },
    quizBest: 0,
  };
}

/** Fills in anything missing from older saves with defaults. */
function withDefaults(stored: Partial<StudyData>): StudyData {
  const defaults = createDefaultData();
  return { ...defaults, ...stored, settings: { ...defaults.settings, ...stored.settings } };
}

export function loadData(): StudyData {
  let stored: Partial<StudyData> | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    // Corrupt or blocked storage: start fresh.
  }

  const data = withDefaults(stored ?? {});
  // Daily counters start again each day.
  if (data.stats.day !== today()) {
    data.stats = { ...data.stats, day: today(), mins: 0, sessions: 0 };
  }
  return data;
}

/** Returns false when the browser refuses to store it (blocked or full). */
export function saveData(data: StudyData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function serializeBackup(data: StudyData): string {
  return JSON.stringify(data, null, 1);
}

/** Throws if the text isn't a Sprout Study backup. */
export function parseBackup(text: string): StudyData {
  const parsed = JSON.parse(text) as Partial<StudyData>;
  if (!parsed.units || !parsed.cards) throw new Error('Not a Sprout Study backup');
  return withDefaults(parsed);
}
