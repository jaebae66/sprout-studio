import { useEffect, useRef } from 'react';
import type { EdgeKind, GraphData, GraphNodeData, NodeKind } from '../lib/graphData';
import { nameKey } from '../lib/notes';

interface NoteGraphProps {
  data: GraphData;
  /** The open note, drawn highlighted. */
  active: string | null;
  onOpen: (node: GraphNodeData) => void;
  /** Called with the node under the pointer (or null), for showing its details. */
  onHover?: (node: GraphNodeData | null) => void;
}

interface GraphNode {
  key: string;
  label: string;
  kind: NodeKind;
  data: GraphNodeData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Edge {
  from: GraphNode;
  to: GraphNode;
  kind: EdgeKind;
}

/** Positions survive re-renders, so editing a note doesn't reshuffle the map. */
const positions = new Map<string, { x: number; y: number }>();

/** How far apart each kind of connection likes its dots: classes gather their notes close. */
const EDGE_LENGTH: Record<EdgeKind, number> = { link: 70, related: 95, subject: 80 };

function buildGraph({ nodes: nodeData, edges: edgeData }: GraphData) {
  const nodes = new Map<string, GraphNode>();
  for (const data of nodeData) {
    const saved = positions.get(data.key) ?? { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 };
    nodes.set(data.key, { key: data.key, label: data.label, kind: data.kind, data, ...saved, vx: 0, vy: 0, radius: data.kind === 'subject' ? 13 : 5 });
  }
  const edges: Edge[] = [];
  for (const { from, to, kind } of edgeData) {
    const a = nodes.get(from);
    const b = nodes.get(to);
    if (a && b) edges.push({ from: a, to: b, kind });
  }
  // Busier notes get bigger dots.
  for (const { from, to } of edges) {
    if (from.kind !== 'subject') from.radius += 0.7;
    if (to.kind !== 'subject') to.radius += 0.7;
  }
  nodes.forEach((node) => (node.radius = Math.min(node.radius, node.kind === 'subject' ? 18 : 14)));
  return { nodes: [...nodes.values()], edges };
}

/** How hot a fresh layout starts, how fast it cools each step, and when it counts as still. */
const ALPHA_START = 1;
const ALPHA_DECAY = 0.97;
const ALPHA_STILL = 0.004;
/** Steps worked out before the first frame, so the graph appears already settled. */
const SETTLE_STEPS = 300;

/**
 * One step of a simple force layout: nodes push apart, links pull together, everything
 * drifts to the middle. `alpha` scales every force, so as it cools the dots slow to a stop.
 */
function tick(nodes: GraphNode[], edges: Edge[], held: GraphNode | null, alpha: number): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distanceSq = dx * dx + dy * dy;
      if (distanceSq < 0.01) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        distanceSq = 0.01;
      }
      const push = (900 / distanceSq) * alpha;
      a.vx -= dx * push;
      a.vy -= dy * push;
      b.vx += dx * push;
      b.vy += dy * push;
    }
  }
  for (const { from, to, kind } of edges) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    // Keyword relations pull a little more gently than links you wrote yourself.
    const pull = ((distance - EDGE_LENGTH[kind]) / distance) * (kind === 'related' ? 0.035 : 0.06) * alpha;
    from.vx += dx * pull;
    from.vy += dy * pull;
    to.vx -= dx * pull;
    to.vy -= dy * pull;
  }
  for (const node of nodes) {
    node.vx = (node.vx - node.x * 0.01 * alpha) * 0.6;
    node.vy = (node.vy - node.y * 0.01 * alpha) * 0.6;
    if (node === held) continue;
    node.x += node.vx;
    node.y += node.vy;
  }
}

function cssVar(element: Element, name: string): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

/**
 * Every note as a dot and every class as a big ringed dot. Solid lines are [[links]],
 * dashed lines are notes that share keywords, and faint lines join a class to its notes.
 * Drag dots, drag the background to pan, scroll to zoom, click to open.
 */
