import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { useNotes } from '../hooks/useNotes';
import { newId, patchById, removeById } from '../lib/list';
import { cleanNoteName } from '../lib/notes';
import { STICKY_COLORS, type StickyColor } from '../lib/stationery';
import { useStudy } from '../StudyContext';
import type { Sticky } from '../types';

const STICKY_WIDTH = 190;
const STICKY_HEIGHT = 180;
const GAP = 22;
const COLORS = Object.keys(STICKY_COLORS) as StickyColor[];

/** A gentle tilt that stays the same for each sticky, so the board looks hand-placed. */
function tilt(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 7) - 3) * 0.6;
}

/** The grid spot for the `index`th sticky on a board this wide. */
function gridSpot(index: number, boardWidth: number) {
  const columns = Math.max(1, Math.floor((boardWidth - GAP) / (STICKY_WIDTH + GAP)));
  return { x: GAP + (index % columns) * (STICKY_WIDTH + GAP), y: GAP + Math.floor(index / columns) * (STICKY_HEIGHT + GAP) };
}

/** The first grid spot that no sticky is sitting on. */
function freeSpot(stickies: readonly Sticky[], boardWidth: number) {
  for (let index = 0; ; index++) {
    const spot = gridSpot(index, boardWidth);
    const taken = stickies.some((sticky) => Math.abs(sticky.x - spot.x) < STICKY_WIDTH * 0.6 && Math.abs(sticky.y - spot.y) < STICKY_HEIGHT * 0.6);
    if (!taken) return spot;
  }
}

interface Drag {
  id: string;
  /** Where on the sticky it was grabbed. */
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
}

/** A corkboard of sticky notes: add, write, drag, recolour, tidy, or turn one into a full note. */
export function StickiesView() {
  const { data, update, notify, icon } = useStudy();
  const notes = useNotes();
  const { stickies } = data;
  const board = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(800);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const element = board.current!;
    const observer = new ResizeObserver(() => setBoardWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A new sticky is ready to type on straight away.
  useEffect(() => {
    if (!focusId) return;
    board.current?.querySelector<HTMLTextAreaElement>(`[data-sticky="${focusId}"] textarea`)?.focus();
    setFocusId(null);
  }, [focusId, stickies]);

  const setStickies = (change: (current: Sticky[]) => Sticky[]) => update((current) => ({ ...current, stickies: change(current.stickies) }));
  const patch = (id: string, changes: Partial<Sticky>) => setStickies((current) => patchById(current, id, changes));

  function add(color: StickyColor) {
    const sticky: Sticky = { id: newId('s'), text: '', color, ...freeSpot(stickies, boardWidth) };
    setStickies((current) => [...current, sticky]);
    setFocusId(sticky.id);
  }

  function tidy() {
    setStickies((current) => current.map((sticky, index) => ({ ...sticky, ...gridSpot(index, boardWidth) })));
  }

  function remove(sticky: Sticky) {
    if (sticky.text.trim() && !confirm('Throw away this sticky note?')) return;
    setStickies((current) => removeById(current, sticky.id));
  }

  function makeNote(sticky: Sticky) {
    const firstLine = sticky.text.split('\n').find((line) => line.trim()) ?? '';
    const name = notes.create(cleanNoteName(firstLine).slice(0, 60) || 'Sticky note', sticky.text);
    notify(`Saved as the note “${name}” ${icon('done')}`);
  }

  /* Dragging by the strip at the top. */

  function startDrag(event: PointerEvent<HTMLDivElement>, sticky: Sticky) {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = board.current!.getBoundingClientRect();
    setDrag({
      id: sticky.id,
      offsetX: event.clientX - box.left - sticky.x,
      offsetY: event.clientY - box.top - sticky.y,
      x: sticky.x,
      y: sticky.y,
    });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const box = board.current!.getBoundingClientRect();
    setDrag({
      ...drag,
      x: Math.round(Math.min(Math.max(0, event.clientX - box.left - drag.offsetX), Math.max(0, boardWidth - STICKY_WIDTH))),
      y: Math.round(Math.max(0, event.clientY - box.top - drag.offsetY)),
    });
  }

  function endDrag() {
    if (!drag) return;
    // Saved once, when it's put down, and moved to the top of the pile.
    setStickies((current) => {
      const moved = current.find((sticky) => sticky.id === drag.id);
      return moved ? [...removeById(current, drag.id), { ...moved, x: drag.x, y: drag.y }] : current;
    });
    setDrag(null);
  }

  const lowest = stickies.reduce((bottom, sticky) => Math.max(bottom, sticky.y + STICKY_HEIGHT), 0);

  return (
    <Panel
      className="stack tight stickies-panel"
      title={`${icon('stickies')} Sticky notes`}
      aside={
        <div className="row">
          <span className="muted small-text">Add one:</span>
          <div className="sticky-adders">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="sticky-adder"
                title={`New ${color} sticky`}
                aria-label={`New ${color} sticky`}
                style={{ background: STICKY_COLORS[color].paper, borderColor: STICKY_COLORS[color].edge }}
                onClick={() => add(color)}
              >
                +
              </button>
            ))}
          </div>
          <Button ghost size="small" onClick={tidy} disabled={!stickies.length}>
            Tidy up
          </Button>
        </div>
      }
    >
      <div className="sticky-board" ref={board} style={{ minHeight: lowest + GAP * 2 }}>
        {!stickies.length && (
          <div className="sticky-empty">
            <p>Your board is empty.</p>
            <p className="small-text">Pick a colour above to add a sticky note. Drag it by its top strip to move it around.</p>
          </div>
        )}
        {stickies.map((sticky, index) => {
          const colors = STICKY_COLORS[sticky.color] ?? STICKY_COLORS.yellow;
          const moving = drag?.id === sticky.id;
          const style = {
            left: moving ? drag.x : sticky.x,
            top: moving ? drag.y : sticky.y,
            width: STICKY_WIDTH,
            height: STICKY_HEIGHT,
            '--paper': colors.paper,
            '--edge': colors.edge,
            '--tilt': `${moving ? 0 : tilt(sticky.id)}deg`,
            zIndex: moving ? stickies.length + 1 : index + 1,
          } as CSSProperties;
          return (
            <article key={sticky.id} className={`sticky${moving ? ' lifted' : ''}`} style={style} data-sticky={sticky.id} aria-label={`Sticky note ${index + 1}`}>
              <div className="sticky-strip" onPointerDown={(event) => startDrag(event, sticky)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} title="Drag to move">
                <button
                  type="button"
                  className="sticky-action"
                  title="Change colour"
                  aria-label="Change colour"
                  onClick={() => patch(sticky.id, { color: COLORS[(COLORS.indexOf(sticky.color) + 1) % COLORS.length] })}
                >
                  🎨
                </button>
                <button type="button" className="sticky-action" title="Save as a note" aria-label="Save as a note" disabled={!sticky.text.trim()} onClick={() => makeNote(sticky)}>
                  📝
                </button>
                <button type="button" className="sticky-action" title="Throw away" aria-label="Throw away" onClick={() => remove(sticky)}>
                  ✕
                </button>
              </div>
              <textarea
                aria-label="Sticky note text"
                placeholder="Write something…"
                value={sticky.text}
                onChange={(event) => patch(sticky.id, { text: event.target.value })}
              />
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
