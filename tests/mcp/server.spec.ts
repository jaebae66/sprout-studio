import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, test as base } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ROOT } from '../support/sprout';

interface Mcp {
  client: Client;
  userData: string;
  vault: string;
  /** Calls a tool and returns its text, parsed as JSON when it is JSON. */
  call(name: string, args?: Record<string, unknown>): Promise<{ value: any; isError: boolean }>;
}

/** Starts mcp/server.mjs over stdio against a throwaway data folder with a couple of notes. */
const test = base.extend<{ mcp: Mcp }>({
  mcp: async ({}, use, testInfo) => {
    const userData = testInfo.outputPath('userData');
    const vault = testInfo.outputPath('vault');
    fs.mkdirSync(userData, { recursive: true });
    fs.mkdirSync(vault, { recursive: true });
    fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ vault }));
    fs.writeFileSync(path.join(vault, 'Plants.md'), '# Plants\nThey need [[Water]] and sunlight.');
    fs.writeFileSync(path.join(vault, 'Water.md'), 'Wet. See [[Plants]].');

    const env = { ...process.env, SPROUT_USER_DATA: userData } as Record<string, string>;
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(ROOT, 'mcp', 'server.mjs')], env, stderr: 'pipe' });
    const client = new Client({ name: 'sprout-tests', version: '1.0.0' });
    await client.connect(transport);

    await use({
      client,
      userData,
      vault,
      async call(name, args = {}) {
        const result = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean };
        const text = result.content[0]?.text ?? '';
        let value: unknown = text;
        try {
          value = JSON.parse(text);
        } catch {
          // Plain sentence.
        }
        return { value, isError: Boolean(result.isError) };
      },
    });
    await client.close();
  },
});

test('offers the expected tools, marked read-only where they only read', async ({ mcp }) => {
  const { tools } = await mcp.client.listTools();
  const names = tools.map((tool) => tool.name).sort();
  expect(names).toEqual(
    [
      'add_flashcard',
      'add_sticky_note',
      'add_subject',
      'add_task',
      'append_to_note',
      'complete_task',
      'create_note',
      'get_overview',
      'list_flashcards',
      'list_notes',
      'list_sticky_notes',
      'list_subjects',
      'list_tasks',
      'read_note',
      'replace_note',
      'search_notes',
      'update_subject',
    ].sort(),
  );
  const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name);
  expect(readOnly).toEqual(expect.arrayContaining(['list_notes', 'read_note', 'search_notes', 'list_tasks', 'get_overview']));
  expect(readOnly).not.toContain('create_note');
});

test.describe('notes', () => {
  test('lists, reads (with links both ways) and searches', async ({ mcp }) => {
    const list = (await mcp.call('list_notes')).value;
    expect(list.map((note: { name: string }) => note.name).sort()).toEqual(['Plants', 'Water']);

    const plants = (await mcp.call('read_note', { name: 'plants' })).value;
    expect(plants.content).toContain('sunlight');
    expect(plants.linksTo).toEqual(['Water']);
    expect(plants.linkedFrom).toEqual(['Water']);

    const found = (await mcp.call('search_notes', { query: 'SUNLIGHT' })).value;
    expect(found).toEqual([expect.objectContaining({ name: 'Plants' })]);
  });

  test('creates, appends to and rewrites notes as files in the vault', async ({ mcp }) => {
    expect((await mcp.call('create_note', { name: 'Soil', content: 'Linked to [[Plants]]' })).isError).toBe(false);
    expect(fs.readFileSync(path.join(mcp.vault, 'Soil.md'), 'utf8')).toBe('Linked to [[Plants]]');

    await mcp.call('append_to_note', { name: 'soil', content: '- has worms' });
    expect(fs.readFileSync(path.join(mcp.vault, 'Soil.md'), 'utf8')).toBe('Linked to [[Plants]]\n- has worms');

    await mcp.call('replace_note', { name: 'Soil', content: 'Fresh start' });
    expect(fs.readFileSync(path.join(mcp.vault, 'Soil.md'), 'utf8')).toBe('Fresh start');

    const plants = (await mcp.call('read_note', { name: 'Plants' })).value;
    expect(plants.linkedFrom).toEqual(['Water']);
  });

  test('refuses names that are taken or could leave the vault', async ({ mcp }) => {
    const taken = await mcp.call('create_note', { name: 'plants', content: 'x' });
    expect(taken.isError).toBe(true);
    expect(taken.value).toContain('already exists');

    for (const name of ['../escape', 'sub/folder', 'C:\\Windows\\evil', '.hidden']) {
      expect((await mcp.call('create_note', { name, content: 'x' })).isError).toBe(true);
    }
    expect(fs.existsSync(path.join(mcp.userData, '..', 'escape.md'))).toBe(false);
    expect(fs.readdirSync(mcp.vault).sort()).toEqual(['Plants.md', 'Water.md']);
  });

  test('says clearly when a note is missing', async ({ mcp }) => {
    const missing = await mcp.call('read_note', { name: 'Nope' });
    expect(missing.isError).toBe(true);
    expect(missing.value).toContain('no note called "Nope"');
  });
});

