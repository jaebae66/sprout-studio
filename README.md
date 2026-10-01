# Sprout Studio

Two small browser tools plus a launcher page:

- **Sprout Study**: study planner with timer, subjects, flashcards, quiz, planner, themes, and Obsidian-style notes (Markdown, `[[links]]`, backlinks, search and a graph view).
- **Sprout Bindery**: turns text, Markdown or HTML files into an EPUB, and EPUBs back into text.

Built with React + TypeScript and bundled by Vite.

## Getting started

You need [Node.js](https://nodejs.org/) 18 or newer.

```sh
npm install
npm run dev        # http://localhost:5173 (pages: /, /Sprout%20Study.html, /Sprout%20Bindery.html)
npm run typecheck  # TypeScript only
npm run build      # type-check, then build into dist/
npm run desktop          # build, then open Sprout Study as a desktop app (Electron)
npm run package:desktop  # build, then package it into release/Sprout Study-win32-x64/
```

`npm run build` writes each page as **one self-contained HTML file** to `dist/`, with all scripts and styles inlined. You can open those files straight from disk or zip the folder to share it. No server needed.

## Desktop app

`electron/main.cjs` opens `dist/Sprout Study.html` in its own window. In the desktop app, notes are plain `<name>.md` files in a vault folder (`Documents\Sprout Vault` unless you pick another under Notes → Change…), so other Markdown editors can open them too, and edits made elsewhere show up straight away. `electron/preload.cjs` gives the page only the vault functions listed in `src/study/lib/vault.ts`. Any notes from the browser version, or from a restored backup, move into the vault automatically.

After changing the code, run `npm run package:desktop` again to update the app.

## Layout

```
index.html, Sprout Study.html, Sprout Bindery.html   page entry points
src/
  shared/        used by both apps
    components/  Button, Panel, Toast, ColorDots
    hooks/       useToast
    lib/         classNames, download
    styles/      theme.css (colour tokens, dark mode), base.css (resets, buttons, toast…)
  home/          launcher page styles
  bindery/
    App.tsx      state and event handlers
    components/  one file per UI piece (cover designer, chapter list, converter…)
    hooks/       useChapters
    lib/         pure logic: text → chapters, cover drawing, EPUB read/write
    bindery.css
  study/
    App.tsx      wires state, timer and tabs together
    StudyContext.tsx   data + helpers shared by every view (useStudy())
    components/  Header, TabBar, TaskItem, TimerPanel, FlipCard…
    views/       one file per tab; customise/ is split into its panels
    hooks/       useStudyData (load/save), usePomodoro, useQuiz, useFlashcardSession, useTheme, useBackupSaver
    lib/         storage, dates, wallpaper patterns, chime, image resize
    study.css
```

## Saved data

Sprout Study saves to `localStorage` under `sprout-study-v1`, with the same shape as before, so existing progress and backup files still load. Older saves had one `notes` text box; it loads as a note called "Notes". That's why some field names are short (`units`, `q`/`a`, `pct`, `brk`); `src/study/types.ts` documents each one.
