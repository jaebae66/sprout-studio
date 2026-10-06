import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import type { Note } from '../types';
import { cardFor } from './stationery';

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
    {
      // ==highlighted text==, as in Obsidian.
      name: 'highlight',
      level: 'inline',
      start: (source: string) => source.indexOf('=='),
      tokenizer(source: string) {
        const match = /^==(?!=)([^\n]+?)==(?!=)/.exec(source);
        if (!match) return undefined;
        return { type: 'highlight', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
      },
      renderer(token) {
        return `<mark>${this.parser.parseInline(token.tokens ?? [])}</mark>`;
      },
    },
  ],
});

/** `[!tip] Title` at the start of a quote turns it into a card (an Obsidian callout). */
const CALLOUT = /^\[!(\w+)\][+-]?[ \t]*/;

/**
 * Turns `> [!type] Title` quotes into cards, and makes checklist boxes clickable
 * (each knows its number, for toggleTask). Works on already-sanitised HTML, moving
 * existing elements around rather than adding any new markup from the note.
 */
function decorate(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const root = template.content;

  for (const quote of Array.from(root.querySelectorAll('blockquote'))) {
    const first = quote.firstElementChild;
    // Usually a paragraph; a heading when the next line is just "-" or "=" (Markdown reads that as underlining).
    const lead = first && /^(P|H[1-6])$/.test(first.tagName) ? first.firstChild : null;
    const match = lead?.nodeType === Node.TEXT_NODE ? CALLOUT.exec(lead.textContent ?? '') : null;
    if (!first || !lead || !match) continue;
    const card = cardFor(match[1]);
    lead.textContent = (lead.textContent ?? '').slice(match[0].length);

    // The title is everything on the first line, up to the first line break.
    const title = document.createElement('div');
    title.className = 'callout-title';
    const icon = document.createElement('span');
    icon.className = 'callout-icon';
    icon.textContent = card.icon;
    title.append(icon);
    while (first.firstChild && first.firstChild.nodeName !== 'BR') title.append(first.firstChild);
    first.firstChild?.remove();
    if (!title.textContent?.replace(card.icon, '').trim()) title.append(card.label);
    if (!first.textContent?.trim() && !first.querySelector('img, input')) first.remove();

    const box = document.createElement('div');
    box.className = `callout callout-${card.type}`;
    const content = document.createElement('div');
    content.className = 'callout-body';
    content.append(...Array.from(quote.childNodes));
    box.append(title, content);
    quote.replaceWith(box);
  }

  root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((box, index) => {
    box.removeAttribute('disabled');
    box.dataset.task = String(index);
    box.setAttribute('aria-label', box.checked ? 'Done' : 'Not done');
    box.closest('li')?.classList.add('task', ...(box.checked ? ['done'] : []));
  });

  return template.innerHTML;
}

/**
 * Markdown to safe HTML. [[Links]] become `<a data-note="…">`, marked `missing`
 * when no note has that name yet; ==highlights== become <mark>; callouts become
 * cards. Clicks (links and checkboxes) are handled by the preview.
 */
export function renderNote(body: string, notes: readonly Note[]): string {
  linkTargets = notes;
  return decorate(DOMPurify.sanitize(markdown.parse(body) as string));
}
