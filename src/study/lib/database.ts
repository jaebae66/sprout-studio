import type { StudyData } from '../types';

/**
 * What the desktop app's preload script (electron/preload.cjs) offers the page: the
 * SQLite database in electron/database.cjs. Calls are synchronous because the app
 * reads its data before the first render.
 */
export interface DatabaseBridge {
  /** The saved data, or null if nothing has been saved yet. */
  load(): Partial<StudyData> | null;
  /** Returns false if the database refused the write. */
  save(data: StudyData): boolean;
  getPreference(key: string): string | null;
  setPreference(key: string, value: string): boolean;
  /** Called when something outside the app (like the MCP server) changes the database. Returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}

declare global {
  interface Window {
    sproutDb?: DatabaseBridge;
  }
}

/** Present only inside the desktop app. */
export const database: DatabaseBridge | undefined = window.sproutDb;
