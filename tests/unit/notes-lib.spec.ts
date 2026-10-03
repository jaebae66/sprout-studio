import { expect, test } from '@playwright/test';
import {
  backlinks,
  cleanNoteName,
  findNote,
  linkedNames,
  retargetLinks,
  searchNotes,
  uniqueNoteName,
} from '../../src/study/lib/notes';
import type { Note } from '../../src/study/types';

const note = (name: string, body = ''): Note => ({ name, body, updated: 0 });

test('finds every kind of [[link]], ignoring case and repeats', () => {
  const links = linkedNames('See [[Plants]], [[plants]], [[Water|H2O]] and [[Soil#Layers]]. Not [this].');
  expect([...links]).toEqual(['plants', 'water', 'soil']);
});

test('renaming retargets links but keeps headings and shown text', () => {
  const body = '[[Water]] and [[water|H2O]] and [[Water#Cycle]] but not [[Waterfall]]';
  expect(retargetLinks(body, 'Water', 'Rain')).toBe('[[Rain]] and [[Rain|H2O]] and [[Rain#Cycle]] but not [[Waterfall]]');
});

test('backlinks list the notes that link here, not the note itself', () => {
  const notes = [note('Plants', 'Need [[Water]]'), note('Water', 'Back to [[Plants]], and [[Water]]'), note('Lonely')];
  expect(backlinks(notes, 'water').map((each) => each.name)).toEqual(['Plants']);
  expect(backlinks(notes, 'Lonely')).toEqual([]);
});

test('cleans typed titles into safe file names', () => {
  expect(cleanNoteName('  My: "great" / idea?  ')).toBe('My great idea');
  expect(cleanNoteName('..hidden..')).toBe('hidden');
  expect(cleanNoteName('[[x]]#^')).toBe('x');
  expect(cleanNoteName('a'.repeat(200))).toHaveLength(120);
});

test('new names get a number when taken', () => {
  const notes = [note('Untitled'), note('untitled 2')];
  expect(uniqueNoteName(notes, 'Untitled')).toBe('Untitled 3');
  expect(uniqueNoteName(notes, '')).toBe('Untitled 3');
  expect(uniqueNoteName(notes, 'Fresh')).toBe('Fresh');
});

test('finds notes by name without caring about case', () => {
  expect(findNote([note('Photosynthesis')], 'photoSYNTHESIS')?.name).toBe('Photosynthesis');
  expect(findNote([note('A')], 'B')).toBeUndefined();
});

test('search matches names and text, with a snippet for text', () => {
  const notes = [note('Sugar facts'), note('Leaves', 'Light turns into sugar inside the leaf.')];
  const results = searchNotes(notes, 'SUGAR');
  expect(results.map((result) => result.note.name)).toEqual(['Sugar facts', 'Leaves']);
  expect(results[0].snippet).toBe('');
  expect(results[1].snippet).toContain('sugar');
  expect(searchNotes(notes, '   ')).toEqual([]);
});
