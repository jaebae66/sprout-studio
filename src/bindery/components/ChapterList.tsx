import type { Chapter } from '../types';

interface ChapterActions {
  onRename: (id: number, title: string) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onRemove: (id: number) => void;
}

interface ChapterListProps extends ChapterActions {
  chapters: Chapter[];
}

export function ChapterList({ chapters, ...actions }: ChapterListProps) {
  return (
    <ol className="chapters">
      {chapters.length ? (
        chapters.map((chapter, index) => (
          <ChapterRow
            key={chapter.id}
            chapter={chapter}
            position={index + 1}
            isFirst={index === 0}
            isLast={index === chapters.length - 1}
            {...actions}
          />
        ))
      ) : (
        <li className="empty">No chapters yet. Drop some files or paste text above.</li>
      )}
    </ol>
  );
}

interface ChapterRowProps extends ChapterActions {
  chapter: Chapter;
  position: number;
  isFirst: boolean;
  isLast: boolean;
}

function ChapterRow({ chapter, position, isFirst, isLast, onRename, onMove, onRemove }: ChapterRowProps) {
  return (
    <li className="ch">
      <input
        type="text"
        value={chapter.title}
        aria-label={`Chapter ${position} title`}
        onChange={(event) => onRename(chapter.id, event.target.value)}
      />
      <span className="wc">{chapter.words.toLocaleString()} words</span>
      <button type="button" aria-label="Move up" disabled={isFirst} onClick={() => onMove(chapter.id, -1)}>
        ▲
      </button>
      <button type="button" aria-label="Move down" disabled={isLast} onClick={() => onMove(chapter.id, 1)}>
        ▼
      </button>
      <button type="button" aria-label="Remove" onClick={() => onRemove(chapter.id)}>
        ✕
      </button>
    </li>
  );
}
