import { useEffect } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { cx } from '../../shared/lib/classNames';
import type { QuizSession } from '../hooks/useQuiz';
import { useStudy } from '../StudyContext';

export function QuizView({ quiz }: { quiz: QuizSession }) {
  const { data, update, icon } = useStudy();
  const { question, picked, streak, next } = quiz;

  // Ask the first question once there are cards to ask about.
  useEffect(() => {
    if (!question && data.cards.length) next(data.cards);
  }, [question, data.cards, next]);

  function choose(optionIndex: number) {
    const newStreak = quiz.pick(optionIndex);
    if (newStreak !== null && newStreak > data.quizBest) {
      update((current) => ({ ...current, quizBest: newStreak }));
    }
  }

  const title = `${icon('quiz')} Quick quiz`;
  const scoreChip = (
    <span className="chip">
      Streak {streak} · Best {data.quizBest}
    </span>
  );

  if (!question) {
    return (
      <Panel className="stack quiz-panel" title={title} aside={scoreChip}>
        <div className="empty">Add some flashcards first, then come back for a quiz.</div>
      </Panel>
    );
  }

  const answered = picked !== null;
  const answeredCorrectly = picked !== null && question.options[picked].id === question.answer.id;

  return (
    <Panel className="stack quiz-panel" title={title} aside={scoreChip}>
      <p className="muted">Which one describes…</p>
      <h3 className="quiz-term">{question.answer.q}</h3>
      <div className="opts">
        {question.options.map((option, index) => {
          const isAnswer = option.id === question.answer.id;
          return (
            <button
              key={option.id}
              type="button"
              className={cx('opt', answered && isAnswer && 'right', answered && index === picked && !isAnswer && 'wrong')}
              disabled={answered}
              onClick={() => choose(index)}
            >
              {option.a}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="row spread">
          <b>{answeredCorrectly ? `Correct! ${icon('done')}` : 'Not quite. The green one is right.'}</b>
          <Button onClick={() => next(data.cards)}>Next question</Button>
        </div>
      )}
    </Panel>
  );
}
