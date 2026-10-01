import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { TaskItem } from '../components/TaskItem';
import { compareByDue } from '../lib/dates';
import { newId } from '../lib/list';
import { useStudy } from '../StudyContext';

export function PlannerView() {
  const { data, icon } = useStudy();
  // Open tasks first, then by due date.
  const tasks = [...data.tasks].sort(
    (first, second) => Number(first.done) - Number(second.done) || compareByDue(first, second),
  );

  return (
    <Panel className="stack" title={`${icon('planner')} Planner`}>
      <AddTaskForm />
      {tasks.length ? (
        <ul className="list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} removable />
          ))}
        </ul>
      ) : (
        <div className="empty">No tasks yet. Add your first one above.</div>
      )}
    </Panel>
  );
}

function AddTaskForm() {
  const { data, update, notify } = useStudy();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [due, setDue] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      notify('Give the task a name first');
      return;
    }
    const task = { id: newId('t'), title: trimmedTitle, unit: subject, due, done: false };
    update((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setTitle('');
    setSubject('');
    setDue('');
  }

  return (
    <form className="row" onSubmit={handleSubmit}>
      <input
        type="text"
        className="task-title"
        placeholder="e.g. Review a chapter or finish a project"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <select aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
        <option value="">No subject</option>
        {data.units.map((unit) => {
          const label = unit.code || unit.name;
          return (
            <option key={unit.id} value={label}>
              {label}
            </option>
          );
        })}
      </select>
      <input type="date" aria-label="Due date" value={due} onChange={(event) => setDue(event.target.value)} />
      <Button type="submit">Add</Button>
    </form>
  );
}
