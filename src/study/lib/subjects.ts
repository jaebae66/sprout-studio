import { STATUS_COMPLETE } from '../constants';
import type { Subject } from '../types';

/** Completed subjects always count as 100%. */
export function subjectPercent(subject: Subject): number {
  return subject.status === STATUS_COMPLETE ? 100 : subject.pct;
}

/** Average progress across all subjects, rounded. */
export function overallProgress(subjects: Subject[]): number {
  const total = subjects.reduce((sum, subject) => sum + subjectPercent(subject), 0);
  return Math.round(total / Math.max(1, subjects.length));
}
