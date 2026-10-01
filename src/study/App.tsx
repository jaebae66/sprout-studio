import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Toast } from '../shared/components/Toast';
import { useToast } from '../shared/hooks/useToast';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { ICON_PACKS, TABS } from './constants';
import { useFlashcardSession } from './hooks/useFlashcardSession';
import { usePomodoro } from './hooks/usePomodoro';
import { useQuiz } from './hooks/useQuiz';
import { useStudyData } from './hooks/useStudyData';
import { useTheme } from './hooks/useTheme';
import { wallpaperBackground } from './lib/wallpaper';
import { StudyProvider } from './StudyContext';
import type { IconKey, Settings, TabId } from './types';
import { CustomiseView } from './views/customise/CustomiseView';
import { FlashcardsView } from './views/FlashcardsView';
import { HomeView } from './views/HomeView';
import { NotesView } from './views/NotesView';
import { PlannerView } from './views/PlannerView';
import { QuizView } from './views/QuizView';
import { SubjectsView } from './views/SubjectsView';

/** The tab named in the URL (#planner etc.), or Home. */
function tabFromHash(): TabId {
  const hash = window.location.hash.slice(1);
  return TABS.find((tab) => tab.id === hash)?.id ?? 'home';
}

export function App() {
  const { data, update } = useStudyData();
  const { message, notify } = useToast(2200);
  const [view, setView] = useState<TabId>(tabFromHash);
  const { settings } = data;
  const wallInk = useTheme(settings.theme, settings.accent);

  useEffect(() => {
    try {
      history.replaceState(null, '', `#${view}`);
    } catch {
      // Some sandboxed frames don't allow changing the URL.
    }
  }, [view]);

  const icons = ICON_PACKS[settings.icons] ?? ICON_PACKS.sprout;
  const icon = useCallback((key: IconKey) => icons[key], [icons]);
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => update((current) => ({ ...current, settings: { ...current.settings, ...patch } })),
    [update],
  );

  // These live here, not in their views, so they keep going when you switch tabs.
  const timer = usePomodoro({
    focusMinutes: settings.focus,
    breakMinutes: settings.brk,
    onFocusMinute: () =>
      update((current) => ({
        ...current,
        stats: { ...current.stats, mins: current.stats.mins + 1, total: current.stats.total + 1 },
      })),
    onFocusComplete: () => {
      update((current) => ({ ...current, stats: { ...current.stats, sessions: current.stats.sessions + 1 } }));
      notify(`Session done ${icon('done')} Take a little break`);
    },
    onBreakComplete: () => notify('Break over. Back to growing!'),
  });
  const flashcards = useFlashcardSession(data.cards);
  const quiz = useQuiz();

  const context = useMemo(
    () => ({ data, update, updateSettings, notify, icon, wallInk }),
    [data, update, updateSettings, notify, icon, wallInk],
  );

  const views: Record<TabId, ReactNode> = {
    home: <HomeView timer={timer} onOpenPlanner={() => setView('planner')} />,
    units: <SubjectsView />,
    cards: <FlashcardsView session={flashcards} />,
    quiz: <QuizView quiz={quiz} />,
    planner: <PlannerView />,
    notes: <NotesView />,
    custom: <CustomiseView />,
  };

  return (
    <StudyProvider value={context}>
      <div className="wallpaper" style={{ background: wallpaperBackground(settings.wall, wallInk, settings.photo) }} />
      <div className="wrap">
        <Header />
        <TabBar active={view} onSelect={setView} />
        <main className="view">{views[view]}</main>
      </div>
      <Toast message={message} />
    </StudyProvider>
  );
}
