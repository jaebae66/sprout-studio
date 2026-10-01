import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { FlipCard } from '../components/FlipCard';
import type { FlashcardSession } from '../hooks/useFlashcardSession';
import { newId, patchById } from '../lib/list';
import { useStudy } from '../StudyContext';
import type { Flashcard } from '../types';

export function FlashcardsView({ session }: { session: FlashcardSession }) {
  const { update, icon } = useStudy();
  const { card } = session;

  function toggleKnown(target: Flashcard) {
    update((data) => ({ ...data, cards: patchById(data.cards, target.id, { known: !target.known }) }));
    session.afterMarking();
  }

  return (
    <Panel
      className="stack"
      title={`${icon('cards')} Flashcards`}
      aside={
        <label className="row checkbox-label">
          <input
            type="checkbox"
            checked={session.hideKnown}
            onChange={(event) => session.setHideKnown(event.target.checked)}
          />
          Hide cards I know
        </label>
      }
    >
      {card ? (
        <>
          {/* Keyed by step so each new card starts face up. */}
          <FlipCard
            key={`${session.index}-${card.id}`}
            counter={`Term ${session.position + 1} / ${session.deck.length}`}
            front={card.q}
            back={card.a}
          />
          <p className="muted small-text centered">Tap the card to flip it</p>
          <div className="row center">
            <Button ghost onClick={session.previous}>
              Back
            </Button>
            <Button ghost onClick={session.shuffle}>
              Shuffle
            </Button>
            <Button onClick={() => toggleKnown(card)}>
              {card.known ? 'Mark as still learning' : `I know this ${icon('done')}`}
            </Button>
            <Button ghost onClick={session.next}>
              Next
            </Button>
          </div>
        </>
      ) : (
        <div className="empty">
          You know every card {icon('done')} Untick “Hide cards I know” to review them.
        </div>
      )}
      <AddCardForm />
    </Panel>
  );
}

function AddCardForm() {
  const { update, notify } = useStudy();
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = term.trim();
    const a = meaning.trim();
    if (!q || !a) {
      notify('Add both a term and a meaning');
      return;
    }
    update((data) => ({ ...data, cards: [...data.cards, { id: newId('c'), q, a, known: false }] }));
    notify('Card added');
    setTerm('');
    setMeaning('');
  }

  return (
    <form className="add-card" onSubmit={handleSubmit}>
      <h3>Add your own card</h3>
      <div className="row">
        <input
          type="text"
          className="grow-1"
          placeholder="Term, e.g. VLAN"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        <input
          type="text"
          className="grow-2"
          placeholder="Meaning"
          value={meaning}
          onChange={(event) => setMeaning(event.target.value)}
        />
        <Button type="submit">Add card</Button>
      </div>
    </form>
  );
}
