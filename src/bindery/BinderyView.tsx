import { useRef, useState } from 'react';
import { Panel } from '../shared/components/Panel';
import { downloadBlob, toSafeFilename } from '../shared/lib/download';
import { BookDetailsForm } from './components/BookDetailsForm';
import { ChaptersPanel } from './components/ChaptersPanel';
import { CoverDesigner } from './components/CoverDesigner';
import { EpubConverter } from './components/EpubConverter';
import { FreeBookShelf } from './components/FreeBookShelf';
import { PageDesigner } from './components/PageDesigner';
import { useChapters } from './hooks/useChapters';
import { readChapterFiles } from './lib/chapterFiles';
import { canvasToJpeg } from './lib/cover';
import { buildEpub, EpubLockedError, epubToText, readEpub, sectionsToChapters } from './lib/epub';
import { splitTextIntoChapters } from './lib/text';
import type { BookDetails, ConversionState, CoverSettings, OpenedEpub, PageSettings, TextFormat } from './types';

const INITIAL_BOOK: BookDetails = { title: 'Untitled Book', author: '', language: 'en', description: '' };
const INITIAL_COVER: CoverSettings = { color: 'mint', pattern: 'leaves', sticker: 'sprout', imageUrl: '' };
const INITIAL_PAGE: PageSettings = { paper: 'plain', color: 'white', font: 'serif' };

const addedMessage = (count: number) => `Added ${count} chapter${count === 1 ? '' : 's'} 🍃`;

interface BinderyViewProps {
  notify: (message: string) => void;
}

/** Sprout Bindery: makes EPUBs from text, and turns EPUBs back into text. */
export function BinderyView({ notify }: BinderyViewProps) {
  const [book, setBook] = useState(INITIAL_BOOK);
  const [cover, setCover] = useState(INITIAL_COVER);
  const [page, setPage] = useState(INITIAL_PAGE);
  const [conversion, setConversion] = useState<ConversionState | null>(null);
  const chapters = useChapters();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  /* ---------- Book & cover ---------- */

  function updateBook<K extends keyof BookDetails>(field: K, value: BookDetails[K]) {
    setBook((current) => ({ ...current, [field]: value }));
  }

  function updateCover(patch: Partial<CoverSettings>) {
    setCover((current) => ({ ...current, ...patch }));
  }

  function handleCoverImage(file: File | null) {
    if (cover.imageUrl) URL.revokeObjectURL(cover.imageUrl);
    updateCover({ imageUrl: file ? URL.createObjectURL(file) : '' });
  }

  /* ---------- Chapters ---------- */

  async function handleAddFiles(files: File[]) {
    const { chapters: added, skipped } = await readChapterFiles(files);
    if (added.length) {
      chapters.append(added);
      notify(addedMessage(added.length));
    } else if (skipped.length) {
      notify(`Skipped ${skipped.join(', ')}: use .txt, .md or .html`);
    }
  }

  function handleAddText(text: string): boolean {
    if (!text.trim()) {
      notify('Paste some text first');
      return false;
    }
    const added = splitTextIntoChapters(text, `Chapter ${chapters.items.length + 1}`);
    chapters.append(added);
    notify(addedMessage(added.length));
    return true;
  }

  function handleRemoveAll() {
    if (!chapters.items.length) return;
    chapters.clear();
    notify('All chapters removed');
  }

  async function handleMakeEpub() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      await document.fonts.ready;
      const coverJpeg = await canvasToJpeg(canvas);
      const epub = await buildEpub({ book, chapters: chapters.items, coverJpeg, page });
      const filename = `${toSafeFilename(book.title.trim() || 'Untitled', 'book')}.epub`;
      downloadBlob(filename, epub);
      notify(`Saved ${filename} 🌸`);
    } catch {
      notify('Something went wrong while binding the book');
    }
  }

  /* ---------- EPUB converter ---------- */

  async function handleOpenEpub(file: File) {
    setConversion({ status: 'loading', filename: file.name });
    try {
      const epub = await readEpub(file);
      setConversion({ status: 'ready', filename: file.name, ...epub });
    } catch (error) {
      const message =
        error instanceof EpubLockedError
          ? 'This EPUB is locked with DRM, so it can’t be opened here.'
          : 'That file doesn’t look like a working EPUB. Try another one.';
      setConversion({ status: 'error', filename: file.name, message });
    }
  }

  function handleDownloadText(epub: OpenedEpub, format: TextFormat) {
    const extension = format === 'markdown' ? '.md' : '.txt';
    const filename = `${toSafeFilename(epub.title, 'book')}${extension}`;
    downloadBlob(filename, new Blob([epubToText(epub, format)], { type: 'text/plain' }));
    notify(`Saved ${filename} 🌸`);
  }

  function handleEditEpub(epub: OpenedEpub) {
    chapters.replaceAll(sectionsToChapters(epub.sections));
    setBook((current) => ({ ...current, title: epub.title, author: epub.author }));
    notify('Loaded into the book maker above');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="bindery stack" ref={topRef}>
      <div className="bindery-intro">
        <h2>Book maker</h2>
        <p className="muted">
          Turn notes, stories and text files into an EPUB for your e-reader, or turn an EPUB back into plain text.
        </p>
      </div>
      <div className="cols">
        <Panel title="🌱 Your book">
          <BookDetailsForm book={book} onChange={updateBook} />
          <h3>Cover</h3>
          <CoverDesigner
            canvasRef={canvasRef}
            title={book.title}
            author={book.author}
            cover={cover}
            onChange={updateCover}
            onImageChange={handleCoverImage}
          />
          <h3>Pages</h3>
          <PageDesigner page={page} title={book.title} onChange={(patch) => setPage((current) => ({ ...current, ...patch }))} />
        </Panel>
        <ChaptersPanel
          chapters={chapters.items}
          onAddFiles={handleAddFiles}
          onAddText={handleAddText}
          onRename={chapters.rename}
          onMove={chapters.move}
          onRemove={chapters.remove}
          onRemoveAll={handleRemoveAll}
          onMakeEpub={handleMakeEpub}
        />
      </div>
      <EpubConverter
        conversion={conversion}
        onOpen={handleOpenEpub}
        onDownload={handleDownloadText}
        onEdit={handleEditEpub}
      />
      <FreeBookShelf />
    </div>
  );
}
