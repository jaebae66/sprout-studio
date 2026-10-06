import { expect, test } from '@playwright/test';
import { insertBlock, toggleLineStyle, toggleTask, wrapSelection, type Edit } from '../../src/study/lib/formatting';
import { cardMarkdown, highlightMarkers } from '../../src/study/lib/stationery';

/** Applies an edit to `text`, and shows the selection afterwards with | marks. */
function apply(text: string, edit: Edit): string {
  const result = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  const [start, end] = edit.selection;
  return start === end ? `${result.slice(0, start)}|${result.slice(start)}` : `${result.slice(0, start)}[${result.slice(start, end)}]${result.slice(end)}`;
}

test.describe('wrapping (bold, highlight, links)', () => {
  test('wraps the selection and keeps it selected', () => {
    expect(apply('make this bold', wrapSelection('make this bold', 5, 9, '**'))).toBe('make **[this]** bold');
  });

  test('wraps a placeholder when nothing is selected', () => {
    expect(apply('hi ', wrapSelection('hi ', 3, 3, '==', '==', 'highlighted'))).toBe('hi ==[highlighted]==');
  });

  test('unwraps when the markers are just outside the selection', () => {
    expect(apply('a **b** c', wrapSelection('a **b** c', 4, 5, '**'))).toBe('a [b] c');
  });

  test('unwraps when the selection includes the markers', () => {
    expect(apply('a ==b== c', wrapSelection('a ==b== c', 2, 7, '=='))).toBe('a [b] c');
  });

  test('coloured highlighters use <mark> so Obsidian shows them too', () => {
    expect(highlightMarkers('yellow')).toEqual(['==', '==']);
    expect(highlightMarkers('pink')).toEqual(['<mark class="hl-pink">', '</mark>']);
  });
});

test.describe('line styles (lists, checklists, headings)', () => {
  test('turns lines into a bullet list', () => {
    expect(apply('eggs\nmilk', toggleLineStyle('eggs\nmilk', 0, 9, 'bullet'))).toBe('- eggs\n- milk|');
  });

  test('numbers each line', () => {
    expect(apply('a\nb\nc', toggleLineStyle('a\nb\nc', 0, 5, 'numbered'))).toBe('1. a\n2. b\n3. c|');
  });

  test('switches a bullet list to a checklist', () => {
    expect(apply('- a\n- b', toggleLineStyle('- a\n- b', 0, 7, 'checklist'))).toBe('- [ ] a\n- [ ] b|');
  });

  test('takes the style off when every line already has it', () => {
    expect(apply('- [ ] a\n- [x] b', toggleLineStyle('- [ ] a\n- [x] b', 0, 15, 'checklist'))).toBe('a\nb|');
    expect(apply('## Title', toggleLineStyle('## Title', 3, 3, 'heading'))).toBe('Title|');
  });

  test('works on the whole line around the cursor, and keeps indents', () => {
    expect(apply('one\n  two\nthree', toggleLineStyle('one\n  two\nthree', 6, 6, 'bullet'))).toBe('one\n  - two|\nthree');
  });

  test('leaves blank lines alone in a multi-line selection', () => {
    expect(apply('a\n\nb', toggleLineStyle('a\n\nb', 0, 4, 'quote'))).toBe('> a\n\n> b|');
  });
});

test.describe('blocks (cards, dividers, templates)', () => {
  test('sit on their own lines with a blank line either side', () => {
    expect(apply('before\nafter', insertBlock('before\nafter', 7, 7, '---'))).toBe('before\n\n---|\n\nafter');
    expect(apply('', insertBlock('', 0, 0, '---'))).toBe('---|\n');
  });

  test('cards are Obsidian callouts holding the selected text', () => {
    expect(cardMarkdown('tip', 'Drink water\nStretch')).toBe('> [!tip] Tip\n> Drink water\n> Stretch');
    expect(cardMarkdown('question')).toBe('> [!question] Question\n> ');
  });
});

test.describe('checklists', () => {
  const list = '- [ ] one\n- [x] two\n```\n- [ ] in code\n```\n1. [ ] three';

  test('ticks and unticks by position', () => {
    expect(toggleTask(list, 0)).toContain('- [x] one');
    expect(toggleTask(list, 1)).toContain('- [ ] two');
  });

  test('skips checkboxes inside code blocks', () => {
    const ticked = toggleTask(list, 2);
    expect(ticked).toContain('1. [x] three');
    expect(ticked).toContain('- [ ] in code');
  });

  test('changes nothing for a number that is not there', () => {
    expect(toggleTask(list, 9)).toBe(list);
  });
});
