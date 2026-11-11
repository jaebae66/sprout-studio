import type { CSSProperties } from 'react';
import { Button } from '../../shared/components/Button';
import { Panel } from '../../shared/components/Panel';
import type { PomodoroTimer } from '../hooks/usePomodoro';
import { formatClock } from '../lib/dates';
import { useStudy } from '../StudyContext';

/** Longest timer title, so it fits above the ring. */
const MAX_TITLE_LENGTH = 60;

export function TimerPanel({ timer }: { timer: PomodoroTimer }) {
  const { data, update, icon } = useStudy();

  function setTitle(title: string) {
    update((current) => ({ ...current, settings: { ...current.settings, timerTitle: title } }));
  }

  return (
    <Panel className="timer" title={`${icon('timer')} Study timer`}>
      <input
        type="text"
        className="timer-title"
        aria-label="Timer title"
        placeholder="What are you studying?"
        maxLength={MAX_TITLE_LENGTH}
        value={data.settings.timerTitle}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={(event) => setTitle(event.target.value.trim())}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
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
