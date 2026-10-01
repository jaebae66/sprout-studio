interface WithId {
  id: string;
}

export function patchById<T extends WithId>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeById<T extends WithId>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

/** A new id such as "t1712345678901". */
export function newId(prefix: string): string {
  return `${prefix}${Date.now()}`;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/** A shuffled copy (Fisher–Yates). */
export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
