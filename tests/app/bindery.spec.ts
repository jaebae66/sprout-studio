import JSZip from 'jszip';
import fs from 'node:fs';
import { expect, test } from '../support/sprout';

const STORY = 'Chapter 1\nOnce upon a time there was a sprout.\n\nChapter 2\nIt grew **very** tall.';

test.beforeEach(async ({ sprout }) => {
  await sprout.openTab('Book maker');
});

async function addStory(page: import('@playwright/test').Page) {
  await page.getByText('Paste text instead').click();
  await page.getByPlaceholder(/Paste a whole story here/).fill(STORY);
  await page.getByRole('button', { name: 'Add as chapters' }).click();
  await expect(page.locator('.bindery .ch')).toHaveCount(2);
}

test('pasted text splits into chapters', async ({ sprout }) => {
  await addStory(sprout.page);
  await expect(sprout.page.locator('.bindery .mono').first()).toContainText('2 ch');
});

/** The Pages section (the cover designer above it has its own colour dots). */
const pages = (page: import('@playwright/test').Page) => page.locator('.bindery .coverbox', { has: page.locator('.page-preview') });

test('the page designer previews paper, colour and font', async ({ sprout }) => {
  const { page } = sprout;
  const preview = page.locator('.page-preview');
  await expect(preview).toBeVisible();
  await pages(page).locator('.seg button', { hasText: /^Dotted$/ }).click();
  await pages(page).locator('.dot[aria-label="cream"]').click();
  await pages(page).locator('.seg button', { hasText: /^Handwritten$/ }).click();
  await expect(preview).toHaveCSS('background-color', 'rgb(251, 245, 230)');
  await expect(preview).toHaveCSS('background-image', /radial-gradient/);
  await expect(preview).toHaveCSS('font-family', /Comic Sans MS/);
});

test('a half-made book survives switching tabs', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('#book-title').fill('My Plant Book');
  await addStory(page);
  await sprout.openTab('Notes');
  await sprout.openTab('Book maker');
  await expect(page.locator('#book-title')).toHaveValue('My Plant Book');
  await expect(page.locator('.bindery .ch')).toHaveCount(2);
});

test('makes a real EPUB with the chosen pages, then reads it back', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('#book-title').fill('My Plant Book');
  await page.locator('#book-author').fill('Jess');
  await addStory(page);
  await pages(page).locator('.seg button', { hasText: /^Lined$/ }).click();
  await pages(page).locator('.dot[aria-label="night"]').click();

  const file = await sprout.download(() => page.getByRole('button', { name: /Make my EPUB/ }).click());
  expect(file).toMatch(/My Plant Book\.epub$/);

  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');
  const css = await zip.file('OEBPS/style.css')!.async('string');
  expect(css).toContain('background-color:#1b1f24');
  expect(css).toContain('linear-gradient(to bottom, transparent 94%');
  const opf = await zip.file('OEBPS/content.opf')!.async('string');
  expect(opf).toContain('<dc:title>My Plant Book</dc:title>');
  expect(opf).toContain('Jess');
  expect(await zip.file('OEBPS/ch2.xhtml')!.async('string')).toContain('<strong>very</strong>');
  expect(zip.file('OEBPS/images/cover.jpg')).not.toBeNull();

  // The converter opens the book it just made.
  await page.locator('.bindery input[type="file"][accept*="epub"]').setInputFiles(file);
  await expect(page.locator('.bindery .result-title')).toHaveText('My Plant Book');
  const text = await sprout.download(() => page.getByRole('button', { name: /Markdown/ }).click());
  expect(fs.readFileSync(text, 'utf8')).toContain('Once upon a time there was a sprout.');
});

test('a broken file is turned away kindly', async ({ sprout }, testInfo) => {
  const bad = testInfo.outputPath('not-a-book.epub');
  fs.writeFileSync(bad, 'definitely not a zip');
  await sprout.page.locator('.bindery input[type="file"][accept*="epub"]').setInputFiles(bad);
  await expect(sprout.page.locator('.bindery .error')).toContainText('doesn’t look like a working EPUB');
});
