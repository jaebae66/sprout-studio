import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import { Header } from '../components/Header';
import { ProgressBar } from '../components/ProgressBar';
import { StatTile } from '../components/StatTile';
import { TaskItem } from '../components/TaskItem';
import { TimerPanel } from '../components/TimerPanel';
import type { PomodoroTimer } from '../hooks/usePomodoro';
import { compareByDue } from '../lib/dates';
import { overallProgress } from '../lib/subjects';
import { useStudy } from '../StudyContext';

const UPCOMING_LIMIT = 4;

interface HomeViewProps {
  timer: PomodoroTimer;
  onOpenPlanner: () => void;
}

export function HomeView({ timer, onOpenPlanner }: HomeViewProps) {
  const { data, icon } = useStudy();
  const upcoming = data.tasks
    .filter((task) => !task.done)
    .sort(compareByDue)
    .slice(0, UPCOMING_LIMIT);
  const progress = overallProgress(data.units);
  const knownCards = data.cards.filter((card) => card.known).length;

  return (
    <>
      <Header />
      <div className="grid">
        <TimerPanel timer={timer} />
        <Panel className="stack" title={`${icon('home')} Your garden today`}>
          <div className="stats">
            <StatTile value={data.stats.mins} label="minutes today" />
            <StatTile value={data.stats.sessions} label="sessions today" />
            <StatTile value={`${knownCards}/${data.cards.length}`} label="cards known" />
            <StatTile value={data.units.length} label="subjects added" />
          </div>
          <div>
            <div className="row spread">
              <b>Study progress</b>
              <span className="code">{progress}%</span>
            </div>
            <ProgressBar percent={progress} />
          </div>
        </Panel>
      </div>

      <Panel
        className="stack"
        title={`${icon('planner')} Coming up`}
        aside={
          <Button ghost size="small" onClick={onOpenPlanner}>
            Open planner
          </Button>
        }
      >
        {upcoming.length ? (
          <ul className="list">
            {upcoming.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <div className="empty">Nothing due. Add tasks in the planner {icon('done')}</div>
        )}
      </Panel>
    </>
  );
}
