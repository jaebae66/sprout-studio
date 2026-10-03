/** Paper styles shared by book pages (Book maker) and note pages (Notes). */
export const PAPER_STYLES = [
  { id: 'plain', label: 'Plain' },
  { id: 'lined', label: 'Lined' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'graph', label: 'Graph' },
  { id: 'squared', label: 'Squared' },
] as const;
export type PaperStyle = (typeof PAPER_STYLES)[number]['id'];

export function isPaperStyle(value: unknown): value is PaperStyle {
  return PAPER_STYLES.some((paper) => paper.id === value);
}

export interface PaperBackground {
  /** CSS `background-image`, or 'none'. */
  image: string;
  /** CSS `background-size`, or '' when there's no pattern. */
  size: string;
}

/**
 * The background that draws a paper style in `ink`. `step` is the spacing as a CSS
 * length: for lined paper, pass the text's line height so writing sits on the lines.
 * `faintInk` draws the small squares on squared paper; e-readers need a plain colour
 * here, since many don't understand color-mix().
 */
export function paperBackground(
  style: PaperStyle,
  ink: string,
  step = '1.5em',
  faintInk = `color-mix(in srgb, ${ink} 45%, transparent)`,
): PaperBackground {
  switch (style) {
    case 'lined':
      return { image: `linear-gradient(to bottom, transparent 94%, ${ink} 94%)`, size: `100% ${step}` };
    case 'dotted':
      return { image: `radial-gradient(circle, ${ink} 1.2px, transparent 1.6px)`, size: `${step} ${step}` };
    case 'graph':
      return {
        image: `linear-gradient(to right, ${ink} 1px, transparent 1px), linear-gradient(to bottom, ${ink} 1px, transparent 1px)`,
        size: `${step} ${step}`,
      };
    case 'squared': {
      // Big squares with fainter small ones inside, like maths paper.
      const big = times(step, 4);
      return {
        image: [
          `linear-gradient(to right, ${ink} 1.5px, transparent 1.5px)`,
          `linear-gradient(to bottom, ${ink} 1.5px, transparent 1.5px)`,
          `linear-gradient(to right, ${faintInk} 1px, transparent 1px)`,
          `linear-gradient(to bottom, ${faintInk} 1px, transparent 1px)`,
        ].join(', '),
        size: `${big} ${big}, ${big} ${big}, ${step} ${step}, ${step} ${step}`,
      };
    }
    default:
      return { image: 'none', size: '' };
  }
}

/** "1.5em" × 4 → "6em", worked out here because many e-readers don't support calc(). */
function times(length: string, factor: number): string {
  const match = /^([\d.]+)([a-z%]*)$/.exec(length.trim());
  return match ? `${Number(match[1]) * factor}${match[2]}` : `calc(${length} * ${factor})`;
}
