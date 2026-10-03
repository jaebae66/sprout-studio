import { expect, test } from '../support/sprout';

test.describe('opening the app', () => {
  test('opens straight into Notes with a welcome note on an empty vault', async ({ sprout }) => {
    const { page } = sprout;
    await expect(page).toHaveTitle('Sprout Studio');
    await expect(page.locator('.ribbon [aria-selected="true"]')).toHaveAccessibleName('Notes');
    await expect(page.locator('.note-title')).toHaveValue('Welcome');
    await expect(page.locator('.note-preview h1')).toHaveText(/Welcome to Sprout Studio/);
    expect(sprout.readNote('Welcome')).toContain('# Welcome to Sprout Studio');
  });

  test('the welcome note does not come back once deleted', async ({ sprout }) => {
    const { page } = sprout;
    await expect(page.locator('.note-title')).toHaveValue('Welcome');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Welcome' }).click();
    await expect(page.locator('.note-list li')).toHaveCount(0);
    await sprout.restart();
    await expect(sprout.page.locator('.note-list li')).toHaveCount(0);
    await expect(sprout.page.getByText('No notes yet.')).toBeVisible();
  });

  test('reopens on the tab you left it on', async ({ sprout }) => {
    await sprout.openTab('Planner');
    await sprout.restart();
    await expect(sprout.page.locator('.ribbon [aria-selected="true"]')).toHaveAccessibleName('Planner');
  });

  test('every ribbon tab opens its view', async ({ sprout }) => {
    const { page } = sprout;
    const views: Record<string, RegExp> = {
      Graph: /Graph/,
      Today: /Study timer/,
      Planner: /Planner/,
      Subjects: /My subjects/,
      Flashcards: /Flashcards/,
      Quiz: /Quick quiz/,
      'Book maker': /Book maker/,
      Customise: /Colours/,
      Notes: /Notes/,
    };
    for (const [tab, heading] of Object.entries(views)) {
      await sprout.openTab(tab);
      await expect(page.locator('main.pane h2').filter({ hasText: heading }).first()).toBeVisible();
    }
  });

  test('narrow windows move the ribbon to the bottom', async ({ sprout }) => {
    const { app, page } = sprout;
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(600, 900));
    await expect
      .poll(async () => {
        const ribbon = await page.locator('.ribbon').boundingBox();
        const pane = await page.locator('main.pane').boundingBox();
        return ribbon && pane ? ribbon.y > pane.y : false;
      })
      .toBe(true);
  });
});

test.describe('safety', () => {
  test('the page gets the vault and database bridges but no Node', async ({ sprout }) => {
    const exposed = await sprout.page.evaluate(() => ({
      vault: typeof window.sproutVault?.list,
      db: typeof window.sproutDb?.load,
      require: typeof (window as { require?: unknown }).require,
      process: typeof (window as { process?: unknown }).process,
    }));
    expect(exposed).toEqual({ vault: 'function', db: 'function', require: 'undefined', process: 'undefined' });
  });

  test('note names that could leave the vault are refused', async ({ sprout }) => {
    for (const name of ['../evil', 'a/b', '..\\evil', 'C:\\evil']) {
      const result = await sprout.page.evaluate(
        (bad) => window.sproutVault!.write(bad, 'x').then(() => 'wrote', () => 'refused'),
        name,
      );
      expect(result).toBe('refused');
    }
  });

  test('web links in notes open in your browser, never inside the app', async ({ sprout }) => {
    const { app, page } = sprout;
    // Catch the hand-off to the browser instead of really opening one.
    await app.evaluate(({ shell }) => {
      (globalThis as { opened?: string[] }).opened = [];
      shell.openExternal = async (url: string) => void (globalThis as { opened?: string[] }).opened!.push(url);
    });
    const before = page.url().split('#')[0];
    await page.getByRole('button', { name: /Edit/ }).click();
    await page.locator('.note-body').fill('[Example](https://example.com/page)');
    await page.getByRole('button', { name: /Read/ }).click();
    await page.locator('.note-preview a', { hasText: 'Example' }).click();
    await expect.poll(() => app.evaluate(() => (globalThis as { opened?: string[] }).opened)).toEqual(['https://example.com/page']);
    expect(page.url().split('#')[0]).toBe(before);
    expect(app.windows()).toHaveLength(1);
  });
});
