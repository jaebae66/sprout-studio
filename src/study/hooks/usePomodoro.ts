import { useCallback, useEffect, useRef, useState } from 'react';
import { playChime } from '../lib/chime';

export type TimerMode = 'focus' | 'break';

interface TimerState {
  mode: TimerMode;
  secondsLeft: number;
  running: boolean;
}

interface PomodoroOptions {
  focusMinutes: number;
  breakMinutes: number;
  /** Called after every full minute of focus. */
  onFocusMinute: () => void;
  onFocusComplete: () => void;
  onBreakComplete: () => void;
}

const idleTimer = (focusMinutes: number): TimerState => ({
  mode: 'focus',
  secondsLeft: focusMinutes * 60,
  running: false,
});

/** A focus/break timer that switches phases by itself and chimes at each switch. */
export function usePomodoro(options: PomodoroOptions) {
  const { focusMinutes, breakMinutes } = options;
  const [timer, setTimer] = useState(() => idleTimer(focusMinutes));

  // Refs let the interval read the newest timer and callbacks without restarting.
  const timerRef = useRef(timer);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const commit = useCallback((next: TimerState) => {
    timerRef.current = next;
    setTimer(next);
  }, []);

  useEffect(() => {
    if (!timer.running) return;

    const interval = window.setInterval(() => {
      const current = timerRef.current;
      const callbacks = optionsRef.current;
      let mode = current.mode;
      let secondsLeft = current.secondsLeft - 1;

      if (mode === 'focus' && secondsLeft % 60 === 0) callbacks.onFocusMinute();

      if (secondsLeft <= 0) {
        playChime();
        if (mode === 'focus') {
          callbacks.onFocusComplete();
          mode = 'break';
          secondsLeft = callbacks.breakMinutes * 60;
        } else {
          callbacks.onBreakComplete();
          mode = 'focus';
          secondsLeft = callbacks.focusMinutes * 60;
        }
      }

      commit({ ...current, mode, secondsLeft });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer.running, commit]);

  // When the lengths change, a stopped timer resets so it shows the new focus length.
  useEffect(() => {
    if (!timerRef.current.running) commit(idleTimer(focusMinutes));
  }, [focusMinutes, breakMinutes, commit]);

  const totalSeconds = (timer.mode === 'focus' ? focusMinutes : breakMinutes) * 60;

  return {
    ...timer,
    /** How far through the current phase, 0–1. */
    progress: (totalSeconds - timer.secondsLeft) / totalSeconds,
    toggle: () => commit({ ...timerRef.current, running: !timerRef.current.running }),
    reset: () => commit(idleTimer(focusMinutes)),
  };
}

export type PomodoroTimer = ReturnType<typeof usePomodoro>;
