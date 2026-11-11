import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { notesToZip, planImport, readNoteFiles } from '../../src/study/lib/noteFiles';
import type { Note } from '../../src/study/types';

const note = (name: string, body = ''): Note => ({ name, body, updated: 0 });

test('importing skips identical notes and renames ones that differ', () => {
  const existing = [note('Plants', 'Green'), note('Water', 'Wet')];
  const plan = planImport(existing, [
    { name: 'plants', body: 'Green\n' },
    { name: 'Water', body: 'Very wet' },
    { name: 'Soil', body: 'Brown' },
    { name: 'Soil', body: 'Also brown' },
  ]);
  expect(plan.unchanged).toBe(1);
  expect(plan.create).toEqual([
    { name: 'Water 2', body: 'Very wet' },
    { name: 'Soil', body: 'Brown' },
    { name: 'Soil 2', body: 'Also brown' },
  ]);
});

test('exported zips import back as the same notes', async () => {
  const notes = [note('Plants', '# Plants\n[[Water]]'), note('Water', 'Wet')];
  const zip = new File([await notesToZip(notes)], 'Sprout notes.zip');
  const { notes: read, ignored } = await readNoteFiles([zip]);
  expect(ignored).toBe(0);
  expect(read).toEqual([
    { name: 'Plants', body: '# Plants\n[[Water]]' },
    { name: 'Water', body: 'Wet' },
  ]);
  expect(planImport(notes, read)).toEqual({ create: [], unchanged: 2 });
});

test('reads .md and .txt files, notes in zip folders, and skips everything else', async () => {
  const zip = new JSZip();
  zip.file('Biology/Cells.md', 'Cells');
  zip.file('__MACOSX/Biology/._Cells.md', 'junk');
  zip.file('.obsidian/app.json', '{}');
  zip.file('picture.png', 'png');
  const files = [
    new File(['\uFEFFLine one\r\nLine two'], 'Lecture: notes.txt'),
    new File([await zip.generateAsync({ type: 'blob' })], 'vault.zip'),
    new File(['%PDF'], 'slides.pdf'),
  ];
  const { notes, ignored } = await readNoteFiles(files);
  expect(notes).toEqual([
    { name: 'Lecture notes', body: 'Line one\nLine two' },
    { name: 'Cells', body: 'Cells' },
  ]);
  expect(ignored).toBe(2);
});
