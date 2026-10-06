import type { Flashcard, Note, Subject, Task } from '../types';
import { buildKeywordIndex, relation, RELATED_SCORE, topKeywords, type KeywordIndex } from './keywords';
import { cleanNoteName, nameKey } from './notes';

/**
 * Study guides: one note per class (subject), gathered automatically from your other
 * notes. The part between the markers below is rewritten whenever your notes change;
 * anything else in the guide note is yours and is never touched.
 */
export const GUIDE_START = '<!-- study-guide:start (Sprout Studio rewrites this part; write below it) -->';
export const GUIDE_END = '<!-- study-guide:end -->';

/** The study guide note's name for a class: "BIO101 Study Guide". */
export function guideName(subject: Pick<Subject, 'code' | 'name'>): string {
  return cleanNoteName(`${subject.code || subject.name} Study Guide`);
}

export function isGuide(note: Note, subjects: readonly Subject[]): boolean {
  return subjects.some((subject) => nameKey(guideName(subject)) === nameKey(note.name));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "BIO101" also matches "BIO 101", "bio-101" and the tag "#BIO101". */
function codePattern(code: string): RegExp | null {
  const compact = code.replace(/[\s_-]+/g, '');
  if (compact.length < 2) return null;
  const parts = compact.match(/[a-z]+|\d+|[^a-z\d]+/gi) ?? [compact];
  return new RegExp(`(^|[^a-z0-9])#?${parts.map(escapeRegExp).join('[\\s_-]?')}(?![a-z0-9])`, 'i');
}

/**
 * Whether a note is about a class: it mentions the class code (in the title or text),
 * or the class name. One-word names like "Cells" are everyday words, so they only count
 * for classes without a code; "Cell Biology" always counts.
 */
export function mentionsSubject(note: Note, subject: Pick<Subject, 'code' | 'name'>): boolean {
  const text = `${note.name}\n${note.body}`;
  const code = subject.code ? codePattern(subject.code) : null;
  if (code?.test(text)) return true;
  const name = subject.name.trim();
  const distinctive = /\s/.test(name) || !code;
  return distinctive && name.length >= 4 && new RegExp(`(^|[^a-z0-9])${escapeRegExp(name)}(?![a-z0-9])`, 'i').test(text);
}

export interface ClassNotes {
  /** Notes that mention the class. */
  notes: Note[];
  /** Notes that don't, but share a lot of keywords with ones that do. */
  maybe: { note: Note; shared: string[] }[];
}

/** Which notes belong to a class. */
export function notesForSubject(subject: Subject, allNotes: readonly Note[], subjects: readonly Subject[], index?: KeywordIndex): ClassNotes {
  const candidates = allNotes.filter((note) => !isGuide(note, subjects));
  const members = candidates.filter((note) => mentionsSubject(note, subject));
  const keywords = index ?? buildKeywordIndex(candidates);
  const maybe = candidates
    .filter((note) => !members.includes(note))
    .map((note) => {
      const best = members
        .map((member) => relation(keywords, member.name, note.name))
        .sort((first, second) => second.score - first.score)[0];
      return { note, best };
    })
    .filter(({ best }) => best && best.score >= RELATED_SCORE * 1.5 && best.shared.length >= 2)
    .map(({ note, best }) => ({ note, shared: best!.shared.slice(0, 3) }));
  return { notes: members, maybe };
}

/* ---------- Gathering from notes ---------- */

/** A line without its Markdown codes, for showing as context. */
function tidy(line: string): string {
  return line
    .replace(/^\s*(?:>\s*)?(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|#{1,6}\s+)?/, '')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/<mark[^>]*>([^<]*)<\/mark>/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

export interface KeyTerm {
  term: string;
  /** What's written after it ("Term: meaning"), if anything. */
  meaning: string;
  /** The whole line, tidied, for context. */
  line: string;
  from: string;
}

/** Highlighted and bold words, with the line they're on. "==Term==: meaning" gives a meaning too. */
export function keyTerms(notes: readonly Note[]): KeyTerm[] {
  const found = new Map<string, KeyTerm>();
  for (const note of notes) {
    for (const line of note.body.split('\n')) {
      for (const match of line.matchAll(/==([^=\n]+)==|<mark[^>]*>([^<\n]+)<\/mark>|\*\*([^*\n]+)\*\*/g)) {
        const term = (match[1] ?? match[2] ?? match[3]).trim();
        const key = term.toLowerCase();
        if (!term || term.length > 60 || found.has(key)) continue;
        const after = line.slice(match.index! + match[0].length);
        const meaning = /^\s*(?::|—|–|-|=)\s*(.+)$/.exec(after)?.[1].trim() ?? '';
        found.set(key, { term, meaning: tidy(meaning), line: tidy(line), from: note.name });
      }
    }
  }
  return [...found.values()];
}

interface Card {
  type: string;
  title: string;
  body: string[];
  from: string;
}

/** Cards (callouts) in the notes: `> [!type] Title` and the quoted lines after it. */
function cardsIn(notes: readonly Note[]): Card[] {
  const cards: Card[] = [];
  for (const note of notes) {
    let current: Card | null = null;
    for (const line of note.body.split('\n')) {
      const start = /^>\s*\[!(\w+)\][+-]?\s*(.*)$/.exec(line);
      if (start) {
        current = { type: start[1].toLowerCase(), title: start[2].trim(), body: [], from: note.name };
        cards.push(current);
      } else if (current && /^>/.test(line)) {
        const text = line.replace(/^>\s?/, '').trim();
        if (text) current.body.push(text);
      } else {
        current = null;
      }
    }
  }
  return cards;
}

/** Questions: question cards, plus any line that ends with a question mark. */
function questions(notes: readonly Note[]): { text: string; from: string }[] {
  const found = new Map<string, { text: string; from: string }>();
  const add = (text: string, from: string) => {
    const clean = tidy(text);
    if (clean.length > 3 && !found.has(clean.toLowerCase())) found.set(clean.toLowerCase(), { text: clean, from });
  };
  for (const card of cardsIn(notes).filter((card) => card.type === 'question')) {
    const asked = card.body.filter((line) => line.replace(/^[-*+]\s*/, '').trim());
    if (card.title.endsWith('?')) add(card.title, card.from);
    asked.forEach((line) => add(line, card.from));
  }
  for (const note of notes) {
    for (const line of note.body.split('\n')) {
      if (/\?\s*$/.test(line) && !/^>\s*\[!/.test(line) && !/^>/.test(line)) add(line, note.name);
    }
  }
  return [...found.values()];
}

/** The first proper sentence of a note, as a one-line summary. */
function summaryOf(note: Note): string {
  const line = note.body
    .split('\n')
    .map((each) => tidy(each.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_m, target: string, shown?: string) => shown ?? target)))
    .find((each) => each.length > 12 && !/^\[!/.test(each) && !/^[*_]/.test(each));
  if (!line) return '';
  return line.length > 110 ? `${line.slice(0, 107).trimEnd()}…` : line;
}

function sameClass(task: Task, subject: Subject): boolean {
  const unit = task.unit.trim().toLowerCase();
  return Boolean(unit) && (unit === subject.code.trim().toLowerCase() || unit === subject.name.trim().toLowerCase());
}

/* ---------- The guide ---------- */

export interface GuideInput {
  subject: Subject;
  notes: readonly Note[];
  subjects: readonly Subject[];
  tasks: readonly Task[];
  cards: readonly Flashcard[];
}

/** The automatic part of a class's study guide, as Markdown (without the markers). */
export function buildGuideSection({ subject, notes, subjects, tasks, cards }: GuideInput): string {
  const { notes: members, maybe } = notesForSubject(subject, notes, subjects);
  const sorted = [...members].sort((first, second) => first.name.localeCompare(second.name));
  const terms = keyTerms(sorted).slice(0, 40);
  const ideas = cardsIn(sorted).filter((card) => ['important', 'summary', 'tip', 'note'].includes(card.type));
  const asked = questions(sorted);
  const openTasks = tasks.filter((task) => !task.done && sameClass(task, subject));
  const termKeys = new Set(terms.map((term) => term.term.toLowerCase()));
  const matchingCards = cards.filter((card) => termKeys.has(card.q.trim().toLowerCase()));
  const index = buildKeywordIndex(notes.filter((note) => !isGuide(note, subjects)));
  const topics = [...new Set(sorted.flatMap((note) => topKeywords(index, note.name, 4)))].slice(0, 12);
  const title = subject.code && subject.name ? `${subject.code} – ${subject.name}` : subject.code || subject.name;

  const out: string[] = [`# ${title} study guide 📘`, ''];
  if (!sorted.length) {
    out.push(
      `> [!tip] Getting started`,
      `> Mention **${subject.code || subject.name}** in any note (or tag it #${(subject.code || subject.name).replace(/\s+/g, '')}) and it will show up here, with its key terms, ideas and questions.`,
      '',
    );
  }

  if (sorted.length) {
    out.push(`## 📚 Notes for this class (${sorted.length})`);
    for (const note of sorted) {
      const summary = summaryOf(note);
      out.push(`- [[${note.name}]]${summary ? ` — ${summary}` : ''}`);
    }
    out.push('');
  }

  if (topics.length) out.push(`## 🧭 Main topics`, topics.map((topic) => `\`${topic}\``).join(' · '), '');

  if (terms.length) {
    out.push('## 🔑 Key terms');
    for (const term of terms) {
      const detail = term.meaning || (term.line !== term.term ? term.line : '');
      out.push(`- ==${term.term}==${detail ? `: ${detail}` : ''} *([[${term.from}]])*`);
    }
    out.push('');
  }

  if (ideas.length) {
    out.push('## ⭐ Key ideas');
    for (const idea of ideas) {
      out.push(`> [!${idea.type}] ${idea.title || 'Key idea'} — from [[${idea.from}]]`);
      for (const line of idea.body) out.push(`> ${line}`);
      out.push('');
    }
  }

  if (asked.length) {
    out.push('## ❓ Questions to review');
    for (const question of asked) out.push(`- [ ] ${question.text} *([[${question.from}]])*`);
    out.push('');
  }

  if (openTasks.length) {
    out.push('## 🗓️ Coming up (from your planner)');
    for (const task of openTasks) out.push(`- ${task.title}${task.due ? ` — due ${task.due}` : ''}`);
    out.push('');
  }

  if (matchingCards.length) {
    out.push(`## 🍀 Flashcards (${matchingCards.length})`, matchingCards.map((card) => card.q).join(' · '), '');
  }

  if (maybe.length) {
    out.push('## 🔗 Might be related');
    for (const { note, shared } of maybe) out.push(`- [[${note.name}]] — shares ${shared.map((word) => `\`${word}\``).join(', ')}`);
    out.push('');
  }

  return out.join('\n').trimEnd();
}

/**
 * The whole guide note: the automatic section rebuilt in place, keeping everything the
 * user wrote outside it. A guide without markers (brand new) gets a "My notes" space.
 */
export function mergeGuide(existing: string | null, section: string): string {
  const start = existing?.indexOf(GUIDE_START) ?? -1;
  const end = existing?.indexOf(GUIDE_END) ?? -1;
  const old = existing !== null && start >= 0 && end > start ? existing.slice(start, end) : '';
  // Questions you've ticked off stay ticked when the guide is rebuilt.
  const ticked = new Set(Array.from(old.matchAll(/^- \[[xX]\] (.+)$/gm), (match) => match[1]));
  const kept = section.replace(/^- \[ \] (.+)$/gm, (line, text: string) => (ticked.has(text) ? `- [x] ${text}` : line));
  const block = `${GUIDE_START}\n${kept}\n${GUIDE_END}`;
  if (existing !== null && old) return existing.slice(0, start) + block + existing.slice(end + GUIDE_END.length);
  const mine = existing?.trim() ? existing.trim() : '## ✏️ My notes\n- ';
  return `${block}\n\n${mine}`;
}

/** New flashcards from key terms written as "==Term==: meaning", skipping terms that already have a card. */
export function flashcardsFromTerms(notes: readonly Note[], existing: readonly Flashcard[]): { q: string; a: string }[] {
  const have = new Set(existing.map((card) => card.q.trim().toLowerCase()));
  return keyTerms(notes)
    .filter((term) => term.meaning && !have.has(term.term.toLowerCase()))
    .map((term) => ({ q: term.term, a: term.meaning }));
}
