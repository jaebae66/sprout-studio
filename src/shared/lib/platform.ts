/** Which kind of computer the app is running on, for wording that differs between systems. */
const platform = typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent;

const isMac = /Mac|iPhone|iPad/i.test(platform);
const isWindows = /Win/i.test(platform);

/** "Ctrl+Shift+H" on Windows and Linux, "⌘⇧H" on a Mac (where Cmd does what Ctrl does elsewhere). */
export function keys(shortcut: string): string {
  return isMac ? shortcut.replace(/Ctrl\+/g, '⌘').replace(/Shift\+/g, '⇧').replace(/Alt\+/g, '⌥') : shortcut;
}

/** What the system calls the place deleted files go. */
export const trashName = isWindows ? 'Recycle Bin' : 'Trash';
