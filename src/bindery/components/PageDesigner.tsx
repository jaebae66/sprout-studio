import type { CSSProperties } from 'react';
import { ColorDots, type ColorDotOption } from '../../shared/components/ColorDots';
import { PAPER_STYLES, type PaperStyle } from '../../shared/lib/paper';
import { BOOK_FONTS, PAGE_COLORS, type BookFontName, type PageColorName } from '../constants';
import { pageDeclarations } from '../lib/pageStyle';
import type { PageSettings } from '../types';
import { PillPicker } from './PillPicker';

const COLOR_OPTIONS: ColorDotOption<PageColorName>[] = (Object.keys(PAGE_COLORS) as PageColorName[]).map((name) => ({
  value: name,
  fill: PAGE_COLORS[name].paper,
  ring: PAGE_COLORS[name].lines,
}));
const PAPER_IDS = PAPER_STYLES.map((paper) => paper.id);
const FONT_NAMES = Object.keys(BOOK_FONTS) as BookFontName[];

/** "background-color" → "backgroundColor", for React's style prop. */
function toStyle(declarations: Record<string, string>): CSSProperties {
  return Object.fromEntries(
    Object.entries(declarations).map(([property, value]) => [property.replace(/-(\w)/g, (_, letter) => letter.toUpperCase()), value]),
  );
}

interface PageDesignerProps {
  page: PageSettings;
  title: string;
  onChange: (patch: Partial<PageSettings>) => void;
}

/** Paper, page colour and font for the inside of the book, with a preview of a page. */
export function PageDesigner({ page, title, onChange }: PageDesignerProps) {
  const colors = PAGE_COLORS[page.color];

  return (
    <div className="coverbox">
      <div className="page-preview" style={toStyle(pageDeclarations(page))} aria-label="Page preview">
        <h4 style={{ color: colors.heading }}>{title.trim() || 'Chapter 1'}</h4>
        <p>Once upon a time, a tiny sprout pushed up through the soil and looked around at the big wide world.</p>
        <p>It was a little scared, but mostly curious.</p>
      </div>
      <div className="cover-controls">
        <div>
          <span className="lbl">Paper</span>
          <PillPicker
            options={PAPER_IDS}
            selected={page.paper}
            onSelect={(paper: PaperStyle) => onChange({ paper })}
            renderLabel={(id) => PAPER_STYLES.find((paper) => paper.id === id)?.label}
          />
        </div>
        <div>
          <span className="lbl">Page colour</span>
          <ColorDots options={COLOR_OPTIONS} selected={page.color} onSelect={(color) => onChange({ color })} />
        </div>
        <div>
          <span className="lbl">Font</span>
          <PillPicker
            options={FONT_NAMES}
            selected={page.font}
            onSelect={(font) => onChange({ font })}
            renderLabel={(name) => BOOK_FONTS[name].label}
          />
        </div>
        <p className="muted small-text">
          Most e-readers show these. Kindle may swap in its own plain page and font.
        </p>
      </div>
    </div>
  );
}
