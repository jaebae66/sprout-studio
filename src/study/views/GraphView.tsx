import { useMemo, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { NoteGraph } from '../components/NoteGraph';
import { useNotes } from '../hooks/useNotes';
import { useStudyGuides } from '../hooks/useStudyGuides';
import { buildGraphData, type GraphNodeData, type GraphOptions } from '../lib/graphData';
import { cleanNoteName, findNote } from '../lib/notes';
import { loadOpenNote, saveOpenNote } from '../lib/storage';
import { useStudy } from '../StudyContext';

interface GraphViewProps {
  /** Switches to the Notes tab, which opens the note saved by saveOpenNote. */
  onOpenNote: () => void;
}

const CONNECTIONS: { key: keyof GraphOptions; label: string; hint: string }[] = [
  { key: 'links', label: 'Links', hint: '[[links]] you wrote' },
  { key: 'related', label: 'Shared keywords', hint: 'notes about the same things' },
  { key: 'subjects', label: 'Classes', hint: 'notes that mention a class code' },
];

export function GraphView({ onOpenNote }: GraphViewProps) {
  const store = useNotes();
  const guides = useStudyGuides();
  const { data, icon } = useStudy();
  const { notes } = store;
  const [options, setOptions] = useState<GraphOptions>({ links: true, related: true, subjects: true });
  const [hovered, setHovered] = useState<GraphNodeData | null>(null);
  const graph = useMemo(() => buildGraphData(notes, data.units, options), [notes, data.units, options]);

  /** Opens a note, a class's study guide (making it if needed), or a note that was only linked to. */
  function open(node: GraphNodeData) {
    const subject = node.subjectId ? data.units.find((unit) => unit.id === node.subjectId) : undefined;
    if (subject) saveOpenNote(guides.ensure(subject));
    else saveOpenNote(findNote(notes, node.open)?.name ?? store.create(cleanNoteName(node.open)));
    onOpenNote();
  }

  function startNote() {
    saveOpenNote(store.create('My first note', 'Link to other notes with [[double brackets]], like [[Ideas]].'));
    onOpenNote();
  }

  const noteCount = graph.nodes.filter((node) => node.kind === 'note').length;

  return (
    <Panel
      className="graph-panel stack tight"
      title={`${icon('graph')} Graph`}
      aside={
        <div className="graph-toggles" role="group" aria-label="Connections to show">
          {CONNECTIONS.map(({ key, label, hint }) => (
            <label key={key} className={`graph-toggle toggle-${key}`} title={hint}>
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(event) => setOptions((current) => ({ ...current, [key]: event.target.checked }))}
              />
              <i aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      }
    >
      {notes.length || data.units.length ? (
        <>
          <NoteGraph data={graph} active={loadOpenNote()} onOpen={open} onHover={setHovered} />
          <p className="muted small-text graph-info" aria-live="polite">
            {hovered ? describe(hovered) : `${noteCount} notes · click a dot to open it · drag to move · scroll to zoom`}
          </p>
        </>
      ) : (
        <div className="empty stack">
          <p>{store.ready ? 'No notes yet, so the graph is empty.' : 'Opening your vault…'}</p>
          <p className="small-text">
            Write notes in the Notes tab. Notes about the same things join up by themselves, [[links]] join them on
            purpose, and classes from the Subjects tab gather the notes that mention their code.
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

function describe(node: GraphNodeData): string {
  if (node.kind === 'subject') return `${node.label}${node.keywords[0] ? ` – ${node.keywords[0]}` : ''} · click to open its study guide`;
  if (node.kind === 'missing') return `${node.label} · linked to but not written yet: click to start it`;
  return `${node.label}${node.keywords.length ? ` · topics: ${node.keywords.join(', ')}` : ''}`;
}
