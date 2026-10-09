#!/usr/bin/env node
// Sprout Studio MCP server: lets an AI assistant (like Claude Code) read and change your
// notes, tasks, flashcards and subjects. It works on the same files the desktop app uses:
// notes in the vault folder, everything else in the SQLite database. The app notices
// these changes and shows them straight away.
//
// Runs over stdio:  node mcp/server.mjs
// SPROUT_USER_DATA points it at another data folder (the tests use this).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { openDatabase } = require('../electron/database.cjs');
const { listNotes, writeNote } = require('../electron/vault-files.cjs');

/* ---------- Where the app keeps things ---------- */

const USER_DATA = path.resolve(
  process.env.SPROUT_USER_DATA ?? path.join(process.env.APPDATA ?? path.join(os.homedir(), '.config'), 'sprout-studio'),
);
const DATABASE = path.join(USER_DATA, 'sprout-studio.db');

/** The vault folder the app is using (it records it in config.json each time it starts). */
function vaultFolder() {
  try {
    const { vault } = JSON.parse(fs.readFileSync(path.join(USER_DATA, 'config.json'), 'utf8'));
    if (vault && fs.existsSync(vault)) return vault;
  } catch {
    // No config yet.
  }
  throw new Error('Could not find your vault. Open Sprout Studio once so it can set it up, then try again.');
}

/* ---------- Study data (SQLite) ---------- */

const STATUSES = ['Not started', 'In progress', 'Reviewed', 'Complete'];

function emptyData() {
  return {
    name: '',
    course: '',
    quizBest: 0,
    settings: {},
    units: [],
    cards: [],
    tasks: [],
    pages: [],
    stickies: [],
    stats: { day: '', mins: 0, sessions: 0, total: 0 },
  };
}

/** Opens the database for one read, or one read-change-save, then closes it again. */
function withDatabase(work) {
  const db = openDatabase(DATABASE);
  try {
    return work(db);
  } finally {
    db.close();
  }
}

const readData = () => withDatabase((db) => db.load() ?? emptyData());

/** Applies `change` to the saved data in one go. The app picks the change up within a second. */
function changeData(change) {
  return withDatabase((db) => {
    const data = db.load() ?? emptyData();
    const result = change(data);
    db.save(data);
    return result;
  });
}

let idCounter = 0;
/** Like newId in src/study/lib/list.ts, plus a counter so quick additions never clash. */
const newId = (prefix) => `${prefix}${Date.now()}-${++idCounter}`;

/** Finds an item by its id, or else by a case-insensitive name. */
function findItem(items, key, nameOf) {
  const wanted = key.trim().toLowerCase();
  const found = items.find((item) => item.id === key) ?? items.find((item) => nameOf(item).trim().toLowerCase() === wanted);
  if (!found) throw new Error(`Nothing called "${key}" was found.`);
  return found;
}

/* ---------- Notes (vault files) ---------- */

/** `[[Name]]`, `[[Name#Heading]]` or `[[Name|text]]`, as in src/study/lib/notes.ts. */
const WIKILINK = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/g;
const linksIn = (body) => [...new Set(Array.from(body.matchAll(WIKILINK), (match) => match[1].trim()))];
const sameName = (first, second) => first.trim().toLowerCase() === second.trim().toLowerCase();

function findNote(notes, name) {
  const note = notes.find((candidate) => sameName(candidate.name, name));
  if (!note) throw new Error(`There's no note called "${name}". Use list_notes to see what's there.`);
  return note;
}

/* ---------- Tools ---------- */

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });

/** Wraps a tool so mistakes come back as a readable error instead of crashing the server. */
const safely = (handler) => async (args) => {
  try {
    return text(await handler(args));
  } catch (error) {
    return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true };
  }
};

const server = new McpServer({ name: 'sprout-studio', version: '1.0.0' });
const reading = { readOnlyHint: true, openWorldHint: false };
const writing = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

server.registerTool(
  'get_overview',
  {
    title: 'Study overview',
    description: "A summary of the user's study space: name, course, subjects and progress, open tasks, flashcards and today's focus time.",
    annotations: reading,
  },
  safely(() => {
    const data = readData();
    const open = data.tasks.filter((task) => !task.done);
    return {
      name: data.name || null,
      course: data.course || null,
      subjects: data.units.map((unit) => ({ name: unit.name, code: unit.code, status: STATUSES[unit.status], progress: unit.pct })),
      openTasks: open.length,
      nextTasks: open
        .filter((task) => task.due)
        .sort((first, second) => first.due.localeCompare(second.due))
        .slice(0, 5)
        .map(({ title, due, unit }) => ({ title, due, subject: unit || null })),
      flashcards: { total: data.cards.length, known: data.cards.filter((card) => card.known).length },
      focus: { day: data.stats.day, minutesToday: data.stats.mins, sessionsToday: data.stats.sessions, minutesAllTime: data.stats.total },
      notes: listNotesSafely().length,
    };
  }),
);

