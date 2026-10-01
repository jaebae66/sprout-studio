import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { WORDS_PER_MINUTE } from '../constants';
import type { Chapter } from '../types';
import { ChapterDropZone } from './ChapterDropZone';
import { ChapterList } from './ChapterList';
import { PasteChapters } from './PasteChapters';

interface ChaptersPanelProps {
  chapters: Chapter[];
  onAddFiles: (files: File[]) => void;
  onAddText: (text: string) => boolean;
  onRename: (id: number, title: string) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onRemove: (id: number) => void;
  onRemoveAll: () => void;
  onMakeEpub: () => void;
}

export function ChaptersPanel({
  chapters,
  onAddFiles,
  onAddText,
  onRename,
  onMove,
  onRemove,
  onRemoveAll,
  onMakeEpub,
}: ChaptersPanelProps) {
  const totalWords = chapters.reduce((total, chapter) => total + chapter.words, 0);
  const readingMinutes = Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE));

  return (
    <Panel
      title="🍃 Chapters"
      aside={
        <span className="mono">
          {chapters.length} ch · {totalWords.toLocaleString()} words · ~{readingMinutes} min read
        </span>
      }
    >
      <ChapterDropZone onFiles={onAddFiles} />
      <PasteChapters onAdd={onAddText} />
      <ChapterList chapters={chapters} onRename={onRename} onMove={onMove} onRemove={onRemove} />
      <div className="row chapter-actions">
        <Button ghost size="small" onClick={onRemoveAll}>
          Remove all chapters
        </Button>
        <Button size="big" disabled={!chapters.length} onClick={onMakeEpub}>
          Make my EPUB 📗
        </Button>
      </div>
    </Panel>
  );
}
