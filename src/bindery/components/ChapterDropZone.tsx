import { useState, type DragEvent } from 'react';
import { cx } from '../../shared/lib/classNames';

const ACCEPTED_TYPES = '.txt,.md,.markdown,.html,.htm,text/plain,text/html';

export function ChapterDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragging(true);
  };

  return (
    <div
      className={cx('drop', dragging && 'over')}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
    >
      Drop <b>.txt</b>, <b>.md</b> or <b>.html</b> files here, or{' '}
      <label htmlFor="chapter-files" className="link-label">
        choose files
      </label>
      <br />
      <span className="small-text">Each file becomes a chapter, sorted by file name.</span>
      <input
        type="file"
        id="chapter-files"
        multiple
        accept={ACCEPTED_TYPES}
        hidden
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
