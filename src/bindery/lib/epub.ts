import JSZip from 'jszip';
import { BOOK_CSS, MAX_TITLE_LENGTH } from '../constants';
import type { BookDetails, Chapter, ChapterContent, OpenedEpub, TextFormat } from '../types';
import { escapeHtml } from './html';
import { elementToText, htmlToChapter } from './text';

/* ---------- Making an EPUB ---------- */

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const chapterFile = (index: number) => `ch${index + 1}.xhtml`;

interface BuildEpubInput {
  book: BookDetails;
  chapters: Chapter[];
  coverJpeg: Blob;
}

interface BookMetadata {
  id: string;
  title: string;
  author: string;
  language: string;
  description: string;
  modified: string;
}

export async function buildEpub({ book, chapters, coverJpeg }: BuildEpubInput): Promise<Blob> {
  const metadata: BookMetadata = {
    id: createBookId(),
    title: book.title.trim() || 'Untitled',
    author: book.author.trim() || 'Unknown',
    language: book.language,
    description: book.description.trim(),
    modified: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  };
  const { title, language } = metadata;

  const zip = new JSZip();
  // The mimetype file must come first and stay uncompressed.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', CONTAINER_XML);

  const content = zip.folder('OEBPS');
  if (!content) throw new Error('Could not create the book folder');

  content.file('style.css', BOOK_CSS);
  content.file('images/cover.jpg', coverJpeg);
  content.file(
    'cover.xhtml',
    xhtmlPage('Cover', `<div class="cover"><img src="images/cover.jpg" alt="${escapeHtml(title)}"/></div>`, language),
  );
  chapters.forEach((chapter, index) => {
    const body = `<section epub:type="chapter"><h1>${escapeHtml(chapter.title)}</h1>\n${chapter.html}</section>`;
    content.file(chapterFile(index), xhtmlPage(chapter.title, body, language));
  });
  content.file('nav.xhtml', xhtmlPage('Contents', navBody(chapters), language));
  content.file('toc.ncx', ncxDocument(metadata, chapters));
  content.file('content.opf', packageDocument(metadata, chapters.length));

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
}

function createBookId(): string {
  const unique =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `urn:uuid:${unique}`;
}

function xhtmlPage(title: string, body: string, language: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">`,
    `<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>`,
    `<body>${body}</body>`,
    '</html>',
  ].join('\n');
}

function navBody(chapters: Chapter[]): string {
  const items = chapters
    .map((chapter, index) => `<li><a href="${chapterFile(index)}">${escapeHtml(chapter.title)}</a></li>`)
    .join('');
  return `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${items}</ol></nav>`;
}

function ncxDocument({ id, title }: BookMetadata, chapters: Chapter[]): string {
  const navPoints = chapters
    .map(
      (chapter, index) =>
        `    <navPoint id="n${index + 1}" playOrder="${index + 1}"><navLabel><text>${escapeHtml(chapter.title)}</text></navLabel><content src="${chapterFile(index)}"/></navPoint>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${id}"/></head>
  <docTitle><text>${escapeHtml(title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

function packageDocument(
  { id, title, author, language, description, modified }: BookMetadata,
  chapterCount: number,
): string {
  const indexes = Array.from({ length: chapterCount }, (_, index) => index);
  const manifestItems = indexes
    .map((index) => `    <item id="ch${index + 1}" href="${chapterFile(index)}" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spineItems = indexes.map((index) => `    <itemref idref="ch${index + 1}"/>`).join('\n');
  const descriptionTag = description ? `\n    <dc:description>${escapeHtml(description)}</dc:description>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>${language}</dc:language>${descriptionTag}
    <meta property="dcterms:modified">${modified}</meta>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="cover-img" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover" linear="yes"/>
${spineItems}
  </spine>
</package>`;
}

/* ---------- Opening an EPUB ---------- */

/** Thrown when the EPUB is DRM-protected (font obfuscation alone is fine). */
export class EpubLockedError extends Error {}

function parseXml(source: string): Document {
  return new DOMParser().parseFromString(source, 'application/xml');
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`Missing ${path}`);
  return file.async('string');
}

export async function readEpub(file: File): Promise<OpenedEpub> {
  const zip = await JSZip.loadAsync(file);

  const encryption = zip.file('META-INF/encryption.xml');
  if (encryption) {
    const xml = await encryption.async('string');
    if (/EncryptedData/.test(xml) && !/obfuscation/i.test(xml)) throw new EpubLockedError();
  }

  const container = parseXml(await readZipText(zip, 'META-INF/container.xml'));
  const packagePath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!packagePath) throw new Error('No package document');
  const basePath = packagePath.includes('/') ? packagePath.replace(/[^/]+$/, '') : '';
  const packageDoc = parseXml(await readZipText(zip, packagePath));

  const metadata = (tag: string) => packageDoc.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? '';

  const manifest = new Map<string, string>();
  for (const item of packageDoc.getElementsByTagNameNS('*', 'item')) {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) manifest.set(id, href);
  }

  const sections: HTMLElement[] = [];
  for (const itemref of packageDoc.getElementsByTagNameNS('*', 'itemref')) {
    const href = manifest.get(itemref.getAttribute('idref') ?? '');
    if (!href) continue;
    const entry = zip.file(decodeURIComponent(basePath + href.split('#')[0]));
    if (!entry) continue;
    const page = new DOMParser().parseFromString(await entry.async('string'), 'text/html');
    sections.push(page.body);
  }

  return {
    title: metadata('title') || file.name.replace(/\.epub$/i, ''),
    author: metadata('creator'),
    sections,
  };
}

/** The whole book as one plain-text or Markdown document. */
export function epubToText({ title, author, sections }: OpenedEpub, format: TextFormat): string {
  const markdown = format === 'markdown';
  const heading = markdown
    ? `# ${title}\n${author ? `\n*${author}*\n` : ''}`
    : `${title}${author ? `\nby ${author}` : ''}`;
  const separator = markdown ? '\n\n---\n\n' : '\n\n* * *\n\n';
  const body = sections
    .map((section) => elementToText(section, format))
    .filter(Boolean)
    .join(separator);
  return `${heading}\n\n${body}`;
}

/** Turns an opened EPUB's sections back into editable chapters, skipping empty ones. */
export function sectionsToChapters(sections: HTMLElement[]): ChapterContent[] {
  return sections
    .map((body, index) => {
      const heading = body.querySelector('h1,h2,h3')?.textContent?.trim();
      return {
        ...htmlToChapter(body.innerHTML, ''),
        title: (heading || `Section ${index + 1}`).slice(0, MAX_TITLE_LENGTH),
      };
    })
    .filter((chapter) => chapter.words > 0);
}
