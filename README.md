# Sprout Studio

One app, laid out like Obsidian: an icon ribbon on the left and one view at a time. It opens on Notes (or wherever you left off).

- **Notes** and **Graph**: Markdown notes with `[[links]]`, backlinks, search, and a graph of how they connect.
- **Today, Planner, Subjects, Flashcards, Quiz**: study timer, tasks, progress tracking and revision.
- **Book maker** (Sprout Bindery): turns text, Markdown or HTML files into an EPUB, and EPUBs back into text.
- **Customise**: wallpaper, icon pack, colours and backups.

Built with React + TypeScript and bundled by Vite.

## Getting started

You need [Node.js](https://nodejs.org/) 18 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # TypeScript only
npm run build      # type-check, then build into dist/
npm run desktop          # build, then open it as a desktop app (Electron)
npm run package:desktop  # build, then package it into release/Sprout Studio-win32-x64/
```

`npm run build` writes the app as **one self-contained HTML file**, `dist/index.html`, with all scripts and styles inlined. It opens straight from disk. No server needed.

## Desktop app

`electron/main.cjs` opens `dist/index.html` in its own window. In the desktop app, notes are plain `<name>.md` files in a vault folder (`Documents\Sprout Vault` unless you pick another under Notes → Change…), so other Markdown editors can open them too, and edits made elsewhere show up straight away. `electron/preload.cjs` gives the page only the vault functions listed in `src/study/lib/vault.ts`. Any notes from the browser version, or from a restored backup, move into the vault automatically.

After changing the code, run `npm run package:desktop` again to update the app.

## Layout

```
index.html       the page
electron/        desktop app: main.cjs (window + vault files), preload.cjs
scripts/         package-desktop.mjs
src/
  shared/        used across the app
    components/  Button, Panel, Toast, ColorDots
    hooks/       useToast
    lib/         classNames, download
    styles/      theme.css (colour tokens, dark mode), base.css (resets, buttons, toast…)
  bindery/
    BinderyView.tsx   the Book maker tab: state and event handlers
    components/  one file per UI piece (cover designer, chapter list, converter…)
    hooks/       useChapters
    lib/         pure logic: text → chapters, cover drawing, EPUB read/write
    bindery.css  scoped to .bindery
  study/
    main.tsx     entry point
    App.tsx      the shell: ribbon, views, timer
    StudyContext.tsx   data + helpers shared by every view (useStudy())
    components/  Ribbon, NoteGraph, Header, TaskItem, TimerPanel, FlipCard…
    views/       one file per tab; customise/ is split into its panels
    hooks/       useStudyData (load/save), useNotes (browser or vault), usePomodoro, useQuiz, useFlashcardSession, useTheme, useBackupSaver
    lib/         storage, notes (links, Markdown), vault, dates, wallpaper patterns, chime, image resize
    study.css
```

## Saved data

**Desktop app:** a SQLite database, `sprout-studio.db` in the app's data folder (`%APPDATA%\sprout-studio`), using Node's built-in `node:sqlite`. `electron/database.cjs` defines the tables: `profile`, `settings`, `subjects`, `flashcards`, `tasks`, `daily_stats` (focus minutes per day, kept as history), `pending_notes` and `preferences`. The page reaches it through `src/study/lib/database.ts`. The first time it runs, anything an older version left in `localStorage` moves into the database. Notes are not in the database: they're `.md` files in the vault.

**Browser:** `localStorage` under `sprout-study-v1`, with the same shape as before.

Either way, `src/study/lib/storage.ts` is the only place that reads or writes. Backup files are the same JSON in both, so a backup from one loads in the other. Older saves had one `notes` text box; it loads as a note called "Notes". Some field names are short (`units`, `q`/`a`, `pct`, `brk`) to match older saves; `src/study/types.ts` documents each one.
