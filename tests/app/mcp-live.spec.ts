import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { expect, ROOT, test } from '../support/sprout';

/** Connects the Sprout Studio MCP server to the same data the running app is using. */
async function connectMcp(userData: string) {
  const env = { ...process.env, SPROUT_USER_DATA: userData } as Record<string, string>;
  const client = new Client({ name: 'sprout-tests', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, 'mcp', 'server.mjs')], env, stderr: 'pipe' }));
  return client;
}

test.describe('the MCP server and the open app together', () => {
  test.use({ notes: { Plants: 'Need [[Water]].' } });

  test('a task added over MCP appears in the open app, and nothing is lost', async ({ sprout }) => {
    const { page } = sprout;
    await sprout.openTab('Planner');
    await page.getByPlaceholder('e.g. Review a chapter or finish a project').fill('Typed in the app');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect.poll(() => sprout.query('SELECT COUNT(*) AS n FROM tasks')).toEqual([{ n: 1 }]);

    const mcp = await connectMcp(sprout.userData);
    await mcp.callTool({ name: 'add_task', arguments: { title: 'Added by Claude', due: '2026-10-09' } });
    await mcp.close();

    // The app spots the database change and shows it, without a restart.
    await expect(page.getByText('Added by Claude')).toBeVisible();
    await expect(page.getByText('Typed in the app')).toBeVisible();

    // And the app's next save keeps the MCP task.
    await page.locator('.item', { hasText: 'Typed in the app' }).getByRole('checkbox').check();
    await expect.poll(() => sprout.query('SELECT title, done FROM tasks ORDER BY title')).toEqual([
      { title: 'Added by Claude', done: 0 },
      { title: 'Typed in the app', done: 1 },
    ]);
  });

  test('a note created over MCP appears in the notes list and graph', async ({ sprout }) => {
    const mcp = await connectMcp(sprout.userData);
    await mcp.callTool({ name: 'create_note', arguments: { name: 'Water', content: 'Plants drink me. [[Plants]]' } });
    await mcp.close();
    const { page } = sprout;
    await sprout.openTab('Notes');
    await expect(page.locator('.note-list')).toContainText('Water');
    await sprout.openTab('Graph');
    await expect(page.locator('.graph-info')).toContainText('2 notes');
  });

  test('the MCP server finds the vault the app recorded', async ({ sprout }) => {
    const mcp = await connectMcp(sprout.userData);
    const result = (await mcp.callTool({ name: 'list_notes', arguments: {} })) as { content: { text: string }[] };
    await mcp.close();
    expect(JSON.parse(result.content[0].text).map((note: { name: string }) => note.name)).toEqual(['Plants']);
  });
});
