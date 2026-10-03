import fs from 'node:fs';
import { expect, test } from '../support/sprout';

test('study data goes to SQLite, never localStorage', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Planner');
  await page.getByPlaceholder('e.g. Review a chapter or finish a project').fill('Read chapter 2');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect.poll(() => sprout.query('SELECT title FROM tasks')).toEqual([{ title: 'Read chapter 2' }]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(sprout.query("SELECT value FROM preferences WHERE key = 'openTab'")).toEqual([{ value: 'planner' }]);

  await sprout.restart();
  await expect(sprout.page.getByText('Read chapter 2')).toBeVisible();
});

test("an older version's localStorage data moves into the database", async ({ sprout }) => {
  await sprout.page.evaluate(() => {
    localStorage.setItem(
      'sprout-study-v1',
      JSON.stringify({
        name: 'Jess',
        units: [{ id: 'u1', code: 'BIO', name: 'Cells', status: 1, pct: 40 }],
        cards: [],
        tasks: [{ id: 't1', title: 'Old task', unit: '', due: '', done: false }],
        settings: { wall: 'gingham' },
        stats: { day: '2026-10-01', mins: 3, sessions: 0, total: 99 },
      }),
    );
    localStorage.setItem('sprout-study-open-tab', 'units');
  });
  await sprout.restart();
  const { page } = sprout;
  await expect(page.locator('.ribbon [aria-selected="true"]')).toHaveAccessibleName('Subjects');
  await expect(page.locator('.unit h3')).toHaveText('Cells');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(sprout.query('SELECT name, total_minutes FROM profile')).toEqual([{ name: 'Jess', total_minutes: 99 }]);
  expect(sprout.query("SELECT value FROM settings WHERE key = 'wall'")).toEqual([{ value: '"gingham"' }]);
});

test('backups save to a file and restore', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await page.getByPlaceholder('Subject or topic').fill('Chemistry');
  await page.getByRole('button', { name: 'Add subject' }).click();

  await sprout.openTab('Customise');
  const backup = await sprout.download(() => page.getByRole('button', { name: 'Save backup file' }).click());
  const saved = JSON.parse(fs.readFileSync(backup, 'utf8'));
  expect(saved.units.map((unit: { name: string }) => unit.name)).toEqual(['Chemistry']);

  // Change something, then restore the backup over it.
  await sprout.openTab('Subjects');
  await page.locator('.unit', { hasText: 'Chemistry' }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.unit')).toHaveCount(0);
  await sprout.openTab('Customise');
  await page.locator('#restore').setInputFiles(backup);
  await expect(page.locator('.toast')).toHaveText('Progress restored');
  await sprout.openTab('Subjects');
  await expect(page.locator('.unit h3')).toHaveText('Chemistry');
});

test('a file that is not a backup is refused', async ({ sprout }, testInfo) => {
  const bad = testInfo.outputPath('nope.json');
  fs.writeFileSync(bad, '{"hello": "world"}');
  await sprout.openTab('Customise');
  await sprout.page.locator('#restore').setInputFiles(bad);
  await expect(sprout.page.locator('.toast')).toHaveText('That file is not a Sprout Study backup');
});
