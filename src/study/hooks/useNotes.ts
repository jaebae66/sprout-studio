import { useCallback, useEffect, useRef, useState } from 'react';
import { findNote, nameKey, retargetLinks, uniqueNoteName } from '../lib/notes';
import { vault, type VaultBridge } from '../lib/vault';
import { useStudy } from '../StudyContext';
import type { Note } from '../types';

export interface NotesStore {
  notes: Note[];
  /** False until the vault has been read. */
  ready: boolean;
  /** The vault folder in the desktop app; null when notes live in the browser. */
  folder: string | null;
  save: (name: string, body: string) => void;
  /** Adds a note and returns its name, which gets a number on the end if `name` is taken. */
  create: (name: string, body?: string) => string;
  /** Renames a note and updates [[links]] to it. Returns false if the name is taken. */
  rename: (from: string, to: string) => boolean;
  remove: (name: string) => void;
  chooseFolder?: () => void;
  openFolder?: () => void;
}

/** The changes a rename makes: the note itself, plus every other note whose links change. */
function renamed(notes: readonly Note[], from: string, to: string): Note[] {
  const now = Date.now();
  return notes.map((note) => {
    if (nameKey(note.name) === nameKey(from)) return { ...note, name: to, body: retargetLinks(note.body, from, to) };
    const body = retargetLinks(note.body, from, to);
    return body === note.body ? note : { ...note, body, updated: now };
  });
}

function canRename(notes: readonly Note[], from: string, to: string): boolean {
  const existing = findNote(notes, to);
  return Boolean(to) && (!existing || nameKey(existing.name) === nameKey(from));
}

/** Notes saved with the rest of the study data, in the browser's storage. */
function useBrowserNotes(): NotesStore {
  const { data, update } = useStudy();
  const notes = data.pages;
  const setNotes = useCallback(
    (change: (notes: Note[]) => Note[]) => update((current) => ({ ...current, pages: change(current.pages) })),
    [update],
  );

  return {
    notes,
    ready: true,
    folder: null,
    save: (name, body) =>
      setNotes((all) => all.map((note) => (note.name === name ? { ...note, body, updated: Date.now() } : note))),
    create(name, body = '') {
      const unique = uniqueNoteName(notes, name);
      setNotes((all) => [...all, { name: unique, body, updated: Date.now() }]);
      return unique;
    },
    rename(from, to) {
      if (!canRename(notes, from, to)) return false;
      setNotes((all) => renamed(all, from, to));
      return true;
    },
    remove: (name) => setNotes((all) => all.filter((note) => note.name !== name)),
  };
}

/** Notes kept as Markdown files in the desktop app's vault folder. */
function useVaultNotes(bridge: VaultBridge): NotesStore {
  const { data, update, notify } = useStudy();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Mirrors `notes` so quick successive edits never work from a stale copy.
  const latest = useRef(notes);

  const apply = useCallback((next: Note[]) => {
    latest.current = next;
    setNotes(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [listed, path] = await Promise.all([bridge.list(), bridge.folder()]);
      apply(listed);
      setFolder(path);
    } catch {
      notify('Could not read the vault folder');
    }
    setReady(true);
  }, [bridge, apply, notify]);

  useEffect(() => {
    void reload();
    return bridge.onChange(() => void reload());
  }, [bridge, reload]);

  // Notes written in the browser version, or restored from a backup, move into the vault.
  const pending = data.pages;
  useEffect(() => {
    if (!ready || !pending.length) return;
    const moving = pending.filter((page) => !findNote(latest.current, page.name));
    void Promise.all(moving.map((page) => bridge.write(page.name, page.body)))
      .then(() => {
        update((current) => ({ ...current, pages: [] }));
        if (moving.length) notify(`Moved ${moving.length} note${moving.length === 1 ? '' : 's'} into your vault`);
        return reload();
      })
      .catch(() => notify('Could not move your notes into the vault'));
  }, [ready, pending, bridge, update, notify, reload]);

  function failed() {
    notify('Could not save to the vault folder');
  }

  return {
    notes,
    ready,
    folder,
    save(name, body) {
      apply(latest.current.map((note) => (note.name === name ? { ...note, body, updated: Date.now() } : note)));
      bridge.write(name, body).catch(failed);
    },
    create(name, body = '') {
      const unique = uniqueNoteName(latest.current, name);
      apply([...latest.current, { name: unique, body, updated: Date.now() }]);
      bridge.write(unique, body).catch(failed);
      return unique;
    },
    rename(from, to) {
      const before = latest.current;
      if (!canRename(before, from, to)) return false;
      const after = renamed(before, from, to);
      apply(after);
      void bridge
        .rename(from, to)
        .then(() =>
          Promise.all(
            after.filter((note, index) => note.body !== before[index].body).map((note) => bridge.write(note.name, note.body)),
          ),
        )
        .catch(() => {
          notify('Could not rename that note');
          return reload();
        });
      return true;
    },
    remove(name) {
      apply(latest.current.filter((note) => note.name !== name));
      bridge.remove(name).catch(failed);
    },
    chooseFolder() {
      void bridge.chooseFolder().then((path) => {
        if (path) void reload();
      });
    },
    openFolder() {
      void bridge.openFolder();
    },
  };
}

/** The user's notes: in the vault folder in the desktop app, otherwise in the browser. */
export const useNotes: () => NotesStore = vault ? useVaultNotes.bind(null, vault) : useBrowserNotes;
