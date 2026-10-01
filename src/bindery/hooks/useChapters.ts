import { useRef, useState } from 'react';
import type { Chapter, ChapterContent } from '../types';

/** The ordered chapter list, with stable ids for React keys. */
export function useChapters() {
  const [items, setItems] = useState<Chapter[]>([]);
  const nextId = useRef(0);

  const withIds = (chapters: ChapterContent[]): Chapter[] =>
    chapters.map((chapter) => ({ ...chapter, id: ++nextId.current }));

  return {
    items,

    append(chapters: ChapterContent[]) {
      const added = withIds(chapters);
      setItems((current) => [...current, ...added]);
    },

    replaceAll(chapters: ChapterContent[]) {
      setItems(withIds(chapters));
    },

    rename(id: number, title: string) {
      setItems((current) => current.map((chapter) => (chapter.id === id ? { ...chapter, title } : chapter)));
    },

    /** Swaps a chapter with its neighbour: -1 moves it up, 1 moves it down. */
    move(id: number, direction: -1 | 1) {
      setItems((current) => {
        const index = current.findIndex((chapter) => chapter.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.length) return current;
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },

    remove(id: number) {
      setItems((current) => current.filter((chapter) => chapter.id !== id));
    },

    clear() {
      setItems([]);
    },
  };
}
