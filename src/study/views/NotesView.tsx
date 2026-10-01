import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { cx } from '../../shared/lib/classNames';
import { NoteGraph } from '../components/NoteGraph';
import { useNotes, type NotesStore } from '../hooks/useNotes';
import { backlinks, cleanNoteName, findNote, renderNote, searchNotes } from '../lib/notes';
import { useStudy } from '../StudyContext';
import type { Note } from '../types';

/** Remembers the open note between visits. */
const OPEN_NOTE_KEY = 'sprout-study-open-note';

type Mode = 'edit' | 'preview';

function rememberedNote(): string | null {
  try {
    return localStorage.getItem(OPEN_NOTE_KEY);
  } catch {
    return null;
  }
}

export function NotesView() {
  const store = useNotes();
  const { notes } = store;
  const { icon } = useStudy();
  const [openName, setOpenName] = useState(rememberedNote);
  const [mode, setMode] = useState<Mode>('edit');
  const [showGraph, setShowGraph] = useState(false);
  const [query, setQuery] = useState('');

  const open = openName ? findNote(notes, openName) : undefined;

  useEffect(() => {
    try {
      if (open) localStorage.setItem(OPEN_NOTE_KEY, open.name);
    } catch {
      // Storage blocked: just don't remember it.
    }
  }, [open]);

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
    setShowGraph(false);
    if (nextMode) setMode(nextMode);
  }

  /** Opens a note by name, creating it first if it doesn't exist yet. */
  function openOrCreate(name: string) {
    const existing = findNote(notes, name);
    if (existing) show(existing.name);
    else show(store.create(cleanNoteName(name)), 'edit');
  }

  const sorted = useMemo(() => [...notes].sort((first, second) => second.updated - first.updated), [notes]);
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
        <button
          type="button"
          className={cx('note-link', 'graph-link', showGraph && 'current')}
          onClick={() => setShowGraph((current) => !current)}
        >
          🕸️ Graph view
        </button>
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

      {showGraph ? (
        <Panel
          className="notes-main stack tight"
          title="Graph"
          aside={
            <Button size="small" ghost onClick={() => setShowGraph(false)}>
              Close
            </Button>
          }
        >
          {notes.length ? (
            <>
              <NoteGraph notes={notes} active={open?.name ?? null} onOpen={openOrCreate} />
              <p className="muted small-text">Click a dot to open it · drag to move · scroll to zoom</p>
            </>
          ) : (
            <div className="empty">No notes yet. Link notes with [[double brackets]] to grow the graph.</div>
          )}
        </Panel>
      ) : open ? (
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
                  Write in Markdown. Link notes with [[Note name]], and the graph shows how they connect.
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
