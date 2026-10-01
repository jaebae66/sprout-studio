import { useRef } from 'react';
import { Panel } from '../../../shared/components/Panel';
import { WALLPAPERS, type WallpaperId } from '../../constants';
import { resizeImage } from '../../lib/image';
import { wallpaperBackground } from '../../lib/wallpaper';
import { useStudy } from '../../StudyContext';

const PHOTO_MAX_SIZE = 1600;
const PHOTO_QUALITY = 0.82;

export function WallpaperPicker() {
  const { data, updateSettings, notify, wallInk } = useStudy();
  const { settings } = data;
  const photoInputRef = useRef<HTMLInputElement>(null);

  function choose(wall: WallpaperId) {
    // "Your photo" with no photo yet opens the file picker instead.
    if (wall === 'photo' && !settings.photo) {
      photoInputRef.current?.click();
      return;
    }
    updateSettings({ wall });
  }

  async function applyPhoto(file: File) {
    try {
      const photo = await resizeImage(file, PHOTO_MAX_SIZE, PHOTO_QUALITY);
      const saved = updateSettings({ photo, wall: 'photo' });
      notify(saved ? 'Wallpaper set' : 'Wallpaper set for now. It is too big to remember after you close the page.');
    } catch {
      notify('That picture could not be opened');
    }
  }

  return (
    <Panel className="stack" title="Wallpaper">
      <div className="swatches">
        {WALLPAPERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="sw"
            aria-pressed={settings.wall === id}
            style={{ background: wallpaperBackground(id, wallInk, settings.photo) }}
            onClick={() => choose(id)}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div>
        <label className="lbl" htmlFor="c-photo">
          Upload your own picture
        </label>
        <input
          ref={photoInputRef}
          type="file"
          id="c-photo"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyPhoto(file);
            event.target.value = '';
          }}
        />
      </div>
    </Panel>
  );
}
