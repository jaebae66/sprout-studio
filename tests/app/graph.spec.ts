import type { Page } from '@playwright/test';
import { expect, test } from '../support/sprout';

/** Where on screen the canvas has a solid dot (sampled from its pixels), or null. */
async function findDot(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.note-graph')!;
    const ratio = window.devicePixelRatio || 1;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const solid = (x: number, y: number) => pixels[(y * canvas.width + x) * 4 + 3] > 250;
    for (let y = 4; y < canvas.height - 4; y += 2) {
      for (let x = 4; x < canvas.width - 4; x += 2) {
        if ([[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dy]) => solid(x + dx, y + dy))) {
          const box = canvas.getBoundingClientRect();
          return { x: box.left + x / ratio, y: box.top + y / ratio };
        }
      }
    }
    return null;
  });
}

test.describe('with linked notes', () => {
  test.use({
    notes: {
      Plants: 'Need [[Water]] and [[Soil]].',
      Water: 'Back to [[Plants]].',
      Soil: 'Under the [[Plants]].',
      Lonely: 'No links.',
    },
  });

  test('draws the notes and holds perfectly still', async ({ sprout }) => {
    const { page } = sprout;
    await sprout.openTab('Graph');
    await expect(page.locator('.graph-info')).toContainText('4 notes');
    const canvas = page.locator('.note-graph');
    await expect(canvas).toHaveAttribute('aria-label', /^Graph of 4 notes and 0 classes, with \d+ connections$/);
    await page.waitForTimeout(300);
    const first = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
    await page.waitForTimeout(1000);
    const second = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
    expect(second).toBe(first);
  });

  test('clicking a dot opens that note', async ({ sprout }) => {
    const { page } = sprout;
    await sprout.openTab('Graph');
    await page.waitForTimeout(300);
    const dot = await findDot(page);
    expect(dot).not.toBeNull();
    await page.mouse.click(dot!.x, dot!.y);
    await expect(page.locator('.ribbon [aria-selected="true"]')).toHaveAccessibleName('Notes');
    await expect(page.locator('.note-title')).toHaveValue(/Plants|Water|Soil|Lonely/);
  });
});

test('an empty graph offers to start the first note', async ({ sprout }) => {
  const { page } = sprout;
  // Clear out the welcome note first.
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Welcome' }).click();
  await sprout.openTab('Graph');
  await expect(page.getByText('No notes yet, so the graph is empty.')).toBeVisible();
  await page.getByRole('button', { name: 'Write my first note' }).click();
  await expect(page.locator('.note-title')).toHaveValue('My first note');
  await expect.poll(() => sprout.readNote('My first note')).toContain('[[Ideas]]');
});
