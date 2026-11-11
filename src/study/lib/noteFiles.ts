// Exporting notes as Markdown files (one .md, or a .zip of them all) and importing
// .md / .txt files, or a .zip of them (like an exported Sprout or Obsidian vault).
import JSZip from 'jszip';
import type { Note } from '../types';
import { cleanNoteName, nameKey, uniqueNoteName } from './notes';

/** File types the importer reads as notes. */
const NOTE_FILE = /\.(md|markdown|txt)$/i;
/** What the import file picker offers. */
export const IMPORT_ACCEPT = '.md,.markdown,.txt,.zip';

export interface IncomingNote {
  name: string;
  body: string;
}

export interface ImportPlan {
  /** Notes to create, with names that don't clash with existing notes or each other. */
  create: IncomingNote[];
  /** Notes skipped because an identical note is already there. */
  unchanged: number;
}

export function noteFileName(note: Note): string {
  return `${note.name}.md`;
}

/** All notes as a .zip of .md files, which Sprout Studio, Obsidian and other editors can open. */
export async function notesToZip(notes: readonly Note[]): Promise<Blob> {
  const zip = new JSZip();
  for (const note of notes) zip.file(noteFileName(note), note.body, { date: new Date(note.updated || Date.now()) });
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** "Biology/Cells.md" → "Cells". */
function nameFromPath(path: string): string {
  const file = path.split(/[\\/]/).pop() ?? '';
  return cleanNoteName(file.replace(/\.[^.]+$/, '')) || 'Imported note';
}

/** Hidden files and the extra folder macOS adds to zips aren't notes. */
function isJunk(path: string): boolean {
  return path.split(/[\\/]/).some((part) => part.startsWith('.') || part === '__MACOSX');
}

function cleanText(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** Reads the chosen files: .md/.txt become one note each, and a .zip gives every note inside it. */
export async function readNoteFiles(files: readonly File[]): Promise<{ notes: IncomingNote[]; ignored: number }> {
  const notes: IncomingNote[] = [];
  let ignored = 0;
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(file);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || isJunk(entry.name)) continue;
        if (!NOTE_FILE.test(entry.name)) {
          ignored++;
          continue;
        }
        notes.push({ name: nameFromPath(entry.name), body: cleanText(await entry.async('string')) });
      }
    } else if (NOTE_FILE.test(file.name)) {
      notes.push({ name: nameFromPath(file.name), body: cleanText(await file.text()) });
    } else {
      ignored++;
    }
  }
  return { notes, ignored };
}

/**
 * Decides what an import adds. Importing the same export twice changes nothing: a note
 * identical to one you have is skipped, and one that differs is added as "Name 2".
 */
export function planImport(existing: readonly Note[], incoming: readonly IncomingNote[]): ImportPlan {
  const known: Note[] = [...existing];
  const create: IncomingNote[] = [];
  let unchanged = 0;
  for (const note of incoming) {
    const same = known.find((other) => nameKey(other.name) === nameKey(note.name));
    if (same && same.body.trim() === note.body.trim()) {
      unchanged++;
      continue;
    }
    const name = uniqueNoteName(known, note.name);
    known.push({ name, body: note.body, updated: 0 });
    create.push({ name, body: note.body });
  }
  return { create, unchanged };
}
