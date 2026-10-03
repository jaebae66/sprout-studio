import { BackupPanel } from './BackupPanel';
import { ColoursPanel } from './ColoursPanel';
import { IconPackPicker } from './IconPackPicker';
import { ProfileSettings } from './ProfileSettings';
import { WallpaperPicker } from './WallpaperPicker';

export function CustomiseView() {
  return (
    <>
      <div className="grid">
        <ColoursPanel />
        <div className="stack">
          <ProfileSettings />
          <WallpaperPicker />
        </div>
      </div>
      <IconPackPicker />
      <BackupPanel />
    </>
  );
}
