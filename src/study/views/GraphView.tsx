import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { NoteGraph } from '../components/NoteGraph';
import { useNotes } from '../hooks/useNotes';
import { cleanNoteName, findNote } from '../lib/notes';
import { loadOpenNote, saveOpenNote } from '../lib/storage';
import { useStudy } from '../StudyContext';

interface GraphViewProps {
  /** Switches to the Notes tab, which opens the note saved by saveOpenNote. */
  onOpenNote: () => void;
}

export function GraphView({ onOpenNote }: GraphViewProps) {
  const store = useNotes();
  const { notes } = store;
  const { icon } = useStudy();

  /** Opens a note by name, creating it first if it was only linked to. */
  function open(name: string) {
    saveOpenNote(findNote(notes, name)?.name ?? store.create(cleanNoteName(name)));
    onOpenNote();
  }

  function startNote() {
    saveOpenNote(store.create('My first note', 'Link to other notes with [[double brackets]], like [[Ideas]].'));
    onOpenNote();
  }

  return (
    <Panel
      className="graph-panel stack tight"
      title={`${icon('graph')} Graph`}
      aside={<span className="muted small-text">{notes.length} notes</span>}
    >
      {notes.length ? (
        <>
          <NoteGraph notes={notes} active={loadOpenNote()} onOpen={open} />
          <p className="muted small-text">
            Each dot is a note and each line a [[link]]. Click a dot to open it · drag to move · scroll to zoom
          </p>
        </>
      ) : (
        <div className="empty stack">
          <p>{store.ready ? 'No notes yet, so the graph is empty.' : 'Opening your vault…'}</p>
          <p className="small-text">
            Write notes in the Notes tab and link them with [[double brackets]]. Each note becomes a dot here, and
            each link a line between them.
          </p>
          {store.ready && (
            <div className="row center">
              <Button onClick={startNote}>Write my first note</Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
