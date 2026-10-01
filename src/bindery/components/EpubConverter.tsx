import { useRef } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { wordCount } from '../lib/text';
import type { ConversionState, OpenedEpub, TextFormat } from '../types';

interface ConversionActions {
  onDownload: (epub: OpenedEpub, format: TextFormat) => void;
  onEdit: (epub: OpenedEpub) => void;
}

interface EpubConverterProps extends ConversionActions {
  conversion: ConversionState | null;
  onOpen: (file: File) => void;
}

export function EpubConverter({ conversion, onOpen, ...actions }: EpubConverterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Panel title="🔁 EPUB to text">
      <p className="muted">
        Open an EPUB to read its chapters as plain text or Markdown. Handy for copying quotes into assignments or
        notes. Only works on EPUBs without DRM.
      </p>
      <div className="row">
        <Button ghost onClick={() => inputRef.current?.click()}>
          Open an EPUB
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".epub,application/epub+zip"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onOpen(file);
            event.target.value = '';
          }}
        />
        {conversion && <span className="mono muted">{conversion.filename}</span>}
      </div>
      {conversion && <ConversionResult conversion={conversion} {...actions} />}
    </Panel>
  );
}

function ConversionResult({ conversion, onDownload, onEdit }: { conversion: ConversionState } & ConversionActions) {
  if (conversion.status === 'loading') return <p className="muted">Opening…</p>;
  if (conversion.status === 'error') return <p className="error">{conversion.message}</p>;

  const words = conversion.sections.reduce((total, section) => total + wordCount(section.textContent ?? ''), 0);

  return (
    <div className="result">
      <div>
        <b className="result-title">{conversion.title}</b>
        {conversion.author && <span className="muted"> by {conversion.author}</span>}
      </div>
      <span className="mono muted">
        {conversion.sections.length} sections · {words.toLocaleString()} words
      </span>
      <div className="row">
        <Button size="small" onClick={() => onDownload(conversion, 'plain')}>
          Save as .txt
        </Button>
        <Button size="small" onClick={() => onDownload(conversion, 'markdown')}>
          Save as Markdown
        </Button>
        <Button ghost size="small" onClick={() => onEdit(conversion)}>
          Edit it here as a new EPUB
        </Button>
      </div>
    </div>
  );
}
