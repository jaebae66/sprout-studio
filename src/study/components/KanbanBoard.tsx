import { Fragment, useRef, useState, type PointerEvent } from 'react';
import { newId, removeById } from '../lib/list';
import type { KanbanLane, Sticky, StudyData } from '../types';
import { StickyCard } from './StickyCard';

interface KanbanBoardProps {
  stickies: Sticky[];
  lanes: KanbanLane[];
  update: (change: (current: StudyData) => StudyData) => void;
  /** Adds a sticky to the end of a column. */
  onAdd: (lane: string) => void;
  onRecolor: (sticky: Sticky) => void;
  onMakeNote: (sticky: Sticky) => void;
  onRemove: (sticky: Sticky) => void;
  onText: (sticky: Sticky, text: string) => void;
}

interface Drag {
  id: string;
  /** Where on the sticky it was grabbed. */
  offsetX: number;
  offsetY: number;
  /** Where it is now, in pixels from the board's top-left corner. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where it would land: a column, and a place in that column. */
  lane: string;
  index: number;
}

/** The column a sticky is in: stickies from before the kanban board, or from a removed column, go in the first one. */
export function laneOf(sticky: Sticky, lanes: readonly KanbanLane[]): string {
  return lanes.some((lane) => lane.id === sticky.lane) ? sticky.lane : lanes[0].id;
}

