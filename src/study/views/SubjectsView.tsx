import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { STATUS_COMPLETE, SUBJECT_STATUSES } from '../constants';
import { useNotes } from '../hooks/useNotes';
import { useStudyGuides } from '../hooks/useStudyGuides';
import { newId, patchById, removeById } from '../lib/list';
import { saveOpenNote } from '../lib/storage';
import { notesForSubject } from '../lib/studyGuide';
import { subjectPercent } from '../lib/subjects';
import { useStudy } from '../StudyContext';
import type { Subject, SubjectStatus } from '../types';

interface SubjectsViewProps {
  /** Switches to Notes, which opens the note saved by saveOpenNote. */
  onOpenNote: () => void;
}

export function SubjectsView({ onOpenNote }: SubjectsViewProps) {
  const { data, icon } = useStudy();

  return (
    <Panel
      className="stack"
      title={`${icon('units')} My subjects`}
      aside={
        <span className="muted small-text">
          Add your classes with their codes: each gets a study guide made from your notes.
        </span>
      }
    >
      <div className="grid">
        {data.units.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} onOpenNote={onOpenNote} />
        ))}
      </div>
      <AddSubjectForm />
    </Panel>
  );
}

function SubjectCard({ subject, onOpenNote }: { subject: Subject; onOpenNote: () => void }) {
  const { data, update, notify, icon } = useStudy();
  const notes = useNotes();
  const guides = useStudyGuides();
  const noteCount = notesForSubject(subject, notes.notes, data.units).notes.length;
  const percent = subjectPercent(subject);
  const rangeId = `pct-${subject.id}`;

  const patch = (changes: Partial<Subject>) =>
    update((data) => ({ ...data, units: patchById(data.units, subject.id, changes) }));

  function setPercent(pct: number) {
    // Moving the slider off zero marks an untouched subject as in progress.
    const status = pct > 0 && subject.status === 0 ? 1 : subject.status;
    patch({ pct, status });
  }

  function setStatus(status: SubjectStatus) {
    patch({ status });
    if (status === STATUS_COMPLETE) notify(`Subject complete! ${icon('done')}`);
  }

  function remove() {
    update((data) => ({ ...data, units: removeById(data.units, subject.id) }));
  }

  function openGuide() {
    saveOpenNote(guides.ensure(subject));
    onOpenNote();
  }

  function makeFlashcards() {
    const added = guides.makeFlashcards(subject);
    notify(
      added
        ? `Made ${added} flashcard${added === 1 ? '' : 's'} ${icon('done')}`
        : 'No new key terms yet. Write them as ==Term==: meaning in your notes.',
    );
  }

  return (
    <div className="unit">
      <div className="row spread">
        <span className="code">{subject.code}</span>
        <span className={`chip s${subject.status}`}>{SUBJECT_STATUSES[subject.status]}</span>
      </div>
      <h3>{subject.name}</h3>
      <span className="muted small-text">
        {noteCount ? `${noteCount} note${noteCount === 1 ? '' : 's'} about this class` : 'No notes mention this class yet'}
      </span>
      <label className="lbl" htmlFor={rangeId}>
        Progress: {percent}%
      </label>
      <input
        type="range"
        id={rangeId}
        min={0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => setPercent(Number(event.target.value))}
      />
      <div className="row">
        <select
          aria-label="Status"
          value={subject.status}
          onChange={(event) => setStatus(Number(event.target.value) as SubjectStatus)}
        >
          {SUBJECT_STATUSES.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <Button ghost size="small" onClick={remove}>
          Remove
        </Button>
      </div>
      <div className="row">
        <Button size="small" onClick={openGuide}>
          📘 Study guide
        </Button>
        <Button ghost size="small" onClick={makeFlashcards} title="From key terms written as ==Term==: meaning">
          🍀 Make flashcards
        </Button>
      </div>
    </div>
  );
}

function AddSubjectForm() {
  const { update, notify } = useStudy();
  const guides = useStudyGuides();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      notify('Add a subject or topic name');
      return;
    }
    const subject: Subject = {
      id: newId('u'),
      code: code.trim().toUpperCase(),
      name: trimmedName,
      status: 0,
      pct: 0,
    };
    update((data) => ({ ...data, units: [...data.units, subject] }));
    // Every class gets a study guide straight away; it fills in as notes mention the class.
    guides.ensure(subject);
    notify(`Added ${subject.code || subject.name}, with a study guide in Notes 📘`);
    setCode('');
    setName('');
  }

  return (
    <form className="row" onSubmit={handleSubmit}>
      <input
        type="text"
        className="code-input"
        placeholder="Class code, e.g. BIO101"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <input
        type="text"
        className="grow-1"
        placeholder="Class or topic name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit">Add subject</Button>
    </form>
  );
}
