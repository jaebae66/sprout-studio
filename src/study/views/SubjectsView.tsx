import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { STATUS_COMPLETE, SUBJECT_STATUSES } from '../constants';
import { newId, patchById, removeById } from '../lib/list';
import { subjectPercent } from '../lib/subjects';
import { useStudy } from '../StudyContext';
import type { Subject, SubjectStatus } from '../types';

export function SubjectsView() {
  const { data, icon } = useStudy();

  return (
    <Panel
      className="stack"
      title={`${icon('units')} My subjects`}
      aside={<span className="muted small-text">Add the topics or classes you want to track.</span>}
    >
      <div className="grid">
        {data.units.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
      <AddSubjectForm />
    </Panel>
  );
}

function SubjectCard({ subject }: { subject: Subject }) {
  const { update, notify, icon } = useStudy();
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

  return (
    <div className="unit">
      <div className="row spread">
        <span className="code">{subject.code}</span>
        <span className={`chip s${subject.status}`}>{SUBJECT_STATUSES[subject.status]}</span>
      </div>
      <h3>{subject.name}</h3>
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
    </div>
  );
}

function AddSubjectForm() {
  const { update, notify } = useStudy();
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
    setCode('');
    setName('');
  }

  return (
    <form className="row" onSubmit={handleSubmit}>
      <input
        type="text"
        className="code-input"
        placeholder="Optional code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <input
        type="text"
        className="grow-1"
        placeholder="Subject or topic"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit">Add subject</Button>
    </form>
  );
}
