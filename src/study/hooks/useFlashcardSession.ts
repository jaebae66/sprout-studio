import { useState } from 'react';
import { isDefined, shuffled } from '../lib/list';
import type { Flashcard } from '../types';

/** Where you are in the flashcard deck. Kept in App so it survives switching tabs. */
export function useFlashcardSession(cards: Flashcard[]) {
  const [index, setIndex] = useState(0);
  const [hideKnown, setHideKnownState] = useState(false);
  /** Card ids in shuffled order, or null for the saved order. */
  const [order, setOrder] = useState<string[] | null>(null);

  const ordered = order ? order.map((id) => cards.find((card) => card.id === id)).filter(isDefined) : cards;
  const deck = hideKnown ? ordered.filter((card) => !card.known) : ordered;
  const position = deck.length > 0 ? index % deck.length : 0;
  const card: Flashcard | undefined = deck[position];

  return {
    /** Ever-increasing step count; wraps around the deck via `position`. */
    index,
    deck,
    position,
    card,
    hideKnown,

    next: () => setIndex((current) => current + 1),
    previous: () => setIndex((current) => Math.max(0, current - 1)),

    shuffle: () => {
      setOrder(shuffled(cards.map((item) => item.id)));
      setIndex(0);
    },

    setHideKnown: (hide: boolean) => {
      setHideKnownState(hide);
      setIndex(0);
    },

    /** After marking a card, move on, unless it just dropped out of the deck. */
    afterMarking: () => {
      if (!hideKnown) setIndex((current) => current + 1);
    },
  };
}

export type FlashcardSession = ReturnType<typeof useFlashcardSession>;
