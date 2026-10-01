import { createContext, useContext } from 'react';
import type { UpdateStudyData } from './hooks/useStudyData';
import type { IconKey, Settings, StudyData } from './types';

interface StudyContextValue {
  data: StudyData;
  update: UpdateStudyData;
  /** Shortcut for changing a few settings. Returns whether it saved. */
  updateSettings: (patch: Partial<Settings>) => boolean;
  notify: (message: string) => void;
  /** The emoji for a key in the chosen icon pack. */
  icon: (key: IconKey) => string;
  /** Wallpaper pattern colour for the current theme. */
  wallInk: string;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export const StudyProvider = StudyContext.Provider;

export function useStudy(): StudyContextValue {
  const value = useContext(StudyContext);
  if (!value) throw new Error('useStudy must be used inside <StudyProvider>');
  return value;
}
