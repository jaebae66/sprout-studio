import { DEFAULT_CARDS, DEFAULT_SETTINGS, STORAGE_KEY } from '../constants';
import type { Note, StudyData, TabId } from '../types';
import { database } from './database';
import { today } from './dates';

export function createDefaultData(): StudyData {
  return {
    name: '',
    course: '',
    settings: { ...DEFAULT_SETTINGS },
    units: [],
    cards: DEFAULT_CARDS.map((card) => ({ ...card })),
    tasks: [],
    pages: [],
    stickies: [],
    stats: { day: today(), mins: 0, sessions: 0, total: 0 },
    quizBest: 0,
  };
}

/** Saves from before multiple notes had one `notes` text box instead of `pages`. */
type StoredData = Partial<StudyData> & { notes?: string };

/** Fills in anything missing from older saves with defaults. */
function withDefaults({ notes, ...stored }: StoredData): StudyData {
  const defaults = createDefaultData();
  const pages: Note[] = stored.pages ?? (notes?.trim() ? [{ name: 'Notes', body: notes, updated: Date.now() }] : []);
  return { ...defaults, ...stored, pages, settings: { ...defaults.settings, ...stored.settings } };
}

/* ---------- Where things are kept ---------- */

/** Small UI memories, stored next to the data. */
const PREFERENCE_KEYS = {
  openTab: 'sprout-study-open-tab',
  openNote: 'sprout-study-open-note',
  welcomed: 'sprout-study-welcomed',
} as const;
type Preference = keyof typeof PREFERENCE_KEYS;

interface Store {
  loadData(): StoredData | null;
  /** Returns false when the save was refused. */
  saveData(data: StudyData): boolean;
  get(preference: Preference): string | null;
  set(preference: Preference, value: string): void;
}

/** The browser version: localStorage, which may be blocked or full. */
const browserStore: Store = {
  loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    } catch {
      return null; // Corrupt or blocked storage: start fresh.
    }
  },
  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
  get(preference) {
    try {
      return localStorage.getItem(PREFERENCE_KEYS[preference]);
    } catch {
      return null;
    }
  },
  set(preference, value) {
    try {
      localStorage.setItem(PREFERENCE_KEYS[preference], value);
    } catch {
      // Blocked: it just won't be remembered.
    }
  },
};

/**
 * The desktop app: the SQLite database. The first time it runs, anything an earlier
 * version left in localStorage moves into the database.
 */
function databaseStore(db: NonNullable<typeof database>): Store {
  return {
    loadData() {
      const saved = db.load();
      if (saved) return saved;
      const older = browserStore.loadData();
      if (older && db.save(withDefaults(older))) {
        for (const preference of Object.keys(PREFERENCE_KEYS) as Preference[]) {
          const value = browserStore.get(preference);
          if (value !== null) db.setPreference(preference, value);
        }
        try {
          [STORAGE_KEY, ...Object.values(PREFERENCE_KEYS)].forEach((key) => localStorage.removeItem(key));
        } catch {
          // Nothing to tidy up.
        }
      }
      return older;
    },
    saveData: (data) => db.save(data),
    get: (preference) => db.getPreference(preference),
    set: (preference, value) => void db.setPreference(preference, value),
  };
}

const store: Store = database ? databaseStore(database) : browserStore;

/* ---------- Study data ---------- */

/** Calls `listener` when the saved data changes outside the app. A no-op in the browser. */
export function onOutsideChange(listener: () => void): () => void {
  return database ? database.onChange(listener) : () => {};
}

export function loadData(): StudyData {
  const data = withDefaults(store.loadData() ?? {});
  // Daily counters start again each day.
  if (data.stats.day !== today()) {
    data.stats = { ...data.stats, day: today(), mins: 0, sessions: 0 };
  }
  return data;
}

/** Returns false when the save was refused (browser storage blocked or full, or a database error). */
export function saveData(data: StudyData): boolean {
  return store.saveData(data);
}

/* ---------- Preferences ---------- */

export function loadOpenTab(): string | null {
  return store.get('openTab');
}

export function saveOpenTab(tab: TabId): void {
  store.set('openTab', tab);
}

/** Which note was open, so Notes reopens it (and Graph can pick one to open). */
export function loadOpenNote(): string | null {
  return store.get('openNote');
}

export function saveOpenNote(name: string): void {
  store.set('openNote', name);
}

/** Whether the welcome note has been made once already, so deleting it doesn't bring it back. */
export function wasWelcomed(): boolean {
  return store.get('welcomed') === '1';
}

export function markWelcomed(): void {
  store.set('welcomed', '1');
}

/* ---------- Backups ---------- */

export function serializeBackup(data: StudyData): string {
  return JSON.stringify(data, null, 1);
}

/** Throws if the text isn't a Sprout Study backup. */
export function parseBackup(text: string): StudyData {
  const parsed = JSON.parse(text) as StoredData;
  if (!parsed.units || !parsed.cards) throw new Error('Not a Sprout Study backup');
  return withDefaults(parsed);
}
