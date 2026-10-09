import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { STICKY_COLORS } from '../lib/stationery';
import type { Sticky } from '../types';

interface StickyCardProps {
  sticky: Sticky;
  label: string;
  className?: string;
  style?: CSSProperties;
  /** Pointer handlers for the top strip, which is what you drag it by. */
  onStripDown: (event: PointerEvent<HTMLDivElement>) => void;
  onStripMove: (event: PointerEvent<HTMLDivElement>) => void;
  onStripUp: () => void;
  onRecolor: () => void;
  onMakeNote: () => void;
  onRemove: () => void;
  onText: (text: string) => void;
  /** More buttons for the strip, before the usual ones. */
  actions?: ReactNode;
}

/** One sticky note, as it looks on the corkboard and on the kanban board. */
export function StickyCard({ sticky, label, className, style, onStripDown, onStripMove, onStripUp, onRecolor, onMakeNote, onRemove, onText, actions }: StickyCardProps) {
  const colors = STICKY_COLORS[sticky.color] ?? STICKY_COLORS.yellow;
  return (
    <article
      className={`sticky${className ? ` ${className}` : ''}`}
      style={{ '--paper': colors.paper, '--edge': colors.edge, ...style } as CSSProperties}
      data-sticky={sticky.id}
      aria-label={label}
    >
      <div className="sticky-strip" onPointerDown={onStripDown} onPointerMove={onStripMove} onPointerUp={onStripUp} onPointerCancel={onStripUp} title="Drag to move">
        {actions}
        <button type="button" className="sticky-action" title="Change colour" aria-label="Change colour" onClick={onRecolor}>
          🎨
        </button>
        <button type="button" className="sticky-action" title="Save as a note" aria-label="Save as a note" disabled={!sticky.text.trim()} onClick={onMakeNote}>
          📝
        </button>
        <button type="button" className="sticky-action" title="Throw away" aria-label="Throw away" onClick={onRemove}>
          ✕
        </button>
      </div>
      <textarea aria-label="Sticky note text" placeholder="Write something…" value={sticky.text} onChange={(event) => onText(event.target.value)} />
    </article>
  );
}
