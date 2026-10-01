import { MAX_TITLE_LENGTH } from '../constants';
import type { ChapterContent, TextFormat } from '../types';
import { escapeHtml } from './html';

export function wordCount(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

/** Escapes one line of text and turns **bold** and *italic* markers into tags. */
function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Turns plain text into XHTML: blank lines split paragraphs, `# lines` become headings. */
export function textToHtml(text: string): string {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const heading = block.match(/^(#{1,4})\s+(.*)$/);
      if (heading && !block.includes('\n')) {
        const level = heading[1].length + 1;
        return `<h${level}>${formatInline(heading[2])}</h${level}>`;
      }
      return `<p>${block.split('\n').map(formatInline).join('<br/>')}</p>`;
    })
    .join('\n');
}

/** Lines such as "# Title", "Chapter 3" or "Chapter 3: Title" start a new chapter. */
const CHAPTER_HEADING = /^\s*(?:#{1,4}\s+|chapter\s+\d+\s*[:.\-]?\s*)(.+)?$/i;

function headingTitle(line: string, fallback: string): string {
  const title = line
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*chapter\s+\d+\s*[:.\-]?\s*/i, '')
    .trim();
  return (title || fallback).slice(0, MAX_TITLE_LENGTH);
}

interface DraftSection {
  title: string;
  body: string;
}

/** Splits pasted or uploaded text into chapters at each chapter heading. */
export function splitTextIntoChapters(text: string, fallbackTitle: string): ChapterContent[] {
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;

  for (const line of text.replace(/\r/g, '').split('\n')) {
    if (CHAPTER_HEADING.test(line)) {
      // Keep the previous section if it has text, or if it's a named section at the very start.
      const isNamedOpening = sections.length === 0 && current?.title !== fallbackTitle;
      if (current && (current.body.trim() || isNamedOpening)) sections.push(current);
      current = { title: headingTitle(line, fallbackTitle), body: '' };
    } else {
      if (!current) current = { title: fallbackTitle, body: '' };
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);

  return sections
    .filter((section) => section.body.trim() || section.title)
    .map((section) => ({
      title: section.title,
      html: textToHtml(section.body),
      words: wordCount(section.body),
    }));
}

const UNSAFE_ELEMENTS = 'script,style,link,meta,iframe,object,embed,form,noscript,img';

function isUnsafeAttribute({ name, value }: Attr): boolean {
  if (/^on/i.test(name) || name === 'style') return true;
  return /href|src/i.test(name) && /^(javascript|data):/i.test(value);
}

/** Cleans an HTML document down to safe XHTML for use as a chapter. */
export function htmlToChapter(source: string, fallbackTitle: string): ChapterContent {
  const doc = new DOMParser().parseFromString(source, 'text/html');

  doc.querySelectorAll(UNSAFE_ELEMENTS).forEach((element) => element.remove());
  doc.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (isUnsafeAttribute(attribute)) element.removeAttribute(attribute.name);
    }
  });

  const serializer = new XMLSerializer();
  const html = [...doc.body.childNodes]
    .map((node) =>
      node.nodeType === Node.TEXT_NODE ? escapeHtml(node.textContent ?? '') : serializer.serializeToString(node),
    )
    .join('')
    .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '');

  const heading = doc.querySelector('h1,h2,title');
  const title = (heading?.textContent || fallbackTitle).trim().slice(0, MAX_TITLE_LENGTH);

  return { title, html, words: wordCount(doc.body.textContent ?? '') };
}

function collapseWhitespace(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Flattens an element into readable plain text or Markdown, one block per paragraph. */
export function elementToText(root: Element, format: TextFormat): string {
  const markdown = format === 'markdown';
  const blocks: string[] = [];

  const walk = (parent: Element) => {
    for (const child of parent.children) {
      const tag = child.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const text = child.textContent?.trim() ?? '';
        if (text) blocks.push(markdown ? `${'#'.repeat(Number(tag[1]))} ${text}` : text.toUpperCase());
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
        const text = collapseWhitespace(child.textContent);
        if (text) blocks.push(markdown && tag === 'blockquote' ? `> ${text}` : text);
      } else if (tag === 'li') {
        const text = collapseWhitespace(child.textContent);
        if (text) blocks.push(`- ${text}`);
      } else if (child.children.length > 0) {
        walk(child);
      } else {
        const text = collapseWhitespace(child.textContent);
        if (text && tag !== 'script' && tag !== 'style') blocks.push(text);
      }
    }
  };

  walk(root);
  return blocks.join('\n\n');
}
