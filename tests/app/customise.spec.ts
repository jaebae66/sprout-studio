import type { Page } from '@playwright/test';
import { expect, test } from '../support/sprout';

const rootColor = (page: Page, name: string) =>
  page.evaluate((property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(), name);

test.beforeEach(async ({ sprout }) => {
  await sprout.openTab('Customise');
});

test('a ready-made theme recolours the whole app', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('.theme-option', { hasText: 'Midnight' }).click();
  await expect(page.locator('.theme-option[aria-pressed="true"]')).toHaveText('Midnight');
  await expect.poll(() => rootColor(page, '--bg')).toBe('#141826');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(20, 24, 38)');
  // Other tabs and the ribbon follow too.
  await sprout.openTab('Planner');
  await expect(page.locator('.ribbon-tab[aria-selected="true"]')).toHaveCSS('color', 'rgb(230, 233, 245)');
  // The Sprout-only options hide while a theme is on.
  await sprout.openTab('Customise');
  await expect(page.getByLabel('Light or dark')).toBeHidden();
});

test('picking your own colour makes a custom set, kept after restarting', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('.theme-option', { hasText: 'Ocean' }).click();
  await page.locator('.color-field', { hasText: 'Accent' }).locator('input').fill('#ff66aa');
  await expect(page.locator('.theme-option[aria-pressed="true"]')).toHaveText('Your own');
  await expect.poll(() => rootColor(page, '--accent')).toBe('#ff66aa');

  const saved = JSON.parse(sprout.query<{ value: string }>("SELECT value FROM settings WHERE key = 'colors'")[0].value);
  expect(saved).toMatchObject({ accent: '#ff66aa', background: '#ecf4fb' });

  await sprout.restart();
  await expect.poll(() => rootColor(sprout.page, '--accent')).toBe('#ff66aa');
});

test('back to Sprout removes every colour override', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('.theme-option', { hasText: 'Coffee' }).click();
  await page.getByRole('button', { name: 'Back to the Sprout colours' }).click();
  await expect(page.locator('.theme-option[aria-pressed="true"]')).toHaveText('Sprout');
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--bg'))).toBe('');
  await expect(page.getByLabel('Light or dark')).toBeVisible();
});

test('Sprout light/dark and accent still work', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByLabel('Light or dark').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => rootColor(page, '--bg')).toBe('#13211a');
  await page.locator('.dot[aria-label="teal"]').click();
  await expect.poll(() => rootColor(page, '--accent-d')).toBe('#5fd1c2');
});

test('note paper shows behind notes while writing and reading', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('.segmented button', { hasText: 'Graph' }).click();
  await expect.poll(() => sprout.query("SELECT value FROM settings WHERE key = 'notePaper'")).toEqual([{ value: '"graph"' }]);
  await sprout.openTab('Notes');
  await page.getByRole('button', { name: /Edit/ }).click();
  await expect(page.locator('.note-body')).toHaveCSS('background-image', /linear-gradient/);
  await page.getByRole('button', { name: /Read/ }).click();
  await expect(page.locator('.note-preview')).toHaveCSS('background-image', /linear-gradient/);
});

test('wallpaper and icon pack change', async ({ sprout }) => {
  const { page } = sprout;
  await page.locator('.sw', { hasText: 'Polka' }).click();
  await expect(page.locator('.wallpaper')).toHaveCSS('background-image', /radial-gradient/);
  await page.locator('.pack', { hasText: 'Froggy pond' }).click();
  await expect(page.locator('.ribbon-tab', { hasText: 'Notes' }).locator('span')).toHaveText('🌾');
});
