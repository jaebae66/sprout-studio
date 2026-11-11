import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '../support/sprout';

test.use({
  notes: {
    Plants:
      '# Plants\nPlants need [[Photosynthesis]] and [[Water|H2O]].\n\n- **bold** item\n- `code [[NotALink]]`\n\n[web](https://example.com)\n\n<img src=x onerror="document.title=\'hacked\'">',
    Photosynthesis: 'Light + [[Water]] makes sugar. See [[Plants]].',
    Water: 'Wet. Back to [[Plants#Intro]].',
  },
});

test.beforeEach(async ({ sprout }) => {
  await sprout.openTab('Notes');
});

const openNote = async (page: import('@playwright/test').Page, name: string) => {
  await page.locator('.note-list').getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.note-title')).toHaveValue(name);
};

test('lists every note in the vault, newest first', async ({ sprout }) => {
  await expect(sprout.page.locator('.note-list li')).toHaveCount(3);
});

test('reading view renders Markdown, links and backlinks safely', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Plants');
  await page.getByRole('button', { name: /Read/ }).click();
  const preview = page.locator('.note-preview');
  await expect(preview.locator('h1')).toHaveText('Plants');
  await expect(preview.locator('strong')).toHaveText('bold');
  await expect(preview.locator('a.wikilink[data-note="Water"]')).toHaveText('H2O');
  await expect(preview.locator('code')).toHaveText('code [[NotALink]]');
  // The <img onerror> is stripped before it can run.
  await expect(preview.locator('img[onerror]')).toHaveCount(0);
  await expect(page).toHaveTitle('Sprout Studio');
  await expect(page.locator('.backlinks .chip')).toHaveText(['Photosynthesis', 'Water'], { useInnerText: true });
});

test('Ctrl+E switches between writing and reading', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  await page.getByRole('button', { name: /Edit/ }).click();
  await expect(page.locator('.note-body')).toBeVisible();
  await page.keyboard.press('Control+e');
  await expect(page.locator('.note-preview')).toBeVisible();
  await page.keyboard.press('Control+e');
  await expect(page.locator('.note-body')).toBeVisible();
});

test('typing saves straight to the .md file', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  await page.getByRole('button', { name: /Edit/ }).click();
  await page.locator('.note-body .cm-content').fill('Rain falls on [[Soil]].');
  await expect.poll(() => sprout.readNote('Water')).toBe('Rain falls on [[Soil]].');
});

test('clicking a link to a missing note creates it', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  await page.getByRole('button', { name: /Edit/ }).click();
  await page.locator('.note-body .cm-content').fill('Rain falls on [[Soil]].');
  await page.getByRole('button', { name: /Read/ }).click();
  await expect(page.locator('a.wikilink.missing')).toHaveText('Soil');
  await page.locator('a.wikilink', { hasText: 'Soil' }).click();
  await expect(page.locator('.note-title')).toHaveValue('Soil');
  await expect.poll(() => sprout.readNote('Soil')).toBe('');
});

test('+ New makes an Untitled note, numbered if taken', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByRole('button', { name: '+ New' }).click();
  await expect(page.locator('.note-title')).toHaveValue('Untitled');
  await page.getByRole('button', { name: '+ New' }).click();
  await expect(page.locator('.note-title')).toHaveValue('Untitled 2');
  await expect.poll(() => fs.existsSync(path.join(sprout.vault, 'Untitled 2.md'))).toBe(true);
});

test('renaming moves the file and updates links in other notes', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  const title = page.locator('.note-title');
  await title.fill('Rain');
  await title.press('Enter');
  await expect(title).toHaveValue('Rain');
  await expect.poll(() => sprout.readNote('Rain')).toContain('[[Plants#Intro]]');
  expect(sprout.readNote('Water')).toBeNull();
  await expect.poll(() => sprout.readNote('Photosynthesis')).toBe('Light + [[Rain]] makes sugar. See [[Plants]].');
  await expect.poll(() => sprout.readNote('Plants')).toContain('[[Rain|H2O]]');
});

test('renaming to a taken name is refused', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  const title = page.locator('.note-title');
  await title.fill('plants');
  await title.press('Enter');
  await expect(page.locator('.toast')).toContainText('already a note called');
  await expect(title).toHaveValue('Water');
  expect(sprout.readNote('Water')).not.toBeNull();
});

