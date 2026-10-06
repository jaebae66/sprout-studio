import { expect, test } from '../support/sprout';

test('Today: the timer starts, pauses and resets', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Today');
  const timer = page.locator('.timer');
  await expect(timer).toContainText('25:00');
  await timer.getByRole('button', { name: 'Start' }).click();
  await expect(timer).not.toContainText('25:00', { timeout: 3000 });
  await timer.getByRole('button', { name: 'Pause' }).click();
  await timer.getByRole('button', { name: 'Reset' }).click();
  await expect(timer).toContainText('25:00');
});

test('Planner: add a task, tick it off, remove it', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Planner');
  await page.getByPlaceholder('e.g. Review a chapter or finish a project').fill('Water the basil');
  await page.getByLabel('Due date').fill('2026-10-20');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const task = page.locator('.item', { hasText: 'Water the basil' });
  await expect(task).toContainText('due 2026-10-20');
  await expect.poll(() => sprout.query('SELECT title, due, done FROM tasks')).toEqual([{ title: 'Water the basil', due: '2026-10-20', done: 0 }]);

  await task.getByRole('checkbox').check();
  await expect(task).toHaveClass(/done/);
  await expect.poll(() => sprout.query('SELECT done FROM tasks')).toEqual([{ done: 1 }]);

  await task.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No tasks yet.')).toBeVisible();
  await expect.poll(() => sprout.query('SELECT * FROM tasks')).toEqual([]);
});

test('Planner: a task needs a name', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Planner');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.toast')).toHaveText('Give the task a name first');
});

test('Subjects: add one, move its progress, change its status', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Subjects');
  await page.getByPlaceholder('Class code, e.g. BIO101').fill('bio101');
  await page.getByPlaceholder('Class or topic name').fill('Cells');
  await page.getByRole('button', { name: 'Add subject' }).click();
  const card = page.locator('.unit', { hasText: 'Cells' });
  await expect(card.locator('.code')).toHaveText('BIO101');

  await card.getByRole('slider').fill('40');
  await expect(card).toContainText('Progress: 40%');
  await expect(card.locator('.chip')).toHaveText('In progress');

  await card.getByLabel('Status').selectOption({ label: 'Complete' });
  await expect(page.locator('.toast')).toContainText('Subject complete!');
  await expect.poll(() => sprout.query('SELECT code, name, status, progress FROM subjects')).toEqual([
    { code: 'BIO101', name: 'Cells', status: 3, progress: 40 },
  ]);
});

test('Flashcards: flip, mark as known, add your own', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Flashcards');
  const card = page.locator('.flash');
  await expect(page.getByText('Term 1 / 4')).toBeVisible();
  await card.click();
  await expect(card).toHaveClass(/flip/);
  await page.getByRole('button', { name: /I know this/ }).click();
  await expect.poll(() => sprout.query('SELECT COUNT(*) AS known FROM flashcards WHERE known = 1')).toEqual([{ known: 1 }]);

  await page.getByPlaceholder('Term, e.g. VLAN').fill('Mitosis');
  await page.getByPlaceholder('Meaning').fill('Cell division');
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.locator('.toast')).toHaveText('Card added');
  await expect.poll(() => sprout.query("SELECT meaning FROM flashcards WHERE term = 'Mitosis'")).toEqual([{ meaning: 'Cell division' }]);
});

test('Quiz: answering marks the right option and moves on', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Quiz');
  const options = page.locator('.opt');
  await expect(options).toHaveCount(4);
  await options.first().click();
  await expect(page.locator('.opt.right')).toHaveCount(1);
  await expect(options.first()).toBeDisabled();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.locator('.opt.right')).toHaveCount(0);
});

test('Today: your name and course show in the greeting', async ({ sprout }) => {
  const { page } = sprout;
  await sprout.openTab('Customise');
  await page.getByLabel('Your name').fill('Jess');
  await page.getByLabel('Course or study goal').fill('Biology');
  await sprout.openTab('Today');
  await expect(page.locator('header.top h1')).toHaveText('Hi, Jess');
  await expect(page.locator('header.top .qual')).toHaveText('Biology');
});
