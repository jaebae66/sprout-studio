import { useCallback, useState } from 'react';
import { pickRandom, shuffled } from '../lib/list';
import type { Flashcard } from '../types';

export interface QuizQuestion {
  answer: Flashcard;
  /** The answer plus up to three other cards, in random order. */
  options: Flashcard[];
}

function createQuestion(cards: Flashcard[]): QuizQuestion | null {
  const answer = pickRandom(cards);
  if (!answer) return null;
  const distractors = shuffled(cards.filter((card) => card.id !== answer.id)).slice(0, 3);
  return { answer, options: shuffled([answer, ...distractors]) };
}

/** The current quiz question and streak. Kept in App so it survives switching tabs. */
export function useQuiz() {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const next = useCallback((cards: Flashcard[]) => {
    setQuestion(createQuestion(cards));
    setPicked(null);
  }, []);

  /** Answers the question. Returns the new streak, or null if it was already answered. */
  function pick(optionIndex: number): number | null {
    if (!question || picked !== null) return null;
    const correct = question.options[optionIndex].id === question.answer.id;
    const newStreak = correct ? streak + 1 : 0;
    setPicked(optionIndex);
    setStreak(newStreak);
    return newStreak;
  }

  return { question, picked, streak, next, pick };
}

export type QuizSession = ReturnType<typeof useQuiz>;
