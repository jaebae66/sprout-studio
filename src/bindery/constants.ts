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

/** Page colours for the inside of the book. Colours are hex so they work in every e-reader. */
export const PAGE_COLORS = {
  white: { label: 'White', paper: '#ffffff', text: '#1f2a24', lines: '#c9d6ce', heading: '#2f7d55' },
  cream: { label: 'Cream', paper: '#fbf5e6', text: '#2e2a22', lines: '#e2d6b8', heading: '#7a5c2e' },
  mint: { label: 'Mint', paper: '#eef8f0', text: '#1f3a2a', lines: '#bfe0c9', heading: '#2f7d55' },
  blush: { label: 'Blush', paper: '#fdf0f3', text: '#3a2a2f', lines: '#f0c9d3', heading: '#b4546e' },
  sky: { label: 'Sky', paper: '#eef5fc', text: '#1f2c3a', lines: '#c4d8ee', heading: '#2f6497' },
  lilac: { label: 'Lilac', paper: '#f4f0fb', text: '#2c2540', lines: '#d8cdef', heading: '#6a4fa3' },
  night: { label: 'Night', paper: '#1b1f24', text: '#e4e8ec', lines: '#3a424c', heading: '#8fd3a8' },
} satisfies Record<string, { label: string; paper: string; text: string; lines: string; heading: string }>;
export type PageColorName = keyof typeof PAGE_COLORS;

/** Generic font families only: e-readers swap in their own fonts for these. */
export const BOOK_FONTS = {
  serif: { label: 'Classic', family: 'Georgia, serif' },
  sans: { label: 'Clean', family: 'Helvetica, Arial, sans-serif' },
  handwritten: { label: 'Handwritten', family: '"Comic Sans MS", "Segoe Print", cursive' },
  typewriter: { label: 'Typewriter', family: '"Courier New", monospace' },
} satisfies Record<string, { label: string; family: string }>;
export type BookFontName = keyof typeof BOOK_FONTS;

export const MAX_TITLE_LENGTH = 120;
export const WORDS_PER_MINUTE = 230;
