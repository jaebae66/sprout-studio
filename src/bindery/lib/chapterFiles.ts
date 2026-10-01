import type { ChapterContent } from '../types';
import { htmlToChapter, splitTextIntoChapters } from './text';

interface ChapterFilesResult {
  chapters: ChapterContent[];
  /** Names of files that weren't text, Markdown or HTML. */
  skipped: string[];
}

/** Reads dropped or chosen files as chapters, in natural file-name order. */
export async function readChapterFiles(files: File[]): Promise<ChapterFilesResult> {
  const sorted = [...files].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { numeric: true }),
  );
  const chapters: ChapterContent[] = [];
  const skipped: string[] = [];

  for (const file of sorted) {
    const name = file.name.replace(/\.[^.]+$/, '');
    if (/\.html?$/i.test(file.name)) {
      chapters.push(htmlToChapter(await file.text(), name));
    } else if (/\.(txt|md|markdown)$/i.test(file.name)) {
      chapters.push(...splitTextIntoChapters(await file.text(), name));
    } else {
      skipped.push(file.name);
    }
  }

  return { chapters, skipped };
}
