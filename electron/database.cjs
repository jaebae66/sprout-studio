// The desktop app's SQLite database (sprout-studio.db in the app's data folder), using
// Node's built-in node:sqlite. It holds everything the browser version keeps in
// localStorage. Notes stay as .md files in the vault; see main.cjs.
const { DatabaseSync } = require('node:sqlite');

/** Bump when the tables change, and add a step to `migrate` that upgrades older files. */
const SCHEMA_VERSION = 1;

const SCHEMA = `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    quiz_best INTEGER NOT NULL,
    total_minutes INTEGER NOT NULL
  );
  -- One row per setting; values are JSON.
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    status INTEGER NOT NULL,
    progress INTEGER NOT NULL
  );
  CREATE TABLE flashcards (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    term TEXT NOT NULL,
    meaning TEXT NOT NULL,
    known INTEGER NOT NULL
  );
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    due TEXT NOT NULL,
    done INTEGER NOT NULL
  );
  -- Focus time per day, kept as history. The latest day is "today" for the app.
  CREATE TABLE daily_stats (day TEXT PRIMARY KEY, minutes INTEGER NOT NULL, sessions INTEGER NOT NULL);
  -- Notes from a restored backup, waiting to be written into the vault.
  CREATE TABLE pending_notes (name TEXT PRIMARY KEY, body TEXT NOT NULL, updated REAL NOT NULL);
  -- Small UI memories: open tab, open note, whether the welcome note was made.
  CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

function migrate(db) {
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version === 0) {
    db.exec(`BEGIN; ${SCHEMA} PRAGMA user_version = ${SCHEMA_VERSION}; COMMIT;`);
  }
}

const text = (value) => (value == null ? '' : String(value));
const integer = (value) => Math.round(Number(value) || 0);
const flag = (value) => (value ? 1 : 0);

function openDatabase(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);

  const query = {
    profile: db.prepare('SELECT name, course, quiz_best, total_minutes FROM profile WHERE id = 1'),
    settings: db.prepare('SELECT key, value FROM settings'),
    subjects: db.prepare('SELECT id, code, name, status, progress FROM subjects ORDER BY position'),
    flashcards: db.prepare('SELECT id, term, meaning, known FROM flashcards ORDER BY position'),
    tasks: db.prepare('SELECT id, title, subject, due, done FROM tasks ORDER BY position'),
    latestDay: db.prepare('SELECT day, minutes, sessions FROM daily_stats ORDER BY day DESC LIMIT 1'),
    pendingNotes: db.prepare('SELECT name, body, updated FROM pending_notes'),

    saveProfile: db.prepare(`
      INSERT INTO profile (id, name, course, quiz_best, total_minutes) VALUES (1, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name, course = excluded.course,
        quiz_best = excluded.quiz_best, total_minutes = excluded.total_minutes`),
    saveSetting: db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value WHERE value IS NOT excluded.value`),
    saveSubject: db.prepare('INSERT OR REPLACE INTO subjects VALUES (?, ?, ?, ?, ?, ?)'),
    saveFlashcard: db.prepare('INSERT OR REPLACE INTO flashcards VALUES (?, ?, ?, ?, ?)'),
    saveTask: db.prepare('INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?, ?, ?)'),
    saveDay: db.prepare(`
      INSERT INTO daily_stats (day, minutes, sessions) VALUES (?, ?, ?)
      ON CONFLICT (day) DO UPDATE SET minutes = excluded.minutes, sessions = excluded.sessions`),
    savePendingNote: db.prepare('INSERT OR REPLACE INTO pending_notes VALUES (?, ?, ?)'),

    getPreference: db.prepare('SELECT value FROM preferences WHERE key = ?'),
    setPreference: db.prepare(`
      INSERT INTO preferences (key, value) VALUES (?, ?)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value`),
  };

  /** Everything as the app's StudyData shape (src/study/types.ts), or null before the first save. */
  function load() {
    const profile = query.profile.get();
    if (!profile) return null;
    const day = query.latestDay.get();
    return {
      name: profile.name,
      course: profile.course,
      quizBest: profile.quiz_best,
      settings: Object.fromEntries(query.settings.all().map(({ key, value }) => [key, JSON.parse(value)])),
      units: query.subjects
        .all()
        .map(({ id, code, name, status, progress }) => ({ id, code, name, status, pct: progress })),
      cards: query.flashcards.all().map(({ id, term, meaning, known }) => ({ id, q: term, a: meaning, known: known === 1 })),
      tasks: query.tasks
        .all()
        .map(({ id, title, subject, due, done }) => ({ id, title, unit: subject, due, done: done === 1 })),
      pages: query.pendingNotes.all().map(({ name, body, updated }) => ({ name, body, updated })),
      stats: {
        day: day?.day ?? '',
        mins: day?.minutes ?? 0,
        sessions: day?.sessions ?? 0,
        total: profile.total_minutes,
      },
    };
  }

  /** Writes the whole StudyData in one transaction, so a failed save changes nothing. */
  function save(data) {
    db.exec('BEGIN');
    try {
      query.saveProfile.run(text(data.name), text(data.course), integer(data.quizBest), integer(data.stats?.total));
      for (const [key, value] of Object.entries(data.settings ?? {})) query.saveSetting.run(key, JSON.stringify(value));

      db.exec('DELETE FROM subjects; DELETE FROM flashcards; DELETE FROM tasks; DELETE FROM pending_notes;');
      (data.units ?? []).forEach((subject, position) =>
        query.saveSubject.run(
          text(subject.id),
          position,
          text(subject.code),
          text(subject.name),
          integer(subject.status),
          integer(subject.pct),
        ),
      );
      (data.cards ?? []).forEach((card, position) =>
        query.saveFlashcard.run(text(card.id), position, text(card.q), text(card.a), flag(card.known)),
      );
      (data.tasks ?? []).forEach((task, position) =>
        query.saveTask.run(text(task.id), position, text(task.title), text(task.unit), text(task.due), flag(task.done)),
      );
      for (const note of data.pages ?? []) query.savePendingNote.run(text(note.name), text(note.body), Number(note.updated) || 0);

      if (data.stats?.day) query.saveDay.run(text(data.stats.day), integer(data.stats.mins), integer(data.stats.sessions));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return {
    load,
    save,
    getPreference: (key) => query.getPreference.get(text(key))?.value ?? null,
    setPreference: (key, value) => query.setPreference.run(text(key), text(value)),
    close: () => db.close(),
  };
}

module.exports = { openDatabase };
