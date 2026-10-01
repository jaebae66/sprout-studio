import { useEffect, type RefObject } from 'react';
import { Button } from '../../shared/components/Button';
import { ColorDots, type ColorDotOption } from '../../shared/components/ColorDots';
import { COVER_COLORS, COVER_PATTERNS, STICKERS, type CoverColorName, type StickerName } from '../constants';
import { COVER_HEIGHT, COVER_WIDTH, drawCover } from '../lib/cover';
import type { CoverSettings } from '../types';
import { PillPicker } from './PillPicker';

const COLOR_OPTIONS: ColorDotOption<CoverColorName>[] = (Object.keys(COVER_COLORS) as CoverColorName[]).map(
  (name) => ({ value: name, fill: COVER_COLORS[name].background, ring: COVER_COLORS[name].ink }),
);
const STICKER_NAMES = Object.keys(STICKERS) as StickerName[];

interface CoverDesignerProps {
  /** The preview canvas, also read when the EPUB is made. */
  canvasRef: RefObject<HTMLCanvasElement>;
  title: string;
  author: string;
  cover: CoverSettings;
  onChange: (patch: Partial<CoverSettings>) => void;
  /** A new picture, or null to go back to the generated cover. */
  onImageChange: (file: File | null) => void;
}

export function CoverDesigner({ canvasRef, title, author, cover, onChange, onImageChange }: CoverDesignerProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const content = { title, author, cover };

    if (!cover.imageUrl) {
      drawCover(canvas, content);
      return;
    }

    let active = true;
    const image = new Image();
    image.onload = () => active && drawCover(canvas, content, image);
    image.onerror = () => active && drawCover(canvas, content);
    image.src = cover.imageUrl;
    return () => {
      active = false;
    };
  }, [canvasRef, title, author, cover]);

  return (
    <div className="coverbox">
      <canvas
        ref={canvasRef}
        className="cover-canvas"
        width={COVER_WIDTH}
        height={COVER_HEIGHT}
        aria-label="Cover preview"
      />
      <div className="cover-controls">
        <div>
          <span className="lbl">Colour</span>
          <ColorDots options={COLOR_OPTIONS} selected={cover.color} onSelect={(color) => onChange({ color })} />
        </div>
        <div>
          <span className="lbl">Pattern</span>
          <PillPicker options={COVER_PATTERNS} selected={cover.pattern} onSelect={(pattern) => onChange({ pattern })} />
        </div>
        <div>
          <span className="lbl">Sticker</span>
          <PillPicker
            options={STICKER_NAMES}
            selected={cover.sticker}
            onSelect={(sticker) => onChange({ sticker })}
            renderLabel={(name) => STICKERS[name] || 'none'}
          />
        </div>
        <div>
          <label className="lbl" htmlFor="cover-image">
            Or use your own picture
          </label>
          <input
            type="file"
            id="cover-image"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImageChange(file);
              event.target.value = '';
            }}
          />
        </div>
        {cover.imageUrl && (
          <Button ghost size="small" onClick={() => onImageChange(null)}>
            Use the made-up cover again
          </Button>
        )}
      </div>
    </div>
  );
}
