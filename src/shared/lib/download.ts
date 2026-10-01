/** Saves a blob to the user's downloads folder. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Strips characters that aren't allowed in file names and keeps it short. */
export function toSafeFilename(name: string, fallback: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || fallback;
}
