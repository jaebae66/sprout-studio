import type { KeyBinding } from '@codemirror/view';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { insertBlock, insertText, toggleLineStyle, wrapSelection, type Edit, type LineStyle } from '../lib/formatting';
import {
  CARDS,
  cardMarkdown,
  HIGHLIGHTERS,
  highlightMarkers,
  STICKERS,
  TEMPLATES,
  type CardType,
  type HighlighterId,
} from '../lib/stationery';
import { textEditorFor, type TextEditor } from './NoteEditorBox';

interface NoteToolbarProps {
  /** The note's writing area. */
  editor: RefObject<TextEditor | null>;
  noteName: string;
  /** The highlighter colour in use (Ctrl+Shift+H uses it too). */
  highlighter: HighlighterId;
  onHighlighter: (color: HighlighterId) => void;
}

/** Builds an edit from the editor's current text and selection, and applies it. */
function editWith(editor: TextEditor, make: (text: string, start: number, end: number) => Edit) {
  const [start, end] = editor.selection();
  editor.apply(make(editor.text(), start, end));
}

export const format = {
  wrap: (editor: TextEditor, before: string, after = before, placeholder?: string) =>
    editWith(editor, (text, start, end) => wrapSelection(text, start, end, before, after, placeholder)),
  line: (editor: TextEditor, style: LineStyle) => editWith(editor, (text, start, end) => toggleLineStyle(text, start, end, style)),
  highlight: (editor: TextEditor, color: HighlighterId) =>
    editWith(editor, (text, start, end) => wrapSelection(text, start, end, ...highlightMarkers(color), 'highlighted')),
};

/** Keyboard shortcuts for the editor, using the current highlighter colour. */
export function formatShortcuts(highlighter: HighlighterId): KeyBinding[] {
  const bind = (key: string, action: (editor: TextEditor) => void): KeyBinding => ({
    key,
    run: (view) => {
      action(textEditorFor(view));
      return true;
    },
  });
  return [
    bind('Mod-b', (editor) => format.wrap(editor, '**', '**', 'bold')),
    bind('Mod-i', (editor) => format.wrap(editor, '*', '*', 'italic')),
    bind('Mod-k', (editor) => format.wrap(editor, '[[', ']]', 'Note name')),
    bind('Mod-Shift-h', (editor) => format.highlight(editor, highlighter)),
    bind('Mod-Shift-x', (editor) => format.wrap(editor, '~~', '~~', 'crossed out')),
    bind('Mod-Shift-l', (editor) => format.line(editor, 'checklist')),
  ];
}

/** A toolbar button that opens a small menu underneath it. */
function Menu({ label, title, children }: { label: ReactNode; title: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => !box.current?.contains(event.target as Node) && setOpen(false);
    const closeOnEscape = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="tool-menu" ref={box}>
      <button type="button" className="tool" title={title} aria-label={title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
        <span aria-hidden="true" className="caret">
          ▾
        </span>
      </button>
      {open && (
        <div className="tool-popup" role="menu" aria-label={title}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Formatting, highlighters and stationery for the note being written. */
export function NoteToolbar({ editor, noteName, highlighter, onHighlighter }: NoteToolbarProps) {
  const current = HIGHLIGHTERS.find((pen) => pen.id === highlighter)!;
  const run = (action: (box: TextEditor) => void) => () => editor.current && action(editor.current);

  const button = (label: ReactNode, title: string, action: (box: TextEditor) => void, className = '') => (
    <button type="button" className={`tool ${className}`} title={title} aria-label={title} onClick={run(action)}>
      {label}
    </button>
  );

  function addCard(type: CardType) {
    run((box) => {
      const [start, end] = box.selection();
      const selected = box.text().slice(start, end);
      const block = cardMarkdown(type, selected);
      editWith(box, (text, start, end) => insertBlock(text, start, end, block));
    })();
  }

  return (
    <div className="note-toolbar" role="toolbar" aria-label="Formatting">
      <div className="tool-group">
        {button(<b>B</b>, 'Bold (Ctrl+B)', (box) => format.wrap(box, '**', '**', 'bold'))}
        {button(<i>I</i>, 'Italic (Ctrl+I)', (box) => format.wrap(box, '*', '*', 'italic'))}
        {button(<s>S</s>, 'Strikethrough (Ctrl+Shift+X)', (box) => format.wrap(box, '~~', '~~', 'crossed out'))}
        {button('H', 'Heading', (box) => format.line(box, 'heading'))}
      </div>

      <div className="tool-group highlighter">
        <button
          type="button"
          className="tool pen"
          title={`Highlight in ${current.label.toLowerCase()} (Ctrl+Shift+H)`}
          aria-label={`Highlight in ${current.label.toLowerCase()}`}
          style={{ '--pen': current.swatch } as CSSProperties}
          onClick={run((box) => format.highlight(box, highlighter))}
        >
          🖍️
        </button>
        <Menu label="" title="Highlighter colour">
          {(close) => (
            <div className="pen-colours">
              {HIGHLIGHTERS.map((pen) => (
                <button
                  key={pen.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={pen.id === highlighter}
                  className="pen-colour"
                  title={pen.label}
                  aria-label={`${pen.label} highlighter`}
                  style={{ background: pen.swatch }}
                  onClick={() => {
                    onHighlighter(pen.id);
                    close();
                    run((box) => format.highlight(box, pen.id))();
                  }}
                />
              ))}
            </div>
          )}
        </Menu>
      </div>

      <div className="tool-group">
        {button('•', 'Bullet list', (box) => format.line(box, 'bullet'))}
        {button('1.', 'Numbered list', (box) => format.line(box, 'numbered'))}
        {button('☑', 'Checklist (Ctrl+Shift+L)', (box) => format.line(box, 'checklist'))}
        {button('❝', 'Quote', (box) => format.line(box, 'quote'))}
        {button('</>', 'Code', (box) => format.wrap(box, '`', '`', 'code'), 'mono')}
        {button('🔗', 'Link to a note (Ctrl+K)', (box) => format.wrap(box, '[[', ']]', 'Note name'))}
      </div>

      <div className="tool-group">
        <Menu label="🗂️ Cards" title="Add a card">
          {(close) =>
            CARDS.map((card) => (
              <button
                key={card.type}
                type="button"
                role="menuitem"
                className={`menu-item card-sample callout-${card.type}`}
                onClick={() => {
                  close();
                  addCard(card.type);
                }}
              >
                {card.icon} {card.label}
              </button>
            ))
          }
        </Menu>
        <Menu label="⭐ Stickers" title="Add a sticker">
          {(close) => (
            <div className="sticker-grid">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  role="menuitem"
                  className="sticker"
                  aria-label={`Sticker ${sticker}`}
                  onClick={() => {
                    close();
                    run((box) => editWith(box, (_text, start, end) => insertText(start, end, sticker)))();
                  }}
                >
                  {sticker}
                </button>
              ))}
            </div>
          )}
        </Menu>
        {button('〰️', 'Washi tape divider', (box) => editWith(box, (text, start, end) => insertBlock(text, start, end, '---')))}
        <Menu label="📄 Templates" title="Start from a template">
          {(close) =>
            TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  close();
                  run((box) => editWith(box, (text, start, end) => insertBlock(text, start, end, template.build(noteName))))();
                }}
              >
                {template.icon} {template.label}
              </button>
            ))
          }
        </Menu>
      </div>
    </div>
  );
}
