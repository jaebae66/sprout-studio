import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import type { Note } from '../types';

/** `[[Name]]`, `[[Name#Heading]]` or `[[Name|shown text]]`. */
const WIKILINK = /\[\[([^\]|#\n]+)(#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/g;
const WIKILINK_AT_START = new RegExp(`^${WIKILINK.source}`);

/** Characters Windows won't allow in a file name, plus the ones that would break a [[link]]. */
const UNSAFE_NAME = /[\\/:*?"<>|#^[\]\n\r\t]+/g;

/** Names are matched like file names on Windows: ignoring case. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Tidies a typed title into something usable as a note (and file) name. */
export function cleanNoteName(name: string): string {
  return name.replace(UNSAFE_NAME, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 120);
}

export function findNote(notes: readonly Note[], name: string): Note | undefined {
  const key = nameKey(name);
  return notes.find((note) => nameKey(note.name) === key);
}

/** "Untitled", or "Untitled 2" and so on if that's taken. */
export function uniqueNoteName(notes: readonly Note[], base: string): string {
  const name = cleanNoteName(base) || 'Untitled';
  if (!findNote(notes, name)) return name;
  for (let count = 2; ; count++) {
    if (!findNote(notes, `${name} ${count}`)) return `${name} ${count}`;
  }
}

/** The names a note links to, lower-cased and without repeats. */
export function linkedNames(body: string): Set<string> {
  return new Set(Array.from(body.matchAll(WIKILINK), (match) => nameKey(match[1])));
}

/** Notes that link to `name`. */
export function backlinks(notes: readonly Note[], name: string): Note[] {
  const key = nameKey(name);
  return notes.filter((note) => nameKey(note.name) !== key && linkedNames(note.body).has(key));
}

/** Points every [[oldName…]] link in `body` at `newName`, keeping headings and shown text. */
export function retargetLinks(body: string, oldName: string, newName: string): string {
  const key = nameKey(oldName);
  return body.replace(WIKILINK, (link, target: string, heading = '', shown?: string) =>
    nameKey(target) === key ? `[[${newName}${heading}${shown ? `|${shown}` : ''}]]` : link,
  );
}

export interface NoteMatch {
  note: Note;
  /** A short piece of the body around the first match, or '' if only the name matched. */
  snippet: string;
}

export function searchNotes(notes: readonly Note[], query: string): NoteMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return notes.flatMap((note) => {
    if (note.name.toLowerCase().includes(needle)) return [{ note, snippet: '' }];
    const at = note.body.toLowerCase().indexOf(needle);
    if (at < 0) return [];
    const start = Math.max(0, at - 30);
    const snippet = `${start ? '…' : ''}${note.body.slice(start, at + needle.length + 50).replace(/\s+/g, ' ')}…`;
    return [{ note, snippet }];
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

interface WikilinkToken {
  type: 'wikilink';
  raw: string;
  target: string;
  shown: string;
}

/** The notes the current render resolves links against. */
let linkTargets: readonly Note[] = [];

const markdown = new Marked({ async: false, gfm: true, breaks: true }).use({
  extensions: [
    {
      name: 'wikilink',
      level: 'inline',
      start: (source: string) => source.indexOf('[['),
      tokenizer(source: string): WikilinkToken | undefined {
        const match = WIKILINK_AT_START.exec(source);
        if (!match) return undefined;
        return { type: 'wikilink', raw: match[0], target: match[1].trim(), shown: (match[3] ?? match[1]).trim() };
      },
      renderer(token) {
        const { target, shown } = token as unknown as WikilinkToken;
        const missing = findNote(linkTargets, target) ? '' : ' missing';
        return `<a href="#" class="wikilink${missing}" data-note="${escapeHtml(target)}">${escapeHtml(shown)}</a>`;
      },
    },
  ],
});

/**
 * Markdown to safe HTML. [[Links]] become `<a data-note="…">`, marked `missing`
 * when no note has that name yet. Clicks are handled by the preview.
 */
export function renderNote(body: string, notes: readonly Note[]): string {
  linkTargets = notes;
  return DOMPurify.sanitize(markdown.parse(body) as string);
}
