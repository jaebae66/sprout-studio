import type { Locator } from '@playwright/test';
import { expect, test } from '../support/sprout';

/** What's typed in each of these boxes, in order. */
const values = (boxes: Locator) => boxes.evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value));

test.beforeEach(async ({ sprout }) => {
  await sprout.openTab('Stickies');
});

test('starts with an empty corkboard', async ({ sprout }) => {
  await expect(sprout.page.getByText('Your board is empty.')).toBeVisible();
});

test('adds a sticky ready to type on, and saves what you write', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByRole('button', { name: 'New pink sticky' }).click();
  const text = page.getByRole('textbox', { name: 'Sticky note text' });
  await expect(text).toBeFocused();
  await page.keyboard.type('Revise cells');
  await expect.poll(() => sprout.query('SELECT text, color FROM sticky_notes')).toEqual([{ text: 'Revise cells', color: 'pink' }]);

  await sprout.restart();
  await sprout.openTab('Stickies');
  await expect(sprout.page.getByRole('textbox', { name: 'Sticky note text' })).toHaveValue('Revise cells');
});

test('new stickies go into free spaces, not on top of each other', async ({ sprout }) => {
  const { page } = sprout;
  for (const color of ['yellow', 'mint', 'blue']) await page.getByRole('button', { name: `New ${color} sticky` }).click();
  const spots = sprout.query<{ x: number; y: number }>('SELECT x, y FROM sticky_notes ORDER BY position');
  expect(new Set(spots.map(({ x, y }) => `${x},${y}`)).size).toBe(3);
});

test('dragging by the top strip moves it, and it stays there', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByRole('button', { name: 'New yellow sticky' }).click();
  const strip = page.locator('.sticky-strip');
  const start = (await strip.boundingBox())!;
  await page.mouse.move(start.x + 20, start.y + 8);
  await page.mouse.down();
  await page.mouse.move(start.x + 220, start.y + 160, { steps: 8 });
  await page.mouse.up();
  const [moved] = sprout.query<{ x: number; y: number }>('SELECT x, y FROM sticky_notes');
  expect(moved.x).toBeGreaterThan(180);
  expect(moved.y).toBeGreaterThan(140);

  await sprout.restart();
  await sprout.openTab('Stickies');
  await expect(sprout.page.locator('.sticky')).toHaveCSS('left', `${moved.x}px`);
});

test('changes colour, tidies up, and turns into a full note', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByRole('button', { name: 'New yellow sticky' }).click();
  await page.keyboard.type('Photosynthesis\nLight makes sugar');
  const sticky = page.locator('.sticky');
  await sticky.hover();
  await sticky.getByRole('button', { name: 'Change colour' }).click();
  await expect.poll(() => sprout.query('SELECT color FROM sticky_notes')).toEqual([{ color: 'pink' }]);

  await sticky.getByRole('button', { name: 'Save as a note' }).click();
  await expect(page.locator('.toast')).toContainText('Saved as the note “Photosynthesis”');
  await expect.poll(() => sprout.readNote('Photosynthesis')).toBe('Photosynthesis\nLight makes sugar');

  await page.getByRole('button', { name: 'Tidy up' }).click();
  await expect.poll(() => sprout.query('SELECT x, y FROM sticky_notes')).toEqual([{ x: 22, y: 22 }]);
});

test('throwing away asks first when the sticky has writing on it', async ({ sprout }) => {
  const { page } = sprout;
  await page.getByRole('button', { name: 'New blue sticky' }).click();
  await page.keyboard.type('Keep me?');
  const sticky = page.locator('.sticky');
  await sticky.hover();
  page.once('dialog', (dialog) => dialog.dismiss());
  await sticky.getByRole('button', { name: 'Throw away' }).click();
  await expect(sticky).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await sticky.getByRole('button', { name: 'Throw away' }).click();
  await expect(page.locator('.sticky')).toHaveCount(0);
  await expect.poll(() => sprout.query('SELECT * FROM sticky_notes')).toEqual([]);
});