function listNotesSafely() {
  try {
    return listNotes(vaultFolder());
  } catch {
    return [];
  }
}

/* Notes */

server.registerTool(
  'list_notes',
  { title: 'List notes', description: 'Every note in the vault, newest first.', annotations: reading },
  safely(() =>
    listNotes(vaultFolder())
      .sort((first, second) => second.updated - first.updated)
      .map((note) => ({ name: note.name, updated: new Date(note.updated).toISOString(), characters: note.body.length })),
  ),
);

server.registerTool(
  'read_note',
  {
    title: 'Read a note',
    description: 'The Markdown of one note, plus the notes it links to and the notes that link to it.',
    inputSchema: { name: z.string().describe('The note name (not case-sensitive), without .md') },
    annotations: reading,
  },
  safely(({ name }) => {
    const notes = listNotes(vaultFolder());
    const note = findNote(notes, name);
    return {
      name: note.name,
      content: note.body,
      linksTo: linksIn(note.body),
      linkedFrom: notes.filter((other) => other !== note && linksIn(other.body).some((link) => sameName(link, note.name))).map((other) => other.name),
    };
  }),
);

server.registerTool(
  'search_notes',
  {
    title: 'Search notes',
    description: 'Finds notes whose name or text contains the words.',
    inputSchema: { query: z.string().min(1) },
    annotations: reading,
  },
  safely(({ query }) => {
    const needle = query.trim().toLowerCase();
    return listNotes(vaultFolder()).flatMap((note) => {
      const at = note.body.toLowerCase().indexOf(needle);
      if (!note.name.toLowerCase().includes(needle) && at < 0) return [];
      return [{ name: note.name, snippet: at < 0 ? '' : note.body.slice(Math.max(0, at - 40), at + needle.length + 60).replace(/\s+/g, ' ') }];
    });
  }),
);

server.registerTool(
  'create_note',
  {
    title: 'Create a note',
    description: 'Makes a new Markdown note. Link to other notes with [[Note name]]. Fails if the name is taken.',
    inputSchema: {
      name: z.string().min(1).max(120).describe('Note name. Not allowed: \\ / : * ? " < > | # ^ [ ]'),
      content: z.string().default(''),
    },
    annotations: writing,
  },
  safely(({ name, content }) => {
    const folder = vaultFolder();
    if (listNotes(folder).some((note) => sameName(note.name, name))) throw new Error(`A note called "${name}" already exists.`);
    writeNote(folder, name.trim(), content);
    return `Created "${name.trim()}".`;
  }),
);

server.registerTool(
  'append_to_note',
  {
    title: 'Add to a note',
    description: 'Adds text to the end of an existing note, on a new line.',
    inputSchema: { name: z.string(), content: z.string().min(1) },
    annotations: writing,
  },
  safely(({ name, content }) => {
    const folder = vaultFolder();
    const note = findNote(listNotes(folder), name);
    const separator = note.body && !note.body.endsWith('\n') ? '\n' : '';
    writeNote(folder, note.name, `${note.body}${separator}${content}`);
    return `Added to "${note.name}".`;
  }),
);

server.registerTool(
  'replace_note',
  {
    title: 'Rewrite a note',
    description: "Replaces a note's whole text. Read it first: anything not in the new text is lost.",
    inputSchema: { name: z.string(), content: z.string() },
    annotations: { ...writing, destructiveHint: true },
  },
  safely(({ name, content }) => {
    const folder = vaultFolder();
    const note = findNote(listNotes(folder), name);
    writeNote(folder, note.name, content);
    return `Rewrote "${note.name}".`;
  }),
);

/* Tasks */

server.registerTool(
  'list_tasks',
  {
    title: 'List tasks',
    description: 'Planner tasks, open ones first, then by due date.',
    inputSchema: { includeDone: z.boolean().default(false).describe('Also list finished tasks') },
    annotations: reading,
  },
  safely(({ includeDone }) =>
    readData()
      .tasks.filter((task) => includeDone || !task.done)
      .sort((first, second) => Number(first.done) - Number(second.done) || (first.due || '9999').localeCompare(second.due || '9999'))
      .map(({ id, title, unit, due, done }) => ({ id, title, subject: unit || null, due: due || null, done })),
  ),
);

