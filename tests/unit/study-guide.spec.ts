import { expect, test } from '@playwright/test';
import { buildKeywordIndex, relatedPairs, topKeywords, words } from '../../src/study/lib/keywords';
import {
  buildGuideSection,
  flashcardsFromTerms,
  GUIDE_END,
  GUIDE_START,
  guideName,
  keyTerms,
  mentionsSubject,
  mergeGuide,
  notesForSubject,
} from '../../src/study/lib/studyGuide';
import type { Note, Subject } from '../../src/study/types';

const note = (name: string, body: string): Note => ({ name, body, updated: 0 });
const bio: Subject = { id: 'u1', code: 'BIO101', name: 'Cells', status: 1, pct: 0 };
const chem: Subject = { id: 'u2', code: 'CHEM200', name: 'Chemistry', status: 0, pct: 0 };

const NOTES = [
  note('Mitochondria', 'BIO101 lecture 2. The ==mitochondria==: makes energy for the cell. Mitochondria use oxygen and glucose to release energy.'),
  note('Chloroplasts', 'Plant cells have **chloroplasts** that capture light energy. Like mitochondria, chloroplasts have membranes and make energy for the cell.\nWhy do animal cells lack chloroplasts?'),
  note('Acids and bases', 'CHEM200: an ==acid== — donates protons. Bases accept protons. The pH scale measures acidity.'),
  note('Shopping', 'Buy milk, bread and a new pencil case.'),
];

test.describe('keywords', () => {
  test('ignores filler words, Markdown and plurals', () => {
    expect(words('The **Mitochondria** are in [[Cells|cells]] and they make energies!')).toEqual(['mitochondria', 'cell', 'energy']);
  });

  test('top keywords favour words that are special to a note', () => {
    const index = buildKeywordIndex(NOTES);
    expect(topKeywords(index, 'Acids and bases', 3)).toEqual(expect.arrayContaining(['acid']));
    expect(topKeywords(index, 'Mitochondria', 3)).toContain('mitochondria');
  });

  test('notes about the same things are related; unrelated ones are not', () => {
    const pairs = relatedPairs(NOTES);
    const names = pairs.map((pair) => [pair.from, pair.to].sort().join(' + '));
    expect(names).toContain('Chloroplasts + Mitochondria');
    expect(names.some((name) => name.includes('Shopping'))).toBe(false);
    const cells = pairs.find((pair) => [pair.from, pair.to].includes('Chloroplasts'))!;
    expect(cells.relation.shared).toEqual(expect.arrayContaining(['mitochondria', 'energy']));
  });
});

test.describe('class membership', () => {
  test('a note belongs to a class when it mentions the code (any spacing, or as a #tag) or the name', () => {
    expect(mentionsSubject(note('a', 'see bio 101 notes'), bio)).toBe(true);
    expect(mentionsSubject(note('a', 'tagged #BIO101'), bio)).toBe(true);
    // Names count when they're distinctive: several words, or a class without a code.
    expect(mentionsSubject(note('Intro', 'Week 1 of Cell Biology'), { code: 'BIO101', name: 'Cell Biology' })).toBe(true);
    expect(mentionsSubject(note('Cells intro', ''), { code: '', name: 'Cells' })).toBe(true);
    expect(mentionsSubject(note('Plant cells', ''), bio)).toBe(false);
    expect(mentionsSubject(note('a', 'BIO1010 is a different class'), bio)).toBe(false);
    expect(mentionsSubject(note('a', 'nothing here'), bio)).toBe(false);
  });

  test('notes that share keywords with the class come up as "might be related"', () => {
    const found = notesForSubject(bio, NOTES, [bio, chem]);
    expect(found.notes.map((each) => each.name)).toEqual(['Mitochondria']);
    expect(found.maybe.map((each) => each.note.name)).toEqual(['Chloroplasts']);
  });

  test('guide notes are named after the code and never count as class notes', () => {
    expect(guideName(bio)).toBe('BIO101 Study Guide');
    expect(guideName({ code: '', name: 'Art' })).toBe('Art Study Guide');
    const withGuide = [...NOTES, note('BIO101 Study Guide', 'BIO101 everything')];
    expect(notesForSubject(bio, withGuide, [bio]).notes.map((each) => each.name)).toEqual(['Mitochondria']);
  });
});

test.describe('the study guide', () => {
  const section = buildGuideSection({
    subject: bio,
    notes: NOTES,
    subjects: [bio, chem],
    tasks: [
      { id: 't1', title: 'Lab report', unit: 'BIO101', due: '2026-10-20', done: false },
      { id: 't2', title: 'Old', unit: 'BIO101', due: '', done: true },
      { id: 't3', title: 'Chem quiz', unit: 'CHEM200', due: '', done: false },
    ],
    cards: [{ id: 'c1', q: 'mitochondria', a: 'powerhouse', known: false }],
  });

  test('links its notes, lists key terms with meanings, tasks, cards and related notes', () => {
    expect(section).toContain('# BIO101 – Cells study guide');
    expect(section).toContain('- [[Mitochondria]] — BIO101 lecture 2.');
    expect(section).toContain('- ==mitochondria==: makes energy for the cell.');
    expect(section).toContain('- Lab report — due 2026-10-20');
    expect(section).not.toContain('Chem quiz');
    expect(section).not.toContain('Old');
    expect(section).toContain('## 🍀 Flashcards (1)');
    expect(section).toMatch(/## 🔗 Might be related\n- \[\[Chloroplasts\]\]/);
    expect(section).not.toContain('Shopping');
  });

  test('a class with no notes yet explains how to add some', () => {
    const empty = buildGuideSection({ subject: { ...bio, code: 'ART1' }, notes: NOTES, subjects: [bio], tasks: [], cards: [] });
    expect(empty).toContain('> [!tip] Getting started');
  });

  test('rebuilding keeps your own writing and ticked questions', () => {
    const first = mergeGuide(null, '# Guide\n- [ ] Why?');
    expect(first).toBe(`${GUIDE_START}\n# Guide\n- [ ] Why?\n${GUIDE_END}\n\n## ✏️ My notes\n- `);
    const edited = first.replace('- [ ] Why?', '- [x] Why?').replace('## ✏️ My notes\n- ', '## ✏️ My notes\n- my own idea');
    const rebuilt = mergeGuide(edited, '# Guide v2\n- [ ] Why?\n- [ ] How?');
    expect(rebuilt).toContain('# Guide v2');
    expect(rebuilt).toContain('- [x] Why?');
    expect(rebuilt).toContain('- [ ] How?');
    expect(rebuilt).toContain('- my own idea');
  });

  test('flashcards come from "Term: meaning" key terms, without repeats', () => {
    expect(keyTerms(NOTES).map((term) => term.term)).toEqual(['mitochondria', 'chloroplasts', 'acid']);
    expect(flashcardsFromTerms(NOTES, [{ id: 'c', q: 'Mitochondria', a: 'x', known: false }])).toEqual([{ q: 'acid', a: 'donates protons. Bases accept protons. The pH scale measures acidity.' }]);
  });
});
