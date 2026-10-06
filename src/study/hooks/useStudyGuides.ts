import { useEffect } from 'react';
import { newId } from '../lib/list';
import { findNote } from '../lib/notes';
import { buildGuideSection, flashcardsFromTerms, guideName, mergeGuide, notesForSubject } from '../lib/studyGuide';
import { useStudy } from '../StudyContext';
import type { Note, StudyData, Subject } from '../types';
import { useNotes } from './useNotes';

/** How long notes must sit still before guides catch up, so typing doesn't rewrite them every keystroke. */
const SETTLE_MS = 800;

/** A class's whole guide note, rebuilt from the notes, keeping anything written outside its automatic part. */
function guideBody(subject: Subject, existing: string | null, notes: readonly Note[], data: StudyData): string {
  const section = buildGuideSection({ subject, notes, subjects: data.units, tasks: data.tasks, cards: data.cards });
  return mergeGuide(existing, section);
}

/** Study guides for each class, and flashcards made from their key terms. */
export function useStudyGuides() {
  const { data, update } = useStudy();
  const notes = useNotes();

  return {
    /** Makes (or refreshes) a class's study guide and returns its note name. */
    ensure(subject: Subject): string {
      const name = guideName(subject);
      const existing = findNote(notes.notes, name);
      if (!existing) return notes.create(name, guideBody(subject, null, notes.notes, data));
      const next = guideBody(subject, existing.body, notes.notes, data);
      if (next !== existing.body) notes.save(existing.name, next);
      return existing.name;
    },

    /** Turns "==Term==: meaning" key terms in a class's notes into new flashcards. Returns how many. */
    makeFlashcards(subject: Subject): number {
      const members = notesForSubject(subject, notes.notes, data.units).notes;
      const fresh = flashcardsFromTerms(members, data.cards);
      if (fresh.length) {
        update((current) => ({
          ...current,
          cards: [...current.cards, ...fresh.map((card, index) => ({ id: `${newId('c')}-${index}`, ...card, known: false }))],
        }));
      }
      return fresh.length;
    },
  };
}

/** Rendered once in the app: keeps every existing study guide up to date as notes, tasks and cards change. */
export function StudyGuideKeeper() {
  const { data } = useStudy();
  const notes = useNotes();

  useEffect(() => {
    if (!notes.ready) return;
    const timer = setTimeout(() => {
      for (const subject of data.units) {
        const existing = findNote(notes.notes, guideName(subject));
        if (!existing) continue;
        const next = guideBody(subject, existing.body, notes.notes, data);
        if (next !== existing.body) notes.save(existing.name, next);
      }
    }, SETTLE_MS);
    return () => clearTimeout(timer);
    // `notes` changes identity every render; its list and readiness are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.ready, notes.notes, data]);

  return null;
}
