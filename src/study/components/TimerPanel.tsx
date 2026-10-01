import type { CSSProperties } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import type { PomodoroTimer } from '../hooks/usePomodoro';
import { formatClock } from '../lib/dates';
import { useStudy } from '../StudyContext';

export function TimerPanel({ timer }: { timer: PomodoroTimer }) {
  const { data, icon } = useStudy();

  return (
    <Panel className="timer" title={`${icon('timer')} Study timer`}>
      <TimerRing
        progress={timer.progress}
        time={formatClock(timer.secondsLeft)}
        caption={timer.mode === 'focus' ? 'Focus time' : 'Break time'}
      />
      <div className="row center">
        <Button onClick={timer.toggle}>{timer.running ? 'Pause' : 'Start'}</Button>
        <Button ghost onClick={timer.reset}>
          Reset
        </Button>
      </div>
      <p className="muted small-text">
        {data.settings.focus} min focus · {data.settings.brk} min break
      </p>
    </Panel>
  );
}

interface TimerRingProps {
  /** 0–1 */
  progress: number;
  time: string;
  caption: string;
}

function TimerRing({ progress, time, caption }: TimerRingProps) {
  const style = { '--p': (progress * 100).toFixed(1) } as CSSProperties;
  return (
    <div className="ring" style={style}>
      <div>
        <b>{time}</b>
        <span className="muted">{caption}</span>
      </div>
    </div>
  );
}