test.describe('kanban layout', () => {
  test.beforeEach(async ({ sprout }) => {
    await sprout.page.getByRole('button', { name: '🗂️ Kanban' }).click();
  });

  test('shows To do, Doing and Done, and remembers the layout', async ({ sprout }) => {
    const { page } = sprout;
    await expect.poll(() => values(page.getByRole('textbox', { name: 'Column name' }))).toEqual(['To do', 'Doing', 'Done']);
    await expect.poll(() => sprout.query("SELECT value FROM settings WHERE key = 'stickyLayout'")).toEqual([{ value: '"kanban"' }]);

    await sprout.restart();
    await sprout.openTab('Stickies');
    await expect(sprout.page.getByRole('textbox', { name: 'Column name' })).toHaveCount(3);
  });

  test('adds a sticky to a column and moves it along with the arrows', async ({ sprout }) => {
    const { page } = sprout;
    await page.getByRole('button', { name: 'Add a sticky to Doing' }).click();
    await page.keyboard.type('Essay plan');
    await expect.poll(() => sprout.query('SELECT text, lane FROM sticky_notes')).toEqual([{ text: 'Essay plan', lane: 'doing' }]);

    const sticky = page.locator('.sticky');
    await sticky.hover();
    await sticky.getByRole('button', { name: 'Move right' }).click();
    await expect(page.getByRole('region', { name: 'Done column' }).locator('.sticky')).toHaveCount(1);
    await expect.poll(() => sprout.query('SELECT lane FROM sticky_notes')).toEqual([{ lane: 'done' }]);
  });

  test('dragging a sticky drops it into another column, in the right place', async ({ sprout }) => {
    const { page } = sprout;
    for (const text of ['First', 'Second']) {
      await page.getByRole('button', { name: 'Add a sticky to Doing' }).click();
      await page.keyboard.type(text);
    }
    await page.getByRole('button', { name: 'Add a sticky to To do' }).click();
    await page.keyboard.type('Moving');

    const strip = page.getByRole('region', { name: 'To do column' }).locator('.sticky-strip');
    const from = (await strip.boundingBox())!;
    const target = (await page.getByRole('region', { name: 'Doing column' }).locator('.sticky').first().boundingBox())!;
    // The middle of the strip, clear of its buttons.
    await page.mouse.move(from.x + from.width / 2, from.y + 8);
    await page.mouse.down();
    await page.mouse.move(target.x + 40, target.y + target.height - 10, { steps: 10 });
    await expect(page.locator('.kanban-placeholder')).toBeVisible();
    await page.mouse.up();

    await expect.poll(() => values(page.getByRole('region', { name: 'Doing column' }).getByRole('textbox', { name: 'Sticky note text' }))).toEqual(['First', 'Moving', 'Second']);
    await expect
      .poll(() => sprout.query('SELECT text, lane FROM sticky_notes ORDER BY position'))
      .toEqual([
        { text: 'First', lane: 'doing' },
        { text: 'Moving', lane: 'doing' },
        { text: 'Second', lane: 'doing' },
      ]);
  });

  test('renames, adds and removes columns, moving their stickies to the first', async ({ sprout }) => {
    const { page } = sprout;
    await page.getByRole('button', { name: 'Add a sticky to Done' }).click();
    await page.keyboard.type('Finished');

    await page.getByRole('button', { name: '+ Add column' }).click();
    await page.keyboard.type('Exam week');
    await expect.poll(() => values(page.getByRole('textbox', { name: 'Column name' }))).toEqual(['To do', 'Doing', 'Done', 'Exam week']);

    const done = page.getByRole('region', { name: 'Done column' });
    await done.hover();
    page.once('dialog', (dialog) => dialog.accept());
    await done.getByRole('button', { name: 'Remove column' }).click();
    await expect.poll(() => values(page.getByRole('textbox', { name: 'Column name' }))).toEqual(['To do', 'Doing', 'Exam week']);
    await expect(page.getByRole('region', { name: 'To do column' }).getByRole('textbox', { name: 'Sticky note text' })).toHaveValue('Finished');
  });

  test('stickies keep their corkboard spot when you switch back', async ({ sprout }) => {
    const { page } = sprout;
    await page.getByRole('button', { name: 'Add a sticky to To do' }).click();
    await page.getByRole('button', { name: '📌 Corkboard' }).click();
    await expect(page.locator('.sticky')).toHaveCSS('left', '22px');
  });
});
