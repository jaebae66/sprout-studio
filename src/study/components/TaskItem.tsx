import { Button } from '../../shared/components/Button';
import { cx } from '../../shared/lib/classNames';
import { dueLabel } from '../lib/dates';
import { patchById, removeById } from '../lib/list';
import { useStudy } from '../StudyContext';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  /** Show a Remove button (only in the planner). */
  removable?: boolean;
}

export function TaskItem({ task, removable = false }: TaskItemProps) {
  const { update, notify, icon } = useStudy();
  const checkboxId = `tk-${task.id}`;

  function setDone(done: boolean) {
    update((data) => ({ ...data, tasks: patchById(data.tasks, task.id, { done }) }));
    if (done) notify(`Nice work ${icon('done')}`);
  }

  function remove() {
    update((data) => ({ ...data, tasks: removeById(data.tasks, task.id) }));
  }

  return (
    <li className={cx('item', task.done && 'done')}>
      <input
        type="checkbox"
        id={checkboxId}
        className="task-check"
        checked={task.done}
        onChange={(event) => setDone(event.target.checked)}
      />
      <label className="grow" htmlFor={checkboxId}>
        <b>{task.title}</b>
        <br />
        <span className="muted small-text">
          {task.unit && (
            <>
              <span className="code">{task.unit}</span> ·{' '}
            </>
          )}
          {task.due ? `due ${task.due} (${dueLabel(task.due)})` : 'no date'}
        </span>
      </label>
      {removable && (
        <Button ghost size="small" aria-label="Delete" onClick={remove}>
          Remove
        </Button>
      )}
    </li>
  );
}
