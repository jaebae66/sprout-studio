/**
 * The note-taking stationery: highlighter colours, cards (Obsidian callouts), stickers,
 * page templates and sticky-note colours. Everything is written into notes as plain
 * Markdown that Obsidian understands too.
 */

/** Yellow is Obsidian's own ==highlight==; the others are <mark class="hl-…">, which Obsidian shows as a highlight too. */
export const HIGHLIGHTERS = [
  { id: 'yellow', label: 'Yellow', swatch: '#ffe066' },
  { id: 'pink', label: 'Pink', swatch: '#ffadd2' },
  { id: 'green', label: 'Green', swatch: '#a8e6a1' },
  { id: 'blue', label: 'Blue', swatch: '#a5d8ff' },
  { id: 'purple', label: 'Purple', swatch: '#d0bfff' },
  { id: 'orange', label: 'Orange', swatch: '#ffc078' },
] as const;
export type HighlighterId = (typeof HIGHLIGHTERS)[number]['id'];

/** The markers that wrap highlighted text in a colour. */
export function highlightMarkers(color: HighlighterId): [string, string] {
  return color === 'yellow' ? ['==', '=='] : [`<mark class="hl-${color}">`, '</mark>'];
}

/** Cards you can put in a note. Written as Obsidian callouts: `> [!tip] Title`. */
export const CARDS = [
  { type: 'note', icon: '📝', label: 'Memo' },
  { type: 'tip', icon: '💡', label: 'Tip' },
  { type: 'important', icon: '⭐', label: 'Key idea' },
  { type: 'question', icon: '❓', label: 'Question' },
  { type: 'warning', icon: '⚠️', label: 'Careful' },
  { type: 'todo', icon: '✅', label: 'To do' },
  { type: 'summary', icon: '🌱', label: 'Summary' },
  { type: 'quote', icon: '💬', label: 'Quote' },
] as const;
export type CardType = (typeof CARDS)[number]['type'];

export function cardFor(type: string) {
  return CARDS.find((card) => card.type === type.toLowerCase()) ?? CARDS[0];
}

/** A card as Markdown, holding `content` (or a line to type into). */
export function cardMarkdown(type: CardType, content = ''): string {
  const body = content.split('\n').map((line) => `> ${line}`);
  return [`> [!${type}] ${cardFor(type).label}`, ...body].join('\n');
}

export const STICKERS = ['⭐', '🌱', '🌸', '💡', '📌', '✅', '❗', '❓', '💖', '✨', '🍀', '🔥', '📚', '☕', '🐸', '🐰', '🍓', '🎀'];

function today(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Page layouts for common kinds of notes. `{title}` becomes the note's name. */
export const TEMPLATES: readonly { id: string; label: string; icon: string; build: (title: string) => string }[] = [
  {
    id: 'cornell',
    label: 'Cornell notes',
    icon: '📓',
    build: (title) =>
      `# ${title}\n*${today()}*\n\n> [!question] Cues & questions\n> - \n\n## Notes\n- \n\n> [!summary] Summary\n> `,
  },
  {
    id: 'lecture',
    label: 'Lecture notes',
    icon: '🎓',
    build: (title) =>
      `# ${title}\n*${today()}* · Subject: \n\n## Key points\n- \n\n## Details\n\n\n> [!important] Remember\n> \n\n## Questions to follow up\n- [ ] `,
  },
  {
    id: 'revision',
    label: 'Revision summary',
    icon: '🧠',
    build: (title) =>
      `# ${title}\n\n## Key terms\n- ==Term==: meaning\n\n## Main ideas\n1. \n\n> [!tip] Memory trick\n> \n\n## Practice questions\n- [ ] `,
  },
  {
    id: 'reading',
    label: 'Reading notes',
    icon: '📖',
    build: (title) =>
      `# ${title}\n**Book / article:** \n**Author:** \n\n## Summary\n\n\n> [!quote] Favourite quote\n> \n\n## My thoughts\n- `,
  },
  {
    id: 'todo',
    label: 'To-do list',
    icon: '✅',
    build: (title) => `# ${title}\n*${today()}*\n\n## Must do\n- [ ] \n\n## Should do\n- [ ] \n\n## Nice to do\n- [ ] `,
  },
];

/** Sticky-note colours: paper and a slightly darker edge for the top strip. */
export const STICKY_COLORS = {
  yellow: { paper: '#fff3a3', edge: '#f5dc5c' },
  pink: { paper: '#ffd6e5', edge: '#f7a8c6' },
  mint: { paper: '#ccf2d9', edge: '#93dcae' },
  blue: { paper: '#d4e9ff', edge: '#9cc7f5' },
  lilac: { paper: '#e6dcff', edge: '#c1aef5' },
  peach: { paper: '#ffe1cc', edge: '#f8b98c' },
} as const;
export type StickyColor = keyof typeof STICKY_COLORS;
