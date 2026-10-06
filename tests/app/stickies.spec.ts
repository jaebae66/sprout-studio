import { expect, test } from '../support/sprout';

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
