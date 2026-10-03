import { useCallback, useEffect, useRef, useState } from 'react';
import { loadData, onOutsideChange, saveData } from '../lib/storage';
import type { StudyData } from '../types';

export type UpdateStudyData = (change: (data: StudyData) => StudyData) => boolean;

/**
 * All saved study data. `update` applies a change, saves it straight away,
 * and returns whether the browser accepted the save.
 */
export function useStudyData() {
  const [data, setData] = useState(loadData);
  // Mirrors the latest data so timer callbacks never work from a stale copy.
  const latest = useRef(data);

  // Something else (like the MCP server) changed the saved data: show the new version.
  useEffect(
    () =>
      onOutsideChange(() => {
        const next = loadData();
        latest.current = next;
        setData(next);
      }),
    [],
  );

  const update = useCallback<UpdateStudyData>((change) => {
    const next = change(latest.current);
    latest.current = next;
    setData(next);
    return saveData(next);
  }, []);

  return { data, update };
}
