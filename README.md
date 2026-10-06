# Sprout Studio

One app, laid out like Obsidian: an icon ribbon on the left and one view at a time. It opens on Notes (or wherever you left off).

- **Notes** and **Graph**: Markdown notes with `[[links]]`, backlinks, search, and a graph of how they connect. A toolbar adds formatting, six highlighter colours, checklists you can tick while reading, stationery cards (tip, key idea, question…), washi-tape dividers, stickers and page templates (Cornell notes, lecture notes, revision summary…).
- **Stickies**: a corkboard of coloured sticky notes to drag around, tidy up, or turn into full notes.
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
npm test                 # build, then run every Playwright test (see Testing)
npm run test:packaged    # package, then run the app tests against the packaged .exe
npm run mcp              # start the Sprout Studio MCP server on stdio
```

`npm run build` writes the app as **one self-contained HTML file**, `dist/index.html`, with all scripts and styles inlined. It opens straight from disk. No server needed.

## Desktop app

`electron/main.cjs` opens `dist/index.html` in its own window. In the desktop app, notes are plain `<name>.md` files in a vault folder (`Documents\Sprout Vault` unless you pick another under Notes → Change…), so other Markdown editors can open them too, and edits made elsewhere show up straight away. `electron/preload.cjs` gives the page only the vault functions listed in `src/study/lib/vault.ts`. Any notes from the browser version, or from a restored backup, move into the vault automatically.

After changing the code, run `npm run package:desktop` again to update the app.

## Note-taking extras

Everything the toolbar adds is plain Markdown that Obsidian reads too:

| | Written as | Shortcut |
|---|---|---|
| Highlight (yellow) | `==text==` | Ctrl+Shift+H |
| Highlight (other colours) | `<mark class="hl-pink">text</mark>` | Ctrl+Shift+H uses the last colour |
| Bold / italic / strikethrough | `**text**` / `*text*` / `~~text~~` | Ctrl+B / Ctrl+I / Ctrl+Shift+X |
| Checklist | `- [ ] item` | Ctrl+Shift+L |
| Link to a note | `[[Note name]]` | Ctrl+K |
| Card | `> [!tip] Title` (an Obsidian callout) | |
| Washi tape divider | `---` | |

The helpers that make these edits are in `src/study/lib/formatting.ts`, the stationery (colours, cards, stickers, templates) in `src/study/lib/stationery.ts`, and the reading view turns callouts into cards in `renderNote` (`src/study/lib/notes.ts`). Sticky notes are saved in the database's `sticky_notes` table (added in database version 2; older databases upgrade themselves).

## Testing

Everything is tested with [Playwright](https://playwright.dev/) (`playwright.config.ts`), in three groups:

- `tests/unit/`: note links, paper and page styles, colours, and the SQLite database.
- `tests/mcp/`: the Sprout Studio MCP server, through a real MCP client.
- `tests/app/`: the desktop app itself, driven through Playwright's Electron support. Startup and safety, notes, graph, every study tab, the book maker (it opens the EPUB it makes and checks inside), colours and paper, saved data and backups, and the MCP server changing things while the app is open.

Each app test starts the app with its own throwaway data folder and vault (`tests/support/sprout.ts`, using the `SPROUT_USER_DATA` environment variable), so tests never touch your real notes or database. Results and failure traces go to `test-results/`; `npm run test:report` opens the HTML report.

## MCP servers

`.mcp.json` sets up two [MCP](https://modelcontextprotocol.io/) servers for Claude Code in this folder:

- **sprout-studio** (`mcp/server.mjs`): lets Claude read and change your study space. Notes: `list_notes`, `read_note` (with links both ways), `search_notes`, `create_note`, `append_to_note`, `replace_note`. Study data: `get_overview`, `list_tasks`, `add_task`, `complete_task`, `list_flashcards`, `add_flashcard`, `list_subjects`, `add_subject`, `update_subject`, `list_sticky_notes`, `add_sticky_note`. It uses the same vault and database as the app, and shares its note-name safety rules (`electron/vault-files.cjs`). The app checks the database every second for outside changes and reloads, so changes show up while it's open. There's no delete tool on purpose.
- **playwright** ([@playwright/mcp](https://github.com/microsoft/playwright-mcp)): lets Claude drive a browser (Microsoft Edge, in a fresh profile each time). `file://` pages are blocked, so run `npm run dev` and point it at `http://localhost:5173`.

Claude Code asks before using project MCP servers the first time; `/mcp` shows their status.

## Layout

```
index.html       the page
electron/        desktop app: main.cjs (window), preload.cjs, database.cjs (SQLite), vault-files.cjs (notes)
mcp/             server.mjs, the Sprout Studio MCP server
tests/           Playwright tests: unit/, mcp/, app/, support/ (the app fixture)
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

**Desktop app:** a SQLite database, `sprout-studio.db` in the app's data folder (`%APPDATA%\sprout-studio`), using Node's built-in `node:sqlite`. `electron/database.cjs` defines the tables: `profile`, `settings`, `subjects`, `flashcards`, `tasks`, `daily_stats` (focus minutes per day, kept as history), `sticky_notes`, `pending_notes` and `preferences`. The page reaches it through `src/study/lib/database.ts`. The first time it runs, anything an older version left in `localStorage` moves into the database. Notes are not in the database: they're `.md` files in the vault.

**Browser:** `localStorage` under `sprout-study-v1`, with the same shape as before.

Either way, `src/study/lib/storage.ts` is the only place that reads or writes. Backup files are the same JSON in both, so a backup from one loads in the other. Older saves had one `notes` text box; it loads as a note called "Notes". Some field names are short (`units`, `q`/`a`, `pct`, `brk`) to match older saves; `src/study/types.ts` documents each one.
