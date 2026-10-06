import type { Page } from '@playwright/test';
import { expect, test, type Sprout } from '../support/sprout';

test.use({ notes: { Biology: 'Cells are tiny' } });

/** The writing area (CodeMirror's editable content). */
const editor = (page: Page) => page.locator('.note-body .cm-content');
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' });

/** Opens Biology in writing mode with `text` in it, and selects `part` of it (with the keyboard, as a person would). */
async function write(page: Page, text: string, part?: string) {
  await page.locator('.note-list').getByRole('button', { name: 'Biology', exact: true }).click();
  await page.getByRole('button', { name: /Edit/ }).click();
  await editor(page).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.insertText(text);
  if (part) {
    await page.keyboard.press('Control+Home');
    for (let step = 0; step < text.indexOf(part); step++) await page.keyboard.press('ArrowRight');
    for (let step = 0; step < part.length; step++) await page.keyboard.press('Shift+ArrowRight');
  }
}

/** What's saved in the note's file. */
const saved = (sprout: Sprout) => expect.poll(() => sprout.readNote('Biology'));

test.beforeEach(async ({ sprout }) => {
  await sprout.openTab('Notes');
});

test('highlighting shows the colour while writing, with the codes hidden', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'mitochondria is the powerhouse', 'mitochondria');
  await page.keyboard.press('Control+Shift+H');
  await saved(sprout).toBe('==mitochondria== is the powerhouse');

  // Move the cursor away: the word is highlighted and the == codes disappear.
  await page.keyboard.press('End');
  const highlight = editor(page).locator('.cm-hl-yellow');
  await expect(highlight).toHaveText('mitochondria');
  await expect(highlight).toHaveCSS('background-color', /255, 224, 102|1 0\.878\d* 0\.4/);
  await expect(editor(page)).toHaveText('mitochondria is the powerhouse');

  // Back inside the highlight, the codes come back so they can be edited.
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(editor(page)).toHaveText('==mitochondria== is the powerhouse');
});

test('coloured highlighters work the same way, and Read view matches', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'mitochondria is the powerhouse', 'powerhouse');
  await toolbar(page).getByRole('button', { name: 'Highlighter colour' }).click();
  await page.getByRole('menuitemradio', { name: 'Pink highlighter' }).click();
  await saved(sprout).toBe('mitochondria is the <mark class="hl-pink">powerhouse</mark>');
  // The pen remembers pink for next time.
  await expect(toolbar(page).getByRole('button', { name: 'Highlight in pink' })).toBeVisible();

  await page.keyboard.press('Home');
  await expect(editor(page).locator('.cm-hl-pink')).toHaveText('powerhouse');
  await expect(editor(page)).toHaveText('mitochondria is the powerhouse');

  await page.getByRole('button', { name: /Read/ }).click();
  await expect(page.locator('.note-preview mark.hl-pink')).toHaveText('powerhouse');
  await expect(page.locator('.note-preview mark.hl-pink')).toHaveCSS('background-color', /255, 173, 210|1 0\.678\d* 0\.823\d*/);
});

test('bold and headings look formatted while writing', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'Cells are tiny', 'tiny');
  await toolbar(page).getByRole('button', { name: 'Bold (Ctrl+B)' }).click();
  await toolbar(page).getByRole('button', { name: 'Heading' }).click();
  await saved(sprout).toBe('## Cells are **tiny**');
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('more');
  await expect(editor(page).locator('.cm-strong')).toHaveText('tiny');
  await expect(editor(page).locator('.cm-h2')).toHaveText('Cells are tiny');
});

test('checklist button, and Enter continues the list', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'Read chapter');
  await toolbar(page).getByRole('button', { name: 'Checklist (Ctrl+Shift+L)' }).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Make flashcards');
  await saved(sprout).toBe('- [ ] Read chapter\n- [ ] Make flashcards');
});

test('keyboard shortcuts work, and Ctrl+Z undoes them', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'Cells are tiny', 'Cells');
  await page.keyboard.press('Control+i');
  await saved(sprout).toBe('*Cells* are tiny');
  await page.keyboard.press('Control+z');
  await saved(sprout).toBe('Cells are tiny');
});

test('cards turn into taped stationery cards when reading', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'Remember the cell wall', 'Remember the cell wall');
  await toolbar(page).getByRole('button', { name: 'Add a card' }).click();
  await page.getByRole('menuitem', { name: /Key idea/ }).click();
  await saved(sprout).toBe('> [!important] Key idea\n> Remember the cell wall\n');

  await page.getByRole('button', { name: /Read/ }).click();
  const card = page.locator('.callout.callout-important');
  await expect(card.locator('.callout-title')).toHaveText('⭐Key idea');
  await expect(card.locator('.callout-body')).toHaveText('Remember the cell wall');
  await expect(page.locator('.note-preview blockquote')).toHaveCount(0);
});

test('checklist boxes can be ticked while reading, and that saves', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, '- [ ] Read chapter\n- [ ] Make flashcards');
  await page.getByRole('button', { name: /Read/ }).click();
  const boxes = page.locator('.note-preview input[type="checkbox"]');
  await expect(boxes).toHaveCount(2);
  await boxes.nth(1).click();
  await saved(sprout).toBe('- [ ] Read chapter\n- [x] Make flashcards');
  await expect(page.locator('.note-preview li.task.done')).toHaveText('Make flashcards');

  // And writing mode shows the ticked version straight away.
  await page.getByRole('button', { name: /Edit/ }).click();
  await expect(editor(page)).toContainText('- [x] Make flashcards');
});

test('stickers, washi tape and templates go in where you are typing', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'Done!');
  await page.keyboard.press('Control+End');
  await toolbar(page).getByRole('button', { name: 'Add a sticker' }).click();
  await page.getByRole('menuitem', { name: 'Sticker 🌸' }).click();
  await saved(sprout).toBe('Done!🌸');

  await toolbar(page).getByRole('button', { name: 'Washi tape divider' }).click();
  await saved(sprout).toBe('Done!🌸\n\n---\n');

  await toolbar(page).getByRole('button', { name: 'Start from a template' }).click();
  await page.getByRole('menuitem', { name: /Cornell notes/ }).click();
  await saved(sprout).toMatch(/# Biology\n[\s\S]*> \[!question\] Cues & questions/);

  await page.getByRole('button', { name: /Read/ }).click();
  await expect(page.locator('.note-preview hr')).toHaveCSS('height', '14px');
  await expect(page.locator('.callout-question .callout-title')).toContainText('Cues & questions');
  await expect(page.locator('.callout-summary')).toBeVisible();
});

test('menus close with Escape', async ({ sprout }) => {
  const { page } = sprout;
  await write(page, 'x');
  await toolbar(page).getByRole('button', { name: 'Add a sticker' }).click();
  await expect(page.getByRole('menu', { name: 'Add a sticker' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Add a sticker' })).toBeHidden();
});