export function NoteGraph({ data, active, onOpen, onHover }: NoteGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Kept in refs so the drawing loop always sees the latest without restarting.
  const activeRef = useRef(active);
  const openRef = useRef(onOpen);
  const hoverRef = useRef(onHover);
  activeRef.current = active;
  openRef.current = onOpen;
  hoverRef.current = onHover;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    const { nodes, edges } = buildGraph(data);
    const view = { x: 0, y: 0, zoom: 1 };
    let hovered: GraphNode | null = null;
    let held: GraphNode | null = null;
    let panning: { x: number; y: number } | null = null;
    let dragged = false;
    /** Until the user pans or zooms, the view keeps every dot in frame. */
    let fitting = true;
    let alpha = ALPHA_START;
    let frame = 0;

    const neighbours = new Map<GraphNode, Set<GraphNode>>();
    for (const { from, to } of edges) {
      if (!neighbours.has(from)) neighbours.set(from, new Set());
      if (!neighbours.has(to)) neighbours.set(to, new Set());
      neighbours.get(from)!.add(to);
      neighbours.get(to)!.add(from);
    }

    function size() {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    /** Pointer position in graph coordinates. */
    function toGraph(event: { clientX: number; clientY: number }) {
      const box = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - box.left - box.width / 2 - view.x) / view.zoom,
        y: (event.clientY - box.top - box.height / 2 - view.y) / view.zoom,
      };
    }

    function nodeAt(event: { clientX: number; clientY: number }) {
      const point = toGraph(event);
      return nodes.find((node) => Math.hypot(node.x - point.x, node.y - point.y) <= node.radius + 4 / view.zoom) ?? null;
    }

    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const colours = {
        accent: cssVar(canvas, '--accent'),
        fg: cssVar(canvas, '--fg'),
        muted: cssVar(canvas, '--muted'),
        line: cssVar(canvas, '--line'),
        soft: cssVar(canvas, '--soft'),
      };
      const focus = hovered ?? nodes.find((node) => node.key === nameKey(activeRef.current ?? '')) ?? null;
      const close = focus ? (neighbours.get(focus) ?? new Set()) : null;

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(width / 2 + view.x, height / 2 + view.y);
      context.scale(view.zoom, view.zoom);

      for (const { from, to, kind } of edges) {
        const lit = focus && (from === focus || to === focus);
        context.lineWidth = (kind === 'link' ? 1.4 : 1.1) / view.zoom;
        context.setLineDash(kind === 'related' ? [5 / view.zoom, 4 / view.zoom] : []);
        context.strokeStyle = lit ? colours.accent : kind === 'related' ? colours.muted : colours.line;
        context.globalAlpha = (!focus || lit ? 1 : 0.35) * (kind === 'subject' && !lit ? 0.7 : kind === 'related' && !lit ? 0.6 : 1);
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }
      context.setLineDash([]);

      context.textAlign = 'center';
      context.textBaseline = 'top';
      for (const node of nodes) {
        const lit = node === focus || close?.has(node);
        context.globalAlpha = !focus || lit ? 1 : 0.35;
        // At least 5px across on screen, however far out you zoom.
        const radius = Math.max(node.radius, 5 / view.zoom);
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        if (node.kind === 'subject') {
          // A class: a soft disc with a ring, like a sticker.
          context.fillStyle = colours.soft;
          context.fill();
          context.lineWidth = 3 / view.zoom;
          context.strokeStyle = colours.accent;
          context.stroke();
        } else {
          context.fillStyle = node === focus ? colours.accent : node.kind === 'missing' ? colours.line : colours.muted;
          context.fill();
        }
        if (lit || node.kind === 'subject' || view.zoom > 0.75 || nodes.length < 30) {
          context.font = `${node.kind === 'subject' ? 800 : 600} ${(node.kind === 'subject' ? 13 : 12) / view.zoom}px Nunito, system-ui, sans-serif`;
          context.fillStyle = node.kind === 'missing' ? colours.muted : node.kind === 'subject' ? colours.accent : colours.fg;
          context.fillText(node.label, node.x, node.y + radius + 3 / view.zoom);
        }
      }
      context.restore();
      context.globalAlpha = 1;
    }

    /** Moves the view toward one that fits every dot; `ease` 1 jumps straight there. */
    function fit(ease: number) {
      if (!nodes.length) return;
      const padding = 40;
      const xs = nodes.map((node) => node.x);
      const ys = nodes.map((node) => node.y);
      const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const zoom = Math.min(
        1.5,
        (canvas.clientWidth - padding * 2) / Math.max(right - left, 1),
        (canvas.clientHeight - padding * 2) / Math.max(bottom - top + 20, 1),
      );
      const target = Math.max(0.25, zoom);
      view.zoom += (target - view.zoom) * ease;
      view.x += ((-(left + right) / 2) * view.zoom - view.x) * ease;
      view.y += ((-(top + bottom) / 2) * view.zoom - view.y) * ease;
    }

    function loop() {
      // Once cool, the dots stay exactly where they are: no drifting or shaking.
      if (alpha > ALPHA_STILL || held) {
        tick(nodes, edges, held, Math.max(alpha, ALPHA_STILL));
        alpha *= ALPHA_DECAY;
        if (fitting && !held) fit(0.15);
      }
      draw();
      frame = requestAnimationFrame(loop);
    }

    // Lay the graph out before showing it.
    for (let step = 0; step < SETTLE_STEPS && alpha > ALPHA_STILL; step++) {
      tick(nodes, edges, null, alpha);
      alpha *= ALPHA_DECAY;
    }

    function handleDown(event: PointerEvent) {
      canvas.setPointerCapture(event.pointerId);
      dragged = false;
      held = nodeAt(event);
      if (!held) {
        panning = { x: event.clientX - view.x, y: event.clientY - view.y };
        fitting = false;
      }
    }

    function handleMove(event: PointerEvent) {
      if (held) {
        const point = toGraph(event);
        held.x = point.x;
        held.y = point.y;
        dragged = true;
        // Warm up a little so linked dots follow, then cool again after letting go.
        alpha = Math.max(alpha, 0.3);
      } else if (panning) {
        view.x = event.clientX - panning.x;
        view.y = event.clientY - panning.y;
        dragged = true;
      } else {
        const over = nodeAt(event);
        if (over !== hovered) hoverRef.current?.(over?.data ?? null);
        hovered = over;
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
      }
    }

    function handleUp() {
      if (held && !dragged) openRef.current(held.data);
      held = null;
      panning = null;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      fitting = false;
      const zoom = Math.min(3, Math.max(0.25, view.zoom * Math.exp(-event.deltaY * 0.0015)));
      // Zoom around the pointer.
      const box = canvas.getBoundingClientRect();
      const px = event.clientX - box.left - box.width / 2;
      const py = event.clientY - box.top - box.height / 2;
      view.x = px - ((px - view.x) * zoom) / view.zoom;
      view.y = py - ((py - view.y) * zoom) / view.zoom;
      view.zoom = zoom;
    }

    size();
    fit(1);
    const resize = new ResizeObserver(size);
    resize.observe(canvas);
    const listening = new AbortController();
    const { signal } = listening;
    canvas.addEventListener('pointerdown', handleDown, { signal });
    canvas.addEventListener('pointermove', handleMove, { signal });
    canvas.addEventListener('pointerup', handleUp, { signal });
    canvas.addEventListener(
      'pointerleave',
      () => {
        hovered = null;
        hoverRef.current?.(null);
      },
      { signal },
    );
    canvas.addEventListener('wheel', handleWheel, { passive: false, signal });
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      listening.abort();
      nodes.forEach((node) => positions.set(node.key, { x: node.x, y: node.y }));
    };
  }, [data]);

  const notes = data.nodes.filter((node) => node.kind === 'note').length;
  const classes = data.nodes.filter((node) => node.kind === 'subject').length;
  return (
    <canvas
      ref={canvasRef}
      className="note-graph"
      role="img"
      aria-label={`Graph of ${notes} notes and ${classes} classes, with ${data.edges.length} connections`}
      data-links={data.edges.filter((edge) => edge.kind === 'link').length}
      data-related={data.edges.filter((edge) => edge.kind === 'related').length}
      data-subject-links={data.edges.filter((edge) => edge.kind === 'subject').length}
    />
  );
}