test('cancelling delete keeps the note', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete Water' }).click();
  await expect(page.locator('.note-list li')).toHaveCount(3);
  expect(sprout.readNote('Water')).not.toBeNull();
});

test('search finds notes by their text', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByPlaceholder('Search notes…').fill('sugar');
  await expect(page.locator('.note-list li')).toHaveCount(1);
  await expect(page.locator('.note-list li')).toContainText('Photosynthesis');
  await page.getByPlaceholder('Search notes…').fill('zzz');
  await expect(page.getByText('No notes match')).toBeVisible();
});

test('notes changed outside the app show up by themselves', async ({ sprout }) => {
  fs.writeFileSync(path.join(sprout.vault, 'From Outside.md'), 'Hello [[Plants]]');
  await expect(sprout.page.locator('.note-list')).toContainText('From Outside');
});

test('notes from the old single notes box move into the vault', async ({ sprout }) => {
  const { page } = sprout;
  await page.evaluate(() => {
    // An older version's save, with one `notes` text box.
    localStorage.setItem('sprout-study-v1', JSON.stringify({ notes: 'my old notes', units: [], cards: [] }));
  });
  // Only migrates when the database is still empty, which it is: nothing has been saved yet.
  await sprout.restart();
  await expect.poll(() => sprout.readNote('Notes')).toBe('my old notes');
});

test('shows the word count, and how many words are selected', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  await page.getByRole('button', { name: /Edit/ }).click();
  const count = page.locator('.word-count');
  await expect(count).toHaveText('4 words · ~1 min read');
  await page.locator('.note-body .cm-content').fill('one two three');
  await expect(count).toHaveText('3 words · ~1 min read');
  await page.keyboard.press('Shift+Control+ArrowLeft');
  await expect(count).toHaveText('1 of 3 words');
});

test('exports all notes as a zip, and imports them back without duplicates', async ({ sprout }) => {
  const { page } = sprout;
  const zip = await sprout.download(() => page.getByRole('button', { name: /Export all/ }).click());
  expect(path.basename(zip)).toMatch(/Sprout notes \d{4}-\d{2}-\d{2}\.zip$/);
  await expect(page.locator('.toast')).toHaveText('Exported 3 notes');

  await page.locator('#import-notes').setInputFiles(zip);
  await expect(page.locator('.toast')).toHaveText('No new notes to import · 3 notes already here');
  await expect(page.locator('.note-list li')).toHaveCount(3);
});

test('imports .md and .txt files as new notes and opens the first', async ({ sprout }) => {
  const { page } = sprout;
  const folder = path.join(sprout.userData, 'to-import');
  fs.mkdirSync(folder, { recursive: true });
  const md = path.join(folder, 'Cells.md');
  const txt = path.join(folder, 'Water.txt');
  const pdf = path.join(folder, 'slides.pdf');
  fs.writeFileSync(md, '# Cells\nThey divide.');
  fs.writeFileSync(txt, 'Different water text');
  fs.writeFileSync(pdf, '%PDF');

  await page.locator('#import-notes').setInputFiles([md, txt, pdf]);
  await expect(page.locator('.toast')).toHaveText('Imported 2 notes · skipped 1 file (not .md or .txt)');
  await expect(page.locator('.note-title')).toHaveValue('Cells');
  await expect.poll(() => sprout.readNote('Cells')).toBe('# Cells\nThey divide.');
  // "Water" already exists with other text, so the import doesn't overwrite it.
  await expect.poll(() => sprout.readNote('Water 2')).toBe('Different water text');
  expect(sprout.readNote('Water')).toBe('Wet. Back to [[Plants#Intro]].');
});

test('downloads a single note as a .md file', async ({ sprout }) => {
  const { page } = sprout;
  await openNote(page, 'Water');
  const file = await sprout.download(() => page.getByRole('button', { name: 'Export Water' }).click());
  expect(path.basename(file)).toMatch(/-Water\.md$/);
  expect(fs.readFileSync(file, 'utf8')).toBe('Wet. Back to [[Plants#Intro]].');
});

test('the backup file in Customise includes the vault notes', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Customise');
  const backup = await sprout.download(() => page.getByRole('button', { name: 'Save backup file' }).click());
  const saved = JSON.parse(fs.readFileSync(backup, 'utf8'));
  expect(saved.pages.map((page: { name: string }) => page.name).sort()).toEqual(['Photosynthesis', 'Plants', 'Water']);
});
