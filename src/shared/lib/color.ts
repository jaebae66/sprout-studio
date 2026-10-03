/** Small helpers for #rrggbb colours. */

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((digit) => digit + digit).join('') : value.padEnd(6, '0');
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16) || 0) as [number, number, number];
}

/** `amount` 0 gives `from`, 1 gives `to`. */
export function mixHex(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return `#${a
    .map((channel, index) => Math.round(channel + (b[index] - channel) * amount).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** True for colours dark enough to need light text and dark form controls. */
export function isDarkHex(hex: string): boolean {
  const [r, g, b] = channels(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}
