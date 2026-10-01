import { useEffect, useState } from 'react';
import { downloadBlob } from '../../shared/lib/download';

/** Download helper offered when the page runs inside a Claude artifact. */
interface ClaudeDownloads {
  save(options: { filename: string; data: string }): Promise<unknown>;
}

declare global {
  interface Window {
    claude?: { use?: (capability: 'downloads') => Promise<ClaudeDownloads> };
  }
}

/**
 * Saves backup files. In a normal browser this is a plain download; when hosted
 * as a Claude artifact, it goes through the artifact's downloads capability.
 */
export function useBackupSaver(notify: (message: string) => void) {
  const isClaudeHosted = Boolean(window.claude);
  const [claudeDownloads, setClaudeDownloads] = useState<ClaudeDownloads | null>(null);

  useEffect(() => {
    const claude = window.claude;
    if (!claude?.use) return;
    let active = true;
    claude
      .use('downloads')
      .then((downloads) => active && setClaudeDownloads(downloads))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function save(filename: string, text: string) {
    if (claudeDownloads) {
      try {
        await claudeDownloads.save({ filename, data: text });
        notify('Backup saved');
      } catch (error) {
        if (error && (error as { code?: unknown }).code !== 'declined') notify('Could not save the backup here');
      }
      return;
    }
    downloadBlob(filename, new Blob([text], { type: 'application/json' }));
    notify('Backup saved');
  }

  return {
    /** False while hosted somewhere that hasn't granted downloads. */
    canSave: !isClaudeHosted || claudeDownloads !== null,
    save,
  };
}
