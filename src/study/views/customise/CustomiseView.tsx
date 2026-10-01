import { BackupPanel } from './BackupPanel';
import { IconPackPicker } from './IconPackPicker';
import { ProfileSettings } from './ProfileSettings';
import { WallpaperPicker } from './WallpaperPicker';

export function CustomiseView() {
  return (
    <>
      <div className="grid">
        <ProfileSettings />
        <WallpaperPicker />
      </div>
      <IconPackPicker />
      <BackupPanel />
    </>
  );
}
