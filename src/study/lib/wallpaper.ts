import type { WallpaperId } from '../constants';

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

function patternLayers(kind: WallpaperId, ink: string, photo: string | null): string | null {
  switch (kind) {
    case 'leaves':
      return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90">
        <g fill="${ink}"><path d="M14 42C14 26 27 16 42 16C42 32 30 42 14 42Z"/><path d="M60 82C60 70 70 62 82 62C82 74 72 82 60 82Z"/></g>
        <g stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M14 42L32 26"/><path d="M60 82L74 70"/></g>
        <circle cx="70" cy="22" r="3" fill="${ink}"/>
      </svg>`);
    case 'circuit':
      return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
        <g stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M0 24H30L42 36V70H96"/><path d="M60 0V20L72 32H96"/><path d="M20 96V80L30 70"/></g>
        <g fill="${ink}"><circle cx="42" cy="70" r="5"/><circle cx="72" cy="32" r="5"/><circle cx="30" cy="70" r="4"/><rect x="66" y="56" width="14" height="10" rx="3"/></g>
      </svg>`);
    case 'hearts':
      return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
        <g fill="${ink}"><path d="M20 30c-6-7-15-2-12 5 2 6 12 11 12 11s10-5 12-11c3-7-6-12-12-5z"/><path d="M60 70c-4-5-10-1-8 3 1 4 8 7 8 7s7-3 8-7c2-4-4-8-8-3z"/></g>
      </svg>`);
    case 'polka':
      return [
        `radial-gradient(${ink} 4px, transparent 4.5px) 0 0 / 34px 34px`,
        `radial-gradient(${ink} 4px, transparent 4.5px) 17px 17px / 34px 34px`,
      ].join(', ');
    case 'gingham':
      return [
        `repeating-linear-gradient(0deg, ${ink}99 0 18px, transparent 18px 36px)`,
        `repeating-linear-gradient(90deg, ${ink}99 0 18px, transparent 18px 36px)`,
      ].join(', ');
    case 'photo':
      return photo ? `center / cover no-repeat url("${photo}")` : null;
    case 'plain':
      return null;
  }
}

/** A full CSS `background` value: the pattern over the page colour. */
export function wallpaperBackground(kind: WallpaperId, ink: string, photo: string | null): string {
  const layers = patternLayers(kind, ink, photo);
  return layers ? `${layers} var(--bg)` : 'var(--bg)';
}