test.describe('study data', () => {
  test('adds and ticks off tasks in the SQLite database', async ({ mcp }) => {
    const added = (await mcp.call('add_task', { title: 'Revise cells', due: '2026-10-20', subject: 'BIO' })).value.added;
    expect(added).toMatchObject({ title: 'Revise cells', due: '2026-10-20', unit: 'BIO', done: false });

    expect((await mcp.call('list_tasks')).value).toEqual([expect.objectContaining({ title: 'Revise cells', done: false })]);
    await mcp.call('complete_task', { task: 'revise cells' });
    expect((await mcp.call('list_tasks')).value).toEqual([]);
    expect((await mcp.call('list_tasks', { includeDone: true })).value[0].done).toBe(true);

    const db = new DatabaseSync(path.join(mcp.userData, 'sprout-studio.db'), { readOnly: true });
    expect(db.prepare('SELECT title, done FROM tasks').all()).toEqual([{ title: 'Revise cells', done: 1 }]);
    db.close();
  });

  test('checks dates and finds nothing that is not there', async ({ mcp }) => {
    expect((await mcp.call('add_task', { title: 'Bad date', due: 'next tuesday' })).isError).toBe(true);
    const missing = await mcp.call('complete_task', { task: 'Ghost task' });
    expect(missing.isError).toBe(true);
    expect(missing.value).toContain('Nothing called');
  });

  test('adds flashcards and subjects, and updates progress', async ({ mcp }) => {
    await mcp.call('add_flashcard', { term: 'Mitosis', meaning: 'Cell division' });
    expect((await mcp.call('list_flashcards')).value).toEqual([{ id: expect.any(String), term: 'Mitosis', meaning: 'Cell division', known: false }]);

    await mcp.call('add_subject', { name: 'Cells', code: 'BIO101' });
    const updated = (await mcp.call('update_subject', { subject: 'bio101', progress: 40, status: 'In progress' })).value.updated;
    expect(updated).toEqual({ name: 'Cells', status: 'In progress', progress: 40 });
    expect((await mcp.call('update_subject', { subject: 'Cells', progress: 140 })).isError).toBe(true);
  });

  test('pins sticky notes to the board', async ({ mcp }) => {
    await mcp.call('add_sticky_note', { text: 'Revise chapter 3', color: 'pink' });
    await mcp.call('add_sticky_note', { text: 'Buy highlighters' });
    expect((await mcp.call('list_sticky_notes')).value).toEqual([
      { id: expect.any(String), text: 'Revise chapter 3', color: 'pink' },
      { id: expect.any(String), text: 'Buy highlighters', color: 'yellow' },
    ]);
    expect((await mcp.call('add_sticky_note', { text: 'x', color: 'tartan' })).isError).toBe(true);
  });

  test('the overview pulls everything together', async ({ mcp }) => {
    await mcp.call('add_task', { title: 'Soonest', due: '2026-10-05' });
    await mcp.call('add_task', { title: 'Later', due: '2026-11-01' });
    await mcp.call('add_subject', { name: 'Cells' });
    const overview = (await mcp.call('get_overview')).value;
    expect(overview.openTasks).toBe(2);
    expect(overview.nextTasks.map((task: { title: string }) => task.title)).toEqual(['Soonest', 'Later']);
    expect(overview.subjects).toEqual([{ name: 'Cells', code: '', status: 'Not started', progress: 0 }]);
    expect(overview.notes).toBe(2);
  });
});