server.registerTool(
  'add_task',
  {
    title: 'Add a task',
    description: 'Adds a task to the planner.',
    inputSchema: {
      title: z.string().min(1),
      due: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
        .optional()
        .describe('Due date, YYYY-MM-DD'),
      subject: z.string().optional().describe('Subject code or name'),
    },
    annotations: writing,
  },
  safely(({ title, due, subject }) =>
    changeData((data) => {
      const task = { id: newId('t'), title: title.trim(), unit: subject?.trim() ?? '', due: due ?? '', done: false };
      data.tasks.push(task);
      return { added: task };
    }),
  ),
);

server.registerTool(
  'complete_task',
  {
    title: 'Tick off a task',
    description: 'Marks a task as done (or not done again).',
    inputSchema: { task: z.string().describe('The task id, or its exact title'), done: z.boolean().default(true) },
    annotations: writing,
  },
  safely(({ task, done }) =>
    changeData((data) => {
      const found = findItem(data.tasks, task, (item) => item.title);
      found.done = done;
      return `"${found.title}" is ${done ? 'done' : 'open again'}.`;
    }),
  ),
);

/* Flashcards */

server.registerTool(
  'list_flashcards',
  { title: 'List flashcards', description: 'Every flashcard, with whether the user knows it yet.', annotations: reading },
  safely(() => readData().cards.map(({ id, q, a, known }) => ({ id, term: q, meaning: a, known }))),
);

server.registerTool(
  'add_flashcard',
  {
    title: 'Add a flashcard',
    description: 'Adds a flashcard (a term and its meaning) for revision and the quiz.',
    inputSchema: { term: z.string().min(1), meaning: z.string().min(1) },
    annotations: writing,
  },
  safely(({ term, meaning }) =>
    changeData((data) => {
      const card = { id: newId('c'), q: term.trim(), a: meaning.trim(), known: false };
      data.cards.push(card);
      return { added: { id: card.id, term: card.q, meaning: card.a } };
    }),
  ),
);

/* Sticky notes */

/** Colours offered on the Stickies board (src/study/lib/stationery.ts). */
const STICKY_COLORS = ['yellow', 'pink', 'mint', 'blue', 'lilac', 'peach'];

server.registerTool(
  'list_sticky_notes',
  { title: 'List sticky notes', description: 'The sticky notes on the Stickies board.', annotations: reading },
  safely(() => readData().stickies.map(({ id, text, color }) => ({ id, text, color }))),
);

server.registerTool(
  'add_sticky_note',
  {
    title: 'Add a sticky note',
    description: 'Pins a sticky note to the Stickies board: good for quick reminders.',
    inputSchema: { text: z.string().min(1).max(500), color: z.enum(STICKY_COLORS).default('yellow') },
    annotations: writing,
  },
  safely(({ text, color }) =>
    changeData((data) => {
      // The next spot in a four-across grid; "Tidy up" in the app re-flows them to fit.
      const index = data.stickies.length;
      const sticky = { id: newId('s'), text: text.trim(), color, x: 22 + (index % 4) * 212, y: 22 + Math.floor(index / 4) * 202, lane: '' };
      data.stickies.push(sticky);
      return { added: { id: sticky.id, text: sticky.text, color } };
    }),
  ),
);

/* Subjects */

server.registerTool(
  'list_subjects',
  { title: 'List subjects', description: 'Subjects with their status and progress.', annotations: reading },
  safely(() => readData().units.map(({ id, code, name, status, pct }) => ({ id, code, name, status: STATUSES[status], progress: pct }))),
);

server.registerTool(
  'add_subject',
  {
    title: 'Add a subject',
    description: 'Adds a subject to track.',
    inputSchema: { name: z.string().min(1), code: z.string().default('').describe('Optional short code, e.g. BIO101') },
    annotations: writing,
  },
  safely(({ name, code }) =>
    changeData((data) => {
      const subject = { id: newId('u'), code: code.trim(), name: name.trim(), status: 0, pct: 0 };
      data.units.push(subject);
      return { added: subject };
    }),
  ),
);

server.registerTool(
  'update_subject',
  {
    title: 'Update a subject',
    description: "Changes a subject's progress (0–100) and/or status.",
    inputSchema: {
      subject: z.string().describe('The subject id, name or code'),
      progress: z.number().min(0).max(100).optional(),
      status: z.enum(STATUSES).optional(),
    },
    annotations: writing,
  },
  safely(({ subject, progress, status }) =>
    changeData((data) => {
      const found = data.units.find((unit) => unit.code && sameName(unit.code, subject)) ?? findItem(data.units, subject, (unit) => unit.name);
      if (progress !== undefined) found.pct = Math.round(progress);
      if (status !== undefined) found.status = STATUSES.indexOf(status);
      return { updated: { name: found.name, status: STATUSES[found.status], progress: found.pct } };
    }),
  ),
);

await server.connect(new StdioServerTransport());
