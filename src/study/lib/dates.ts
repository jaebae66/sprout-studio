import type { Task } from '../types';

const DAY_MS = 86_400_000;

/** Today as YYYY-MM-DD (UTC, the same format saved data already uses). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "today", "tomorrow", "in 3 days" or "2d overdue". */
export function dueLabel(due: string): string {
  const days = Math.round((new Date(due).getTime() - new Date(today()).getTime()) / DAY_MS);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Sorts by due date, with undated tasks last. */
export function compareByDue(first: Task, second: Task): number {
  return (first.due || '9').localeCompare(second.due || '9');
}

/** 90 → "01:30" */
export function formatClock(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
