import { useState } from 'react';
import { cx } from '../../shared/lib/classNames';

interface FlipCardProps {
  /** Small caption on the front, e.g. "Term 2 / 8". */
  counter: string;
  front: string;
  back: string;
}

/** A flashcard that flips over when tapped (or with Enter/Space). */
export function FlipCard({ counter, front, back }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((current) => !current);

  return (
    <div className="cardwrap">
      <div
        className={cx('flash', flipped && 'flip')}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onClick={flip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            flip();
          }
        }}
      >
        <div className="face">
          <small>{counter}</small>
          <div className="term">{front}</div>
        </div>
        <div className="face back">
          <small>Answer</small>
          <p>{back}</p>
        </div>
      </div>
    </div>
  );
}
