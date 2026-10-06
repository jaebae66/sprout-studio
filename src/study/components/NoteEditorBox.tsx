import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { Annotation, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, type KeyBinding } from '@codemirror/view';
import { useEffect, useImperativeHandle, useRef, forwardRef, type CSSProperties } from 'react';
import type { Edit } from '../lib/formatting';
import { livePreview } from '../lib/livePreview';

/** What the toolbar needs from the editor. */
export interface TextEditor {
  text(): string;
  /** [start, end] of the main selection. */
  selection(): [number, number];
  /** Applies an edit as one undoable step and selects edit.selection. */
  apply(edit: Edit): void;
}

/** Wraps a CodeMirror view as a TextEditor. */
export function textEditorFor(view: EditorView): TextEditor {
  return {
    text: () => view.state.doc.toString(),
    selection: () => [view.state.selection.main.from, view.state.selection.main.to],
    apply(edit) {
      view.dispatch({
        changes: { from: edit.from, to: edit.to, insert: edit.insert },
        selection: EditorSelection.range(...edit.selection),
        scrollIntoView: true,
        userEvent: 'input',
      });
      view.focus();
    },
  };
}

/** Marks changes that came from outside (another tab, the vault), so they aren't saved back. */
const fromOutside = Annotation.define<boolean>();

interface NoteEditorBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Extra shortcuts, checked before the standard ones. */
  shortcuts: KeyBinding[];
  /** The paper pattern, drawn behind the text. */
  paperStyle: CSSProperties;
  placeholderText: string;
  autoFocus?: boolean;
}

/** The note's writing area: a CodeMirror editor with live preview. */
export const NoteEditorBox = forwardRef<TextEditor | null, NoteEditorBoxProps>(function NoteEditorBox(
  { value, onChange, shortcuts, paperStyle, placeholderText, autoFocus },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Kept in refs so the editor is built once but always calls the latest handlers.
  const latest = useRef({ onChange, shortcuts });
  latest.current = { onChange, shortcuts };

  // Looks the view up on each call: it's created after this handle is set up.
  useImperativeHandle(
    ref,
    () => ({
      text: () => textEditorFor(view.current!).text(),
      selection: () => textEditorFor(view.current!).selection(),
      apply: (edit) => textEditorFor(view.current!).apply(edit),
    }),
    [],
  );

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          // Look the shortcuts up at key time, so they always use the current highlighter.
          keymap.of([{ any: (target, event) => runShortcut(latest.current.shortcuts, target, event) }]),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          // GitHub-flavoured Markdown; Enter continues lists and checklists.
          markdown({ base: markdownLanguage }),
          livePreview,
          EditorView.lineWrapping,
          placeholder(placeholderText),
          EditorView.contentAttributes.of({ 'aria-label': 'Note text', spellcheck: 'true' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(fromOutside))) {
              latest.current.onChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    view.current = editor;
    if (autoFocus) editor.focus();
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Built once per note (the parent remounts it for each note).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The note changed somewhere else (reading view, another program): show the new text.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, annotations: fromOutside.of(true) });
  }, [value]);

  useEffect(() => {
    const content = view.current?.contentDOM;
    if (!content) return;
    content.style.backgroundImage = String(paperStyle.backgroundImage ?? '');
    content.style.backgroundSize = String(paperStyle.backgroundSize ?? '');
    content.style.backgroundOrigin = 'content-box';
  }, [paperStyle.backgroundImage, paperStyle.backgroundSize]);

  return <div ref={host} className="note-body" />;
});

/** Runs the first shortcut matching the key press (CodeMirror key names, e.g. "Mod-Shift-h"). */
function runShortcut(shortcuts: KeyBinding[], target: EditorView, event: KeyboardEvent): boolean {
  const mod = event.ctrlKey || event.metaKey;
  const name = `${mod ? 'Mod-' : ''}${event.shiftKey ? 'Shift-' : ''}${event.altKey ? 'Alt-' : ''}${event.key.toLowerCase()}`;
  const match = shortcuts.find((binding) => binding.key?.toLowerCase() === name.toLowerCase());
  return Boolean(match?.run?.(target));
}
