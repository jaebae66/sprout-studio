import { expect, test } from '@playwright/test';
import { bookCss, pageDeclarations } from '../../src/bindery/lib/pageStyle';
import { isDarkHex, mixHex } from '../../src/shared/lib/color';
import { PAPER_STYLES, paperBackground } from '../../src/shared/lib/paper';

test('every paper style has a pattern, except plain', () => {
  for (const { id } of PAPER_STYLES) {
    const background = paperBackground(id, '#123456');
    if (id === 'plain') expect(background).toEqual({ image: 'none', size: '' });
    else expect(background.image).toContain('#123456');
  }
});

test('lined paper is spaced to the line height', () => {
  expect(paperBackground('lined', '#000', '1.65em').size).toBe('100% 1.65em');
});

test('squared paper works out its big squares without calc()', () => {
  const { size } = paperBackground('squared', '#000', '1.5em', '#00000080');
  expect(size).toBe('6em 6em, 6em 6em, 1.5em 1.5em, 1.5em 1.5em');
});

test('book CSS only uses features e-readers understand', () => {
  for (const { id } of PAPER_STYLES) {
    const css = bookCss({ paper: id, color: 'cream', font: 'serif' });
    expect(css).not.toMatch(/calc\(|color-mix|var\(/);
  }
});

test('book CSS carries the page colour, paper and font', () => {
  const css = bookCss({ paper: 'dotted', color: 'night', font: 'typewriter' });
  expect(css).toContain('background-color:#1b1f24');
  expect(css).toContain('radial-gradient');
  expect(css).toContain('Courier New');
  // The cover page stays plain.
  expect(css).toContain('body.cover-page{background-image:none');
});

test('lined books leave a whole line between paragraphs', () => {
  expect(bookCss({ paper: 'lined', color: 'white', font: 'serif' })).toContain('p{margin:0 0 1.6em');
  expect(bookCss({ paper: 'plain', color: 'white', font: 'serif' })).toContain('p{margin:0 0 .8em');
});

test('the page preview uses the same declarations as the book', () => {
  const declarations = pageDeclarations({ paper: 'graph', color: 'sky', font: 'sans' });
  expect(declarations['background-color']).toBe('#eef5fc');
  expect(declarations['background-size']).toBe('1.6em 1.6em');
});

test('colour helpers mix and judge darkness', () => {
  expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#ff0000');
  expect(mixHex('#abc', '#abc', 0.3)).toBe('#aabbcc');
  expect(isDarkHex('#141826')).toBe(true);
  expect(isDarkHex('#f3effb')).toBe(false);
});
