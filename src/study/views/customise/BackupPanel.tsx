import { Button } from '../../../shared/components/Button';
import { Panel } from '../../../shared/components/Panel';
import { useBackupSaver } from '../../hooks/useBackupSaver';
import { useNotes } from '../../hooks/useNotes';
import { today } from '../../lib/dates';
import { parseBackup, serializeBackup } from '../../lib/storage';
import { vault } from '../../lib/vault';
import { useStudy } from '../../StudyContext';

export function BackupPanel() {
  const { data, update, notify } = useStudy();
  const backup = useBackupSaver(notify);
  const notes = useNotes();
  // In the desktop app the notes are files in the vault, so add them in: a backup then has
  // everything, and restoring it puts any missing notes back in the vault.
  const everything = notes.folder ? { ...data, pages: notes.notes } : data;

  async function restore(file: File) {
    try {
      const restored = parseBackup(await file.text());
      update(() => restored);
      notify('Progress restored');
    } catch {
      notify('That file is not a Sprout Study backup');
    }
  }

  return (
    <Panel className="stack tight" title="Keep your progress safe">
      <p className="muted">
        {vault
          ? 'Your notes are Markdown files in your vault folder, and the rest of your progress is in the app’s database. A backup file holds both: save one now and then to keep it safe.'
          : 'Your progress lives in this browser. Save a backup file now and then, so clearing your browser never wipes it.'}
      </p>
      <div className="row">
        {backup.canSave && (
          <Button onClick={() => backup.save(`sprout-study-backup-${today()}.json`, serializeBackup(everything))}>
            Save backup file
          </Button>
        )}
        <label className="btn ghost" htmlFor="restore">
          Restore from backup
        </label>
        <input
          type="file"
          id="restore"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void restore(file);
            event.target.value = '';
          }}
        />
      </div>
    </Panel>
  );
}
