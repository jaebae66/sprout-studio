import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { KanbanBoard } from '../components/KanbanBoard';
import { StickyCard } from '../components/StickyCard';
import { useNotes } from '../hooks/useNotes';
import { newId, patchById, removeById } from '../lib/list';
import { cleanNoteName } from '../lib/notes';
import { STICKY_COLORS, type StickyColor } from '../lib/stationery';
import { useStudy } from '../StudyContext';
import type { Sticky, StickyLayout } from '../types';

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

const LAYOUTS: { id: StickyLayout; label: string }[] = [
  { id: 'corkboard', label: '📌 Corkboard' },
  { id: 'kanban', label: '🗂️ Kanban' },
];

/**
 * Sticky notes, on a free corkboard or in kanban columns: add, write, drag, recolour,
 * tidy, or turn one into a full note.
 */
export function StickiesView() {
  const { data, update, updateSettings, notify, icon } = useStudy();
  const notes = useNotes();
  const { stickies } = data;
  const { stickyLayout: layout, kanbanLanes: lanes } = data.settings;
  const board = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(800);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  // The corkboard is only there in its own layout; its last width is kept for placing new stickies.
  useEffect(() => {
    const element = board.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setBoardWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout]);

  // A new sticky is ready to type on straight away.
  useEffect(() => {
    if (!focusId) return;
    document.querySelector<HTMLTextAreaElement>(`[data-sticky="${focusId}"] textarea`)?.focus();
    setFocusId(null);
  }, [focusId, stickies]);

  const setStickies = (change: (current: Sticky[]) => Sticky[]) => update((current) => ({ ...current, stickies: change(current.stickies) }));
  const patch = (id: string, changes: Partial<Sticky>) => setStickies((current) => patchById(current, id, changes));

  /** On the kanban board it goes at the bottom of `lane` (the first column unless you say). */
  function add(color: StickyColor, lane = lanes[0].id) {
    const sticky: Sticky = { id: newId('s'), text: '', color, lane, ...freeSpot(stickies, boardWidth) };
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

  const recolor = (sticky: Sticky) => patch(sticky.id, { color: COLORS[(COLORS.indexOf(sticky.color) + 1) % COLORS.length] });

  const lowest = stickies.reduce((bottom, sticky) => Math.max(bottom, sticky.y + STICKY_HEIGHT), 0);

  return (
    <Panel
      className="stack tight stickies-panel"
      title={`${icon('stickies')} Sticky notes`}
      aside={
        <div className="row">
          <div className="segmented" role="group" aria-label="Layout">
            {LAYOUTS.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={layout === id} onClick={() => updateSettings({ stickyLayout: id })}>
                {label}
              </button>
            ))}
          </div>
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
          {layout === 'corkboard' && (
            <Button ghost size="small" onClick={tidy} disabled={!stickies.length}>
              Tidy up
            </Button>
          )}
        </div>
      }
    >
      {layout === 'kanban' ? (
        <KanbanBoard
          stickies={stickies}
          lanes={lanes}
          update={update}
          onAdd={(lane) => add('yellow', lane)}
          onRecolor={recolor}
          onMakeNote={makeNote}
          onRemove={remove}
          onText={(sticky, text) => patch(sticky.id, { text })}
        />
      ) : (
        <div className="sticky-board" ref={board} style={{ minHeight: lowest + GAP * 2 }}>
          {!stickies.length && (
            <div className="sticky-empty">
              <p>Your board is empty.</p>
              <p className="small-text">Pick a colour above to add a sticky note. Drag it by its top strip to move it around.</p>
            </div>
          )}
          {stickies.map((sticky, index) => {
            const moving = drag?.id === sticky.id;
            return (
              <StickyCard
                key={sticky.id}
                sticky={sticky}
                label={`Sticky note ${index + 1}`}
                className={moving ? 'lifted' : undefined}
                style={
                  {
                    left: moving ? drag.x : sticky.x,
                    top: moving ? drag.y : sticky.y,
                    width: STICKY_WIDTH,
                    height: STICKY_HEIGHT,
                    '--tilt': `${moving ? 0 : tilt(sticky.id)}deg`,
                    zIndex: moving ? stickies.length + 1 : index + 1,
                  } as CSSProperties
                }
                onStripDown={(event) => startDrag(event, sticky)}
                onStripMove={moveDrag}
                onStripUp={endDrag}
                onRecolor={() => recolor(sticky)}
                onMakeNote={() => makeNote(sticky)}
                onRemove={() => remove(sticky)}
                onText={(text) => patch(sticky.id, { text })}
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
}
