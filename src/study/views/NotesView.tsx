import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { cx } from '../../shared/lib/classNames';
import { useNotes, type NotesStore } from '../hooks/useNotes';
import { backlinks, cleanNoteName, findNote, renderNote, searchNotes } from '../lib/notes';
import { loadOpenNote, markWelcomed, saveOpenNote, wasWelcomed } from '../lib/storage';
import { useStudy } from '../StudyContext';
import type { Note } from '../types';

type Mode = 'edit' | 'preview';

const WELCOME_NOTE = `# Welcome to Sprout Studio 🌱

This is your notes space. Everything here is plain Markdown.

- Make a new note with **+ New**, or link to one that doesn't exist yet, like [[My first idea]], and click the link.
- Press **Ctrl+E** to switch between writing and reading.
- Notes that link to this one show up under *Linked from* below.
- The **Graph** tab on the left shows how your notes connect.

The rest of your study tools (timer, planner, flashcards, quiz) and the **Book maker** are in the bar on the left.

You can delete this note whenever you like.`;

export function NotesView() {
  const store = useNotes();
  const { notes } = store;
  const { icon } = useStudy();
  const [openName, setOpenName] = useState(loadOpenNote);
  const [mode, setMode] = useState<Mode>('edit');
  const [query, setQuery] = useState('');

  const open = openName ? findNote(notes, openName) : undefined;
  const sorted = useMemo(() => [...notes].sort((first, second) => second.updated - first.updated), [notes]);

  // The very first time, start with a welcome note open instead of an empty page.
  useEffect(() => {
    if (!store.ready || notes.length || wasWelcomed()) return;
    markWelcomed();
    show(store.create('Welcome', WELCOME_NOTE), 'preview');
  });

  useEffect(() => {
    if (open) saveOpenNote(open.name);
  }, [open]);

  // Reopen the most recent note when the remembered one is gone.
  useEffect(() => {
    if (!open && sorted[0] && store.ready) setOpenName(sorted[0].name);
  });

  // Ctrl+E switches between editing and reading, as in Obsidian.
  useEffect(() => {
    function handleKey(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setMode((current) => (current === 'edit' ? 'preview' : 'edit'));
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function show(name: string, nextMode?: Mode) {
    setOpenName(name);
    if (nextMode) setMode(nextMode);
  }

  /** Opens a note by name, creating it first if it doesn't exist yet. */
  function openOrCreate(name: string) {
    const existing = findNote(notes, name);
    if (existing) show(existing.name);
    else show(store.create(cleanNoteName(name)), 'edit');
  }

  const results = useMemo(() => searchNotes(notes, query), [notes, query]);

  return (
    <div className="notes-app">
      <Panel
        className="notes-side stack tight"
        title={`${icon('notes')} Notes`}
        aside={
          <Button size="small" onClick={() => show(store.create('Untitled'), 'edit')}>
            + New
          </Button>
        }
      >
        <input
          type="search"
          placeholder="Search notes…"
          aria-label="Search notes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className="note-list">
          {query.trim()
            ? results.map(({ note, snippet }) => (
                <NoteListItem key={note.name} note={note} current={note === open} onOpen={show}>
                  {snippet && <small className="muted">{snippet}</small>}
                </NoteListItem>
              ))
            : sorted.map((note) => <NoteListItem key={note.name} note={note} current={note === open} onOpen={show} />)}
        </ul>
        {query.trim() && !results.length && <p className="muted small-text">No notes match “{query.trim()}”.</p>}
        <VaultFooter store={store} />
      </Panel>

      {open ? (
        <NoteEditor
          key={open.name}
          note={open}
          store={store}
          mode={mode}
          onMode={setMode}
          onOpen={show}
          onFollowLink={openOrCreate}
        />
      ) : (
        <Panel className="notes-main stack">
          <div className="empty">
            {store.ready ? (
              <>
                <p>{notes.length ? 'Pick a note on the left, or start a new one.' : 'No notes yet.'}</p>
                <p className="small-text">
                  Write in Markdown. Link notes with [[Note name]], and the Graph tab shows how they connect.
                </p>
              </>
            ) : (
              'Opening your vault…'
            )}
          </div>
          <Button onClick={() => show(store.create('Untitled'), 'edit')}>New note</Button>
        </Panel>
      )}
    </div>
  );
}

interface NoteListItemProps {
  note: Note;
  current: boolean;
  onOpen: (name: string) => void;
  children?: ReactNode;
}

function NoteListItem({ note, current, onOpen, children }: NoteListItemProps) {
  return (
    <li>
      <button type="button" className={cx('note-link', current && 'current')} onClick={() => onOpen(note.name)}>
        <span>{note.name}</span>
        {children}
      </button>
    </li>
  );
}

function VaultFooter({ store }: { store: NotesStore }) {
  if (!store.folder) {
    return <p className="muted small-text notes-where">Saved in this browser.</p>;
  }
  return (
    <div className="notes-where stack tight">
      <p className="muted small-text" title={store.folder}>
        Vault: <span className="vault-path">{store.folder}</span>
      </p>
      <div className="row">
        <Button size="small" ghost onClick={store.openFolder}>
          Open folder
        </Button>
        <Button size="small" ghost onClick={store.chooseFolder}>
          Change…
        </Button>
      </div>
    </div>
  );
}

interface NoteEditorProps {
  note: Note;
  store: NotesStore;
  mode: Mode;
  onMode: (mode: Mode) => void;
  onOpen: (name: string) => void;
  onFollowLink: (name: string) => void;
}

function NoteEditor({ note, store, mode, onMode, onOpen, onFollowLink }: NoteEditorProps) {
  const { notify } = useStudy();
  const [title, setTitle] = useState(note.name);
  const linkedFrom = backlinks(store.notes, note.name);
  const html = useMemo(
    () => (mode === 'preview' ? renderNote(note.body, store.notes) : ''),
    [mode, note.body, store.notes],
  );

  function commitTitle() {
    const name = cleanNoteName(title);
    if (!name || name === note.name) {
      setTitle(note.name);
      return;
    }
    if (store.rename(note.name, name)) {
      onOpen(name);
    } else {
      notify(`There's already a note called “${name}”`);
      setTitle(note.name);
    }
  }

  function handleTitleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setTitle(note.name);
      requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
    }
  }

  function handlePreviewClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest('a');
    if (!link) return;
    event.preventDefault();
    if (link.dataset.note) {
      onFollowLink(link.dataset.note);
    } else if (/^https?:/i.test(link.getAttribute('href') ?? '')) {
      window.open(link.href, '_blank', 'noopener');
    }
  }

  function handleDelete() {
    if (!confirm(`Delete “${note.name}”?${store.folder ? ' It goes to the Recycle Bin.' : ''}`)) return;
    store.remove(note.name);
    notify('Note deleted');
  }

  return (
    <section className="panel notes-main stack tight">
      <div className="row note-head">
        <input
          type="text"
          className="note-title"
          aria-label="Note name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKey}
        />
        <div className="row">
          <div className="segmented" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === 'edit'} onClick={() => onMode('edit')} title="Edit (Ctrl+E)">
              ✏️ Edit
            </button>
            <button
              type="button"
              aria-pressed={mode === 'preview'}
              onClick={() => onMode('preview')}
              title="Read (Ctrl+E)"
            >
              📖 Read
            </button>
          </div>
          <Button size="small" ghost onClick={handleDelete} aria-label={`Delete ${note.name}`} title="Delete note">
            🗑️
          </Button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          className="note-body"
          autoFocus={!note.body}
          placeholder={'Write in Markdown…\n\n# Heading\n- a list item\n**bold**, *italic*, [[Another note]]'}
          value={note.body}
          onChange={(event) => store.save(note.name, event.target.value)}
        />
      ) : (
        <div
          className="note-preview"
          onClick={handlePreviewClick}
          // Sanitised by DOMPurify in renderNote.
          dangerouslySetInnerHTML={{ __html: html || '<p class="muted">This note is empty.</p>' }}
        />
      )}

      <div className="backlinks">
        <h3>Linked from {linkedFrom.length ? `(${linkedFrom.length})` : ''}</h3>
        {linkedFrom.length ? (
          <ul className="row">
            {linkedFrom.map((other) => (
              <li key={other.name}>
                <button type="button" className="chip link-chip" onClick={() => onOpen(other.name)}>
                  {other.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small-text">No notes link here yet. Write [[{note.name}]] in another note.</p>
        )}
      </div>
    </section>
  );
}
