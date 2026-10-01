import { COVER_COLORS, STICKERS, type CoverPalette, type CoverPattern } from '../constants';
import type { CoverSettings } from '../types';

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 1800;

const CENTER_X = COVER_WIDTH / 2;
const TITLE_FONT = (size: number) => `700 ${size}px Mali, "Comic Sans MS", cursive`;
const AUTHOR_FONT = '600 58px Nunito, system-ui, sans-serif';
const STICKER_FONT = '200px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

interface CoverContent {
  title: string;
  author: string;
  cover: CoverSettings;
}

/** Draws the book cover. With an `image`, the picture fills the cover instead. */
export function drawCover(canvas: HTMLCanvasElement, content: CoverContent, image?: HTMLImageElement): void {
  const context = canvas.getContext('2d');
  if (!context) return;

  if (image) {
    drawImageToFill(context, image, canvas.width, canvas.height);
    return;
  }

  const palette = COVER_COLORS[content.cover.color];
  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawPattern(context, content.cover.pattern, palette.ink, canvas.width, canvas.height);
  drawLabel(context, palette.ink);
  drawTitle(context, content.title.trim() || 'Untitled', palette);

  const author = content.author.trim();
  if (author) {
    context.font = AUTHOR_FONT;
    context.fillStyle = palette.authorInk;
    context.fillText(author, CENTER_X, 1160);
  }

  const sticker = STICKERS[content.cover.sticker];
  if (sticker) {
    context.font = STICKER_FONT;
    context.fillText(sticker, CENTER_X, 1470);
  }
}

/** Renders the canvas as a JPEG for the EPUB. */
export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render cover'))),
      'image/jpeg',
      0.9,
    );
  });
}

function drawImageToFill(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawPattern(context: CanvasRenderingContext2D, pattern: CoverPattern, ink: string, width: number, height: number) {
  context.save();
  context.globalAlpha = 0.35;
  context.fillStyle = ink;
  context.strokeStyle = ink;

  if (pattern === 'dots') {
    for (let x = 0; x < width; x += 90) {
      for (let y = 0; y < height; y += 90) {
        const rowOffset = (y / 90) % 2 ? 45 : 0;
        context.beginPath();
        context.arc(x + rowOffset, y, 12, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  if (pattern === 'gingham') {
    context.globalAlpha = 0.18;
    for (let x = 0; x < width; x += 120) context.fillRect(x, 0, 60, height);
    for (let y = 0; y < height; y += 120) context.fillRect(0, y, width, 60);
  }

  if (pattern === 'leaves') {
    for (let x = -40; x < width; x += 170) {
      for (let y = -40; y < height; y += 170) {
        const leafX = x + ((y / 170) % 2 ? 85 : 0);
        context.save();
        context.translate(leafX, y);
        context.rotate(-0.6);
        context.beginPath();
        context.moveTo(0, 0);
        context.bezierCurveTo(10, -40, 60, -50, 70, -30);
        context.bezierCurveTo(60, 0, 20, 10, 0, 0);
        context.fill();
        context.restore();
      }
    }
  }

  context.restore();
}

/** The white rounded label with a dashed border that holds the title and author. */
function drawLabel(context: CanvasRenderingContext2D, ink: string) {
  context.fillStyle = 'rgba(255,255,255,.9)';
  roundedRect(context, 110, 420, 980, 860, 70);
  context.fill();

  context.lineWidth = 10;
  context.setLineDash([28, 22]);
  context.strokeStyle = ink;
  roundedRect(context, 140, 450, 920, 800, 52);
  context.stroke();
  context.setLineDash([]);
}

function drawTitle(context: CanvasRenderingContext2D, title: string, palette: CoverPalette) {
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const { lines, size } = fitTitle(context, title);
  const lineHeight = size * 1.2;
  const top = 780 - ((lines.length - 1) * lineHeight) / 2;

  context.fillStyle = palette.titleInk;
  lines.forEach((line, index) => context.fillText(line, CENTER_X, top + index * lineHeight));
}

/** Shrinks the title font step by step until the wrapped title fits on the label. */
function fitTitle(context: CanvasRenderingContext2D, title: string): { lines: string[]; size: number } {
  let size = 120;
  for (;;) {
    context.font = TITLE_FONT(size);
    const lines = wrapLines(context, title, 800);
    const nextSize = size - 8;
    const tooBig =
      lines.length * nextSize * 1.25 > 480 || lines.some((line) => context.measureText(line).width > 840);
    if (!tooBig || nextSize <= 48) return { lines, size };
    size = nextSize;
  }
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
