import type { Note } from '../types';

/**
 * What the desktop app's preload script (electron/preload.cjs) offers the page:
 * notes kept as `<name>.md` files in a vault folder on disk.
 */
export interface VaultBridge {
  /** The vault folder's full path. */
  folder(): Promise<string>;
  list(): Promise<Note[]>;
  write(name: string, body: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** Moves the note's file to the Recycle Bin. */
  remove(name: string): Promise<void>;
  /** Asks for a new vault folder. Resolves to the new path, or null if cancelled. */
  chooseFolder(): Promise<string | null>;
  /** Shows the vault folder in File Explorer. */
  openFolder(): Promise<void>;
  /** Called when files in the vault change outside the app. Returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}

declare global {
  interface Window {
    sproutVault?: VaultBridge;
  }
}

/** Present only inside the desktop app. */
export const vault: VaultBridge | undefined = window.sproutVault;
