import { paperBackground } from '../../shared/lib/paper';
import { BOOK_FONTS, PAGE_COLORS } from '../constants';
import type { PageSettings } from '../types';

/** Line spacing of the book's text. Lined paper uses the same step, so writing sits on the lines. */
const LINE_HEIGHT = '1.6em';

/** The page background, text colour and font, as CSS declarations (for the book and its preview). */
export function pageDeclarations(page: PageSettings): Record<string, string> {
  const colors = PAGE_COLORS[page.color] ?? PAGE_COLORS.white;
  // Hex with an alpha suffix: the faint small squares on squared paper.
  const background = paperBackground(page.paper, colors.lines, LINE_HEIGHT, `${colors.lines}80`);
  return {
    'background-color': colors.paper,
    'background-image': background.image,
    ...(background.size && { 'background-size': background.size }),
    color: colors.text,
    'font-family': BOOK_FONTS[page.font]?.family ?? BOOK_FONTS.serif.family,
    'line-height': LINE_HEIGHT,
  };
}

/** The stylesheet bundled inside the EPUB. */
export function bookCss(page: PageSettings): string {
  const colors = PAGE_COLORS[page.color] ?? PAGE_COLORS.white;
  const body = Object.entries(pageDeclarations(page))
    .map(([property, value]) => `${property}:${value}`)
    .join(';');
  // On lined paper a blank line between paragraphs keeps the text on the lines.
  const paragraphGap = page.paper === 'lined' ? LINE_HEIGHT : '.8em';
  return [
    `html{background-color:${colors.paper}}`,
    `body{${body};margin:0;padding:1em 5%}`,
    `h1{color:${colors.heading};text-align:center;margin:1.5em 0 1em;line-height:1.3}`,
    `h2,h3,h4,h5{color:${colors.heading};line-height:1.3}`,
    `p{margin:0 0 ${paragraphGap};text-indent:0}`,
    `a{color:${colors.heading}}`,
    // The cover picture sits on a plain page, without paper lines behind it.
    'body.cover-page{background-image:none;padding:0}',
    '.cover{margin:0;padding:0;text-align:center}',
    '.cover img{max-width:100%;height:auto}',
  ].join('');
}
