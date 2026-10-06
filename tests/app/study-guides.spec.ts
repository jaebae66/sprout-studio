import type { Page } from '@playwright/test';
import { expect, test, type Sprout } from '../support/sprout';

test.use({
  notes: {
    Mitochondria: 'BIO101 lecture 2.\n\nThe ==Mitochondria==: makes energy for the cell. Mitochondria use oxygen and glucose to release energy.\n\nWhy do cells need so much energy?',
    Chloroplasts: 'Plant cells have **chloroplasts** that capture light energy. Like mitochondria, chloroplasts have membranes and make energy for the cell.',
    'Acids and bases': 'CHEM200: an ==acid== — donates protons. Bases accept protons and the pH scale measures acidity.',
    Shopping: 'Buy milk, bread and a new pencil case.',
  },
});

async function addClass(page: Page, code: string, name: string) {
  await page.getByPlaceholder('Class code, e.g. BIO101').fill(code);
  await page.getByPlaceholder('Class or topic name').fill(name);
  await page.getByRole('button', { name: 'Add subject' }).click();
}

const guide = (sprout: Sprout, code = 'BIO101') => expect.poll(() => sprout.readNote(`${code} Study Guide`), { timeout: 10_000 });

test('adding a class code makes its study guide from the notes that mention it', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await addClass(page, 'BIO101', 'Cell Biology');
  await expect(page.locator('.toast')).toContainText('with a study guide');
  await expect(page.locator('.unit', { hasText: 'Cell Biology' })).toContainText('1 note about this class');

  await guide(sprout).toContain('# BIO101 – Cell Biology study guide');
  const body = sprout.readNote('BIO101 Study Guide')!;
  expect(body).toContain('- [[Mitochondria]] — BIO101 lecture 2.');
  expect(body).toContain('- ==Mitochondria==: makes energy for the cell.');
  expect(body).toContain('- [ ] Why do cells need so much energy? *([[Mitochondria]])*');
  // Chloroplasts doesn't say BIO101, but shares its keywords.
  expect(body).toMatch(/## 🔗 Might be related\n- \[\[Chloroplasts\]\]/);
  expect(body).not.toContain('Shopping');
  expect(body).not.toContain('Acids and bases');
});

test('the guide keeps itself up to date, and keeps what you write in it', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await addClass(page, 'BIO101', 'Cell Biology');
  await guide(sprout).toContain('[[Mitochondria]]');

  // Write your own line in the guide's "My notes" part.
  await page.locator('.unit', { hasText: 'Cell Biology' }).getByRole('button', { name: '📘 Study guide' }).click();
  await expect(page.locator('.note-title')).toHaveValue('BIO101 Study Guide');
  await page.getByRole('button', { name: /Edit/ }).click();
  await page.locator('.note-body .cm-content').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('remember the lab coat');
  await guide(sprout).toContain('remember the lab coat');

  // A new note about the class appears in the guide by itself.
  await page.locator('.note-list').getByRole('button', { name: 'Chloroplasts', exact: true }).click();
  await page.getByRole('button', { name: /Edit/ }).click();
  await page.locator('.note-body .cm-content').click();
  await page.keyboard.press('Control+Home');
  await page.keyboard.type('#BIO101 ');
  await guide(sprout).toMatch(/## 📚 Notes for this class \(2\)\n- \[\[Chloroplasts\]\]/);
  expect(sprout.readNote('BIO101 Study Guide')).toContain('remember the lab coat');
  // And the planner's tasks for the class show up too.
  await sprout.openTab('Planner');
  await page.getByPlaceholder('e.g. Review a chapter or finish a project').fill('Lab report');
  await page.getByLabel('Subject', { exact: true }).selectOption('BIO101');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await guide(sprout).toContain('## 🗓️ Coming up (from your planner)\n- Lab report');
});

test('the study guide renders as a tidy page with cards and links', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await addClass(page, 'BIO101', 'Cell Biology');
  await page.locator('.unit', { hasText: 'Cell Biology' }).getByRole('button', { name: '📘 Study guide' }).click();
  await page.getByRole('button', { name: /Read/ }).click();
  const preview = page.locator('.note-preview');
  await expect(preview.locator('h1')).toHaveText('BIO101 – Cell Biology study guide 📘');
  await expect(preview.locator('a.wikilink', { hasText: 'Mitochondria' }).first()).toBeVisible();
  await expect(preview.locator('mark', { hasText: 'Mitochondria' })).toBeVisible();
  // The markers that keep the automatic part separate are invisible.
  await expect(preview).not.toContainText('study-guide:start');
});

test('key terms become flashcards (and the quiz) in one click', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await addClass(page, 'BIO101', 'Cell Biology');
  const card = page.locator('.unit', { hasText: 'Cell Biology' });
  await card.getByRole('button', { name: '🍀 Make flashcards' }).click();
  await expect(page.locator('.toast')).toContainText('Made 1 flashcard');
  await expect.poll(() => sprout.query("SELECT meaning FROM flashcards WHERE term = 'Mitochondria'")).toEqual([
    { meaning: 'makes energy for the cell. Mitochondria use oxygen and glucose to release energy.' },
  ]);
  // Doing it again doesn't make duplicates.
  await card.getByRole('button', { name: '🍀 Make flashcards' }).click();
  await expect(page.locator('.toast')).toContainText('No new key terms');
});

test('the graph links notes by shared keywords and gathers them around their class', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await addClass(page, 'BIO101', 'Cell Biology');
  await addClass(page, 'CHEM200', 'Chemistry');
  await sprout.openTab('Graph');
  const canvas = page.locator('.note-graph');
  // The guides are drawn as their classes, not as extra notes.
  await expect(canvas).toHaveAttribute('aria-label', /^Graph of 4 notes and 2 classes/);
  await expect(canvas).toHaveAttribute('data-subject-links', '2');
  expect(Number(await canvas.getAttribute('data-related'))).toBeGreaterThanOrEqual(1);

  await page.getByRole('group', { name: 'Connections to show' }).getByLabel('Shared keywords').uncheck();
  await expect(canvas).toHaveAttribute('data-related', '0');
  await page.getByRole('group', { name: 'Connections to show' }).getByLabel('Classes').uncheck();
  await expect(canvas).toHaveAttribute('aria-label', /^Graph of 4 notes and 0 classes/);
});
