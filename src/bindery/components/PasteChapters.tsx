import { useState } from 'react';
import { Button } from '../../shared/components/Button';

interface PasteChaptersProps {
  /** Returns true when the text was added, so the box can be cleared. */
  onAdd: (text: string) => boolean;
}

export function PasteChapters({ onAdd }: PasteChaptersProps) {
  const [text, setText] = useState('');

  return (
    <details className="paste">
      <summary>Paste text instead</summary>
      <div className="paste-body">
        <textarea
          rows={7}
          placeholder="Paste a whole story here. Lines like “Chapter 3” or “# My heading” start a new chapter."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="row">
          <Button size="small" onClick={() => onAdd(text) && setText('')}>
            Add as chapters
          </Button>
          <span className="muted small-text">Blank lines make new paragraphs. **bold** and *italic* work.</span>
        </div>
      </div>
    </details>
  );
}
