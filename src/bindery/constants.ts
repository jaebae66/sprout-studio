export interface CoverPalette {
  background: string;
  /** Pattern, dashed label border and colour-dot ring. */
  ink: string;
  /** Title text on the white label. */
  titleInk: string;
  /** Author text on the white label. */
  authorInk: string;
}

export const COVER_COLORS = {
  mint: { background: '#9fdcb2', ink: '#3fae6a', titleInk: '#1f3a2a', authorInk: '#3fae6a' },
  sage: { background: '#c7d9bf', ink: '#6f9a6b', titleInk: '#2c3a28', authorInk: '#6f9a6b' },
  matcha: { background: '#d3e6a3', ink: '#7aa22c', titleInk: '#2f3b13', authorInk: '#7aa22c' },
  forest: { background: '#2f7d55', ink: '#bfe8cf', titleInk: '#1f3a2a', authorInk: '#2f7d55' },
  blush: { background: '#f8d3dc', ink: '#3fae6a', titleInk: '#3a2a2f', authorInk: '#3fae6a' },
  cream: { background: '#fbf3dc', ink: '#5fa36f', titleInk: '#2b3a2f', authorInk: '#5fa36f' },
} satisfies Record<string, CoverPalette>;
export type CoverColorName = keyof typeof COVER_COLORS;

export const COVER_PATTERNS = ['leaves', 'dots', 'gingham', 'plain'] as const;
export type CoverPattern = (typeof COVER_PATTERNS)[number];

export const STICKERS = { sprout: '🌱', frog: '🐸', bunny: '🐰', book: '📖', star: '⭐', none: '' } as const;
export type StickerName = keyof typeof STICKERS;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const FREE_LIBRARIES = [
  {
    name: 'Project Gutenberg',
    description: 'Over 70,000 public-domain classics, with EPUBs for every book.',
    url: 'https://www.gutenberg.org/',
  },
  {
    name: 'Standard Ebooks',
    description: 'Beautifully formatted public-domain EPUBs with lovely covers.',
    url: 'https://standardebooks.org/',
  },
  {
    name: 'Open Library',
    description: 'Internet Archive’s library. Some books download, others you borrow.',
    url: 'https://openlibrary.org/',
  },
  {
    name: 'Project Gutenberg Australia',
    description: 'Books in the public domain under Australian copyright rules.',
    url: 'https://www.gutenberg.net.au/',
  },
];

/** Stylesheet bundled inside every EPUB we make. */
export const BOOK_CSS = [
  'body{font-family:serif;line-height:1.5;margin:0 5%}',
  'h1{font-family:sans-serif;color:#2f7d55;text-align:center;margin:1.5em 0 1em}',
  'h2,h3,h4,h5{font-family:sans-serif;color:#2f7d55}',
  'p{margin:0 0 .8em;text-indent:0}',
  '.cover{margin:0;padding:0;text-align:center}',
  '.cover img{max-width:100%;height:auto}',
].join('');

export const MAX_TITLE_LENGTH = 120;
export const WORDS_PER_MINUTE = 230;
