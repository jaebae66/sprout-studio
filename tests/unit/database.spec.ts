import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const { openDatabase } = require('../../electron/database.cjs');

const sample = () => ({
  name: 'Jess',
  course: 'Biology',
  quizBest: 7,
  settings: { wall: 'gingham', colors: { accent: '#ff66aa' }, photo: null, focus: 25 },
  units: [
    { id: 'u1', code: 'BIO101', name: 'Cells', status: 2, pct: 60 },
    { id: 'u2', code: '', name: 'Plants', status: 0, pct: 0 },
  ],
  cards: [{ id: 'c0', q: "It's", a: 'quote "test"', known: true }],
  tasks: [{ id: 't1', title: 'Read ch 1', unit: 'BIO101', due: '2026-10-05', done: false }],
  pages: [{ name: 'Old', body: 'old notes', updated: 123.5 }],
  stickies: [
    { id: 's1', text: 'Buy pens', color: 'pink', x: 22, y: 22 },
    { id: 's2', text: '', color: 'mint', x: 234, y: 40 },
  ],
  stats: { day: '2026-10-02', mins: 30, sessions: 1, total: 400 },
});

test.describe('SQLite database', () => {
  let file: string;
  test.beforeEach(({}, testInfo) => {
    file = testInfo.outputPath('test.db');
  });

  test('is empty until the first save', () => {
    const db = openDatabase(file);
    expect(db.load()).toBeNull();
    db.close();
  });

  test('gives back exactly what was saved, and keeps it after reopening', () => {
    let db = openDatabase(file);
    db.save(sample());
    expect(db.load()).toEqual(sample());
    db.close();
    db = openDatabase(file);
    expect(db.load()).toEqual(sample());
    db.close();
  });

  test('saves reorders and removals, and keeps a history of days', () => {
    const db = openDatabase(file);
    db.save(sample());
    const next = { ...sample(), units: [sample().units[1]], stats: { day: '2026-10-03', mins: 5, sessions: 0, total: 405 } };
    db.save(next);
    expect(db.load()).toEqual(next);
    db.close();
    const raw = new DatabaseSync(file, { readOnly: true });
    expect(raw.prepare('SELECT day, minutes FROM daily_stats ORDER BY day').all()).toEqual([
      { day: '2026-10-02', minutes: 30 },
      { day: '2026-10-03', minutes: 5 },
    ]);
    raw.close();
  });

  test('a failed save changes nothing', () => {
    const db = openDatabase(file);
    db.save(sample());
    expect(() => db.save({ ...sample(), name: 'Changed', settings: { bad: 1n } })).toThrow();
    expect(db.load().name).toBe('Jess');
    db.close();
  });

  test('remembers preferences', () => {
    const db = openDatabase(file);
    db.setPreference('openTab', 'graph');
    expect(db.getPreference('openTab')).toBe('graph');
    expect(db.getPreference('nothing')).toBeNull();
    db.close();
  });

  test('upgrades a version 1 database (before sticky notes) without losing anything', () => {
    let db = openDatabase(file);
    db.save({ ...sample(), stickies: [] });
    db.close();
    // Turn it back into a version 1 file.
    const raw = new DatabaseSync(file);
    raw.exec('DROP TABLE sticky_notes; PRAGMA user_version = 1;');
    raw.close();

    db = openDatabase(file);
    expect(db.load()).toEqual({ ...sample(), stickies: [] });
    db.save(sample());
    expect(db.load().stickies).toEqual(sample().stickies);
    db.close();
    const check = new DatabaseSync(file, { readOnly: true });
    expect(check.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 });
    check.close();
  });

  test('notices writes from another connection (how the app spots MCP changes)', () => {
    const app = openDatabase(file);
    const before = app.dataVersion();
    app.save(sample());
    expect(app.dataVersion()).toBe(before);
    const other = openDatabase(file);
    other.save({ ...sample(), name: 'From MCP' });
    other.close();
    expect(app.dataVersion()).not.toBe(before);
    expect(app.load().name).toBe('From MCP');
    app.close();
  });
});
