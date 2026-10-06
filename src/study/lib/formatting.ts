/**
 * Text edits for the note toolbar. Each takes the note text and the selection, and
 * returns an Edit: what to replace, and where the selection should end up. Pure
 * functions, so the toolbar can apply them in a way that keeps undo working.
 */
export interface Edit {
  /** Replace text[from, to) with `insert`. */
  from: number;
  to: number;
  insert: string;
  /** The selection afterwards: [start, end]. */
  selection: [number, number];
}

/**
 * Wraps the selection in markers (**bold**, ==highlight==, [[link]]…), or unwraps it
 * if it's already wrapped. With nothing selected, wraps a placeholder and selects it.
 */
export function wrapSelection(text: string, start: number, end: number, before: string, after = before, placeholder = 'text'): Edit {
  const selected = text.slice(start, end);
  // Markers just outside the selection: **|bold|**
  if (text.slice(start - before.length, start) === before && text.slice(end, end + after.length) === after) {
    const from = start - before.length;
    return { from, to: end + after.length, insert: selected, selection: [from, from + selected.length] };
  }
  // Markers inside the selection: |**bold**|
  if (selected.length > before.length + after.length && selected.startsWith(before) && selected.endsWith(after)) {
    const inner = selected.slice(before.length, selected.length - after.length);
    return { from: start, to: end, insert: inner, selection: [start, start + inner.length] };
  }
  const inner = selected || placeholder;
  const innerStart = start + before.length;
  return { from: start, to: end, insert: `${before}${inner}${after}`, selection: [innerStart, innerStart + inner.length] };
}

/** Any marker that starts a line (after its indent): heading, checklist, bullet, number or quote. */
const LINE_MARKER = /^(?:#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/;

export const LINE_STYLES = {
  heading: { prefix: () => '## ', pattern: /^\s*#{1,6}\s+/ },
  bullet: { prefix: () => '- ', pattern: /^\s*[-*+]\s+(?!\[[ xX]\])/ },
  numbered: { prefix: (index: number) => `${index + 1}. `, pattern: /^\s*\d+[.)]\s+/ },
  checklist: { prefix: () => '- [ ] ', pattern: /^\s*[-*+]\s+\[[ xX]\]\s+/ },
  quote: { prefix: () => '> ', pattern: /^>\s?/ },
} as const;
export type LineStyle = keyof typeof LINE_STYLES;

/** The whole lines the selection touches. */
function lineRange(text: string, start: number, end: number): [number, number] {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const newline = text.indexOf('\n', Math.max(end - (end > start && text[end - 1] === '\n' ? 1 : 0), start));
  return [lineStart, newline < 0 ? text.length : newline];
}

/**
 * Turns the selected lines into a list, checklist, heading or quote, replacing any
 * other line marker. If every line already has this style, it's taken off instead.
 */
export function toggleLineStyle(text: string, start: number, end: number, style: LineStyle): Edit {
  const { prefix, pattern } = LINE_STYLES[style];
  const [from, to] = lineRange(text, start, end);
  const lines = text.slice(from, to).split('\n');
  const filled = lines.filter((line) => line.trim());
  const removing = filled.length > 0 && filled.every((line) => pattern.test(line));
  let count = 0;
  const changed = lines.map((line) => {
    if (removing) return line.replace(pattern, (marker) => marker.match(/^\s*/)![0]);
    if (!line.trim() && lines.length > 1) return line;
    const indent = /^\s*/.exec(line)![0];
    return `${indent}${prefix(count++)}${line.slice(indent.length).replace(LINE_MARKER, '')}`;
  });
  const insert = changed.join('\n');
  return { from, to, insert, selection: [from + insert.length, from + insert.length] };
}

/**
 * Puts a block (a card, divider or template) where the selection is, on its own lines
 * with a blank line either side, and puts the cursor at `cursorAt` inside it (default: the end).
 */
export function insertBlock(text: string, start: number, end: number, block: string, cursorAt = block.length): Edit {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = !after ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  const insert = `${lead}${block}${trail}`;
  const caret = start + lead.length + cursorAt;
  return { from: start, to: end, insert, selection: [caret, caret] };
}

/** Puts text in at the cursor, replacing any selection. */
export function insertText(start: number, end: number, value: string): Edit {
  return { from: start, to: end, insert: value, selection: [start + value.length, start + value.length] };
}

/** A checklist line: `- [ ] thing` or `1. [x] thing`. */
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/;

/** Ticks or unticks the `index`th checklist item (counting from 0), skipping ``` code blocks. */
export function toggleTask(text: string, index: number): string {
  let inCode = false;
  let seen = -1;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
      if (inCode || !TASK.test(line) || ++seen !== index) return line;
      return line.replace(TASK, (_match, open: string, mark: string, close: string) => `${open}${mark === ' ' ? 'x' : ' '}${close}`);
    })
    .join('\n');
}
