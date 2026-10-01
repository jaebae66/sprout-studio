/** Joins the truthy class names: `cx('btn', ghost && 'ghost')`. */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ');
}
