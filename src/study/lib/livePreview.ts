import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

/**
 * Live preview for the note editor, like Obsidian's: highlights show in their colour,
 * bold looks bold, headings look like headings, and the Markdown codes around them
 * (==, **, #, <mark …>) are hidden unless the cursor is inside that bit of text.
 */

const hidden = Decoration.replace({});

/** `==yellow==` and `<mark class="hl-pink">pink</mark>`, on one line. */
const HIGHLIGHT = /==(?!=)([^\n]+?)==(?!=)|<mark class="hl-(\w+)">([^\n]*?)<\/mark>/g;
const WIKILINK = /\[\[[^\]\n]+\]\]/g;

/** Inline styles from the Markdown syntax tree, and which of their child nodes are the codes. */
const INLINE: Record<string, { className: string; marks: string[] }> = {
  StrongEmphasis: { className: 'cm-strong', marks: ['EmphasisMark'] },
  Emphasis: { className: 'cm-em', marks: ['EmphasisMark'] },
  Strikethrough: { className: 'cm-strike', marks: ['StrikethroughMark'] },
  InlineCode: { className: 'cm-code', marks: ['CodeMark'] },
};

/** Whether the cursor or selection touches [from, to]: then its codes stay visible for editing. */
function touches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((range) => range.from <= to && range.to >= from);
}

function build(view: EditorView): DecorationSet {
  const { state } = view;
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        const heading = /^ATXHeading(\d)$/.exec(node.name);
        if (heading) {
          const line = state.doc.lineAt(node.from);
          decorations.push(Decoration.line({ class: `cm-heading cm-h${heading[1]}` }).range(line.from));
          // Hide "## " unless the cursor is on this line.
          const mark = node.node.getChild('HeaderMark');
          if (mark && !touches(state, line.from, line.to)) {
            const end = Math.min(mark.to + 1, line.to);
            if (end > mark.from) decorations.push(hidden.range(mark.from, end));
          }
          return;
        }
        const style = INLINE[node.name];
        if (!style) return;
        decorations.push(Decoration.mark({ class: style.className }).range(node.from, node.to));
        if (touches(state, node.from, node.to)) return;
        for (const name of style.marks) {
          for (const mark of node.node.getChildren(name)) {
            if (mark.to > mark.from) decorations.push(hidden.range(mark.from, mark.to));
          }
        }
      },
    });

    // Highlights and [[links]] aren't in the Markdown grammar, so they're found line by line.
    for (let position = from; position <= to; ) {
      const line = state.doc.lineAt(position);
      for (const match of line.text.matchAll(HIGHLIGHT)) {
        const start = line.from + match.index!;
        const end = start + match[0].length;
        const color = match[2] ?? 'yellow';
        const inner = match[1] ?? match[3] ?? '';
        const open = match[1] !== undefined ? 2 : match[0].indexOf('>') + 1;
        const innerStart = start + open;
        const innerEnd = innerStart + inner.length;
        if (inner) decorations.push(Decoration.mark({ class: `cm-hl cm-hl-${color}` }).range(innerStart, innerEnd));
        if (!touches(state, start, end)) {
          decorations.push(hidden.range(start, innerStart), hidden.range(innerEnd, end));
        }
      }
      for (const match of line.text.matchAll(WIKILINK)) {
        const start = line.from + match.index!;
        decorations.push(Decoration.mark({ class: 'cm-wikilink' }).range(start, start + match[0].length));
      }
      position = line.to + 1;
    }
  }

  return Decoration.set(decorations, true);
}

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = build(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
