import { useState } from 'react';
import { Panel } from '../../shared/components/Panel';
import { useStudy } from '../StudyContext';

export function NotesView() {
  const { data, update, icon } = useStudy();
  const [saveStatus, setSaveStatus] = useState('Saves as you type');

  function handleChange(notes: string) {
    const saved = update((current) => ({ ...current, notes }));
    setSaveStatus(saved ? 'Saved' : 'Could not save in this browser');
  }

  return (
    <Panel
      className="stack tight"
      title={`${icon('notes')} Notes`}
      aside={<span className="muted small-text">{saveStatus}</span>}
    >
      <textarea
        rows={18}
        placeholder="Notes, ideas, and questions to follow up…"
        value={data.notes}
        onChange={(event) => handleChange(event.target.value)}
      />
    </Panel>
  );
}