/** Sticky notes in columns, like a kanban board: drag them between columns, or along with the arrows. */
export function KanbanBoard({ stickies, lanes, update, onAdd, onRecolor, onMakeNote, onRemove, onText }: KanbanBoardProps) {
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const setLanes = (change: (current: KanbanLane[]) => KanbanLane[]) =>
    update((current) => ({ ...current, settings: { ...current.settings, kanbanLanes: change(current.settings.kanbanLanes) } }));

  /** Puts a sticky in a column, before the `index`th sticky already there (or at the end). */
  function moveTo(id: string, lane: string, index = Infinity) {
    update((current) => {
      const moved = current.stickies.find((sticky) => sticky.id === id);
      if (!moved) return current;
      const rest = removeById(current.stickies, id);
      const inLane = rest.filter((sticky) => laneOf(sticky, lanes) === lane);
      const before = inLane[index];
      const at = before ? rest.indexOf(before) : inLane.length ? rest.indexOf(inLane[inLane.length - 1]) + 1 : rest.length;
      return { ...current, stickies: [...rest.slice(0, at), { ...moved, lane }, ...rest.slice(at)] };
    });
  }

  function addLane() {
    const lane = { id: newId('l'), name: 'New column' };
    setLanes((current) => [...current, lane]);
    // Ready to rename straight away.
    requestAnimationFrame(() => board.current?.querySelector<HTMLInputElement>(`[data-lane="${lane.id}"] input`)?.select());
  }

  function removeLane(lane: KanbanLane) {
    const others = lanes.filter((other) => other.id !== lane.id);
    const count = stickies.filter((sticky) => laneOf(sticky, lanes) === lane.id).length;
    const name = lane.name.trim() || 'this column';
    if (count && !confirm(`Remove “${name}”? Its ${count === 1 ? 'sticky' : `${count} stickies`} will move to “${others[0].name.trim() || 'the first column'}”.`)) return;
    update((current) => ({
      ...current,
      settings: { ...current.settings, kanbanLanes: removeById(current.settings.kanbanLanes, lane.id) },
      stickies: current.stickies.map((sticky) => (laneOf(sticky, lanes) === lane.id ? { ...sticky, lane: others[0].id } : sticky)),
    }));
  }

  /* Dragging by the strip at the top. */

  /** The column under the pointer (the nearest one, if it's between columns), and where in it. */
  function dropSpot(clientX: number, clientY: number, id: string) {
    let closest: { lane: string; element: HTMLElement; distance: number } | null = null;
    for (const element of board.current!.querySelectorAll<HTMLElement>('[data-lane]')) {
      const box = element.getBoundingClientRect();
      const distance = clientX < box.left ? box.left - clientX : clientX > box.right ? clientX - box.right : 0;
      if (!closest || distance < closest.distance) closest = { lane: element.dataset.lane!, element, distance };
    }
    const cards = [...closest!.element.querySelectorAll<HTMLElement>('[data-sticky]')].filter((card) => card.dataset.sticky !== id);
    const index = cards.filter((card) => {
      const box = card.getBoundingClientRect();
      return box.top + box.height / 2 < clientY;
    }).length;
    return { lane: closest!.lane, index };
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, sticky: Sticky) {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const card = event.currentTarget.closest('article')!.getBoundingClientRect();
    const box = board.current!.getBoundingClientRect();
    setDrag({
      id: sticky.id,
      offsetX: event.clientX - card.left,
      offsetY: event.clientY - card.top,
      left: card.left - box.left + board.current!.scrollLeft,
      top: card.top - box.top,
      width: card.width,
      height: card.height,
      ...dropSpot(event.clientX, event.clientY, sticky.id),
    });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const box = board.current!.getBoundingClientRect();
    setDrag({
      ...drag,
      left: event.clientX - box.left - drag.offsetX + board.current!.scrollLeft,
      top: event.clientY - box.top - drag.offsetY,
      ...dropSpot(event.clientX, event.clientY, drag.id),
    });
  }

  function endDrag() {
    if (!drag) return;
    moveTo(drag.id, drag.lane, drag.index);
    setDrag(null);
  }

  const placeholder = drag && <div key="placeholder" className="kanban-placeholder" style={{ height: drag.height }} />;

  return (
    <div className="kanban-board" ref={board}>
      {lanes.map((lane, laneIndex) => {
        const cards = stickies.filter((sticky) => laneOf(sticky, lanes) === lane.id);
        // The sticky being dragged isn't counted where it came from, so the placeholder lines up.
        const settled = cards.filter((sticky) => sticky.id !== drag?.id);
        const previous = lanes[laneIndex - 1];
        const next = lanes[laneIndex + 1];
        return (
          <section key={lane.id} className={`kanban-lane${drag?.lane === lane.id ? ' targeted' : ''}`} data-lane={lane.id} aria-label={`${lane.name.trim() || 'Untitled'} column`}>
            <header className="kanban-lane-head">
              <input
                aria-label="Column name"
                placeholder="Untitled"
                value={lane.name}
                maxLength={40}
                onChange={(event) => setLanes((current) => current.map((other) => (other.id === lane.id ? { ...other, name: event.target.value } : other)))}
              />
              <span className="kanban-count" title={`${cards.length} ${cards.length === 1 ? 'sticky' : 'stickies'}`}>
                {cards.length}
              </span>
              <button type="button" className="kanban-lane-action" title="Remove column" aria-label="Remove column" disabled={lanes.length < 2} onClick={() => removeLane(lane)}>
                ✕
              </button>
            </header>
            <div className="kanban-cards">
              {cards.map((sticky) => {
                const moving = drag?.id === sticky.id;
                const position = settled.indexOf(sticky);
                return (
                  <Fragment key={sticky.id}>
                    {drag?.lane === lane.id && drag.index === position && placeholder}
                    <StickyCard
                      sticky={sticky}
                      label={`Sticky note in ${lane.name.trim() || 'Untitled'}`}
                      className={moving ? 'lifted' : undefined}
                      style={moving ? { position: 'absolute', left: drag.left, top: drag.top, width: drag.width, zIndex: 10 } : undefined}
                      onStripDown={(event) => startDrag(event, sticky)}
                      onStripMove={moveDrag}
                      onStripUp={endDrag}
                      onRecolor={() => onRecolor(sticky)}
                      onMakeNote={() => onMakeNote(sticky)}
                      onRemove={() => onRemove(sticky)}
                      onText={(text) => onText(sticky, text)}
                      actions={
                        <>
                          {previous && (
                            <button type="button" className="sticky-action" title={`Move to ${previous.name.trim() || 'Untitled'}`} aria-label="Move left" onClick={() => moveTo(sticky.id, previous.id)}>
                              ◀
                            </button>
                          )}
                          {next && (
                            <button type="button" className="sticky-action" title={`Move to ${next.name.trim() || 'Untitled'}`} aria-label="Move right" onClick={() => moveTo(sticky.id, next.id)}>
                              ▶
                            </button>
                          )}
                          <span className="sticky-spacer" />
                        </>
                      }
                    />
                  </Fragment>
                );
              })}
              {drag?.lane === lane.id && drag.index >= settled.length && placeholder}
              <button
                type="button"
                className="kanban-add"
                aria-label={`Add a sticky to ${lane.name.trim() || 'Untitled'}`}
                onClick={() => onAdd(lane.id)}
              >
                + Add a sticky
              </button>
            </div>
          </section>
        );
      })}
      <button type="button" className="kanban-add-lane" onClick={addLane}>
        + Add column
      </button>
    </div>
  );
}
