import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BinderyView } from '../bindery/BinderyView';
import { Toast } from '../shared/components/Toast';
import { useToast } from '../shared/hooks/useToast';
import { Ribbon } from './components/Ribbon';
import { DEFAULT_TAB, ICON_PACKS, TABS } from './constants';
import { useFlashcardSession } from './hooks/useFlashcardSession';
import { usePomodoro } from './hooks/usePomodoro';
import { useQuiz } from './hooks/useQuiz';
import { useStudyData } from './hooks/useStudyData';
import { useTheme } from './hooks/useTheme';
import { loadOpenTab, saveOpenTab } from './lib/storage';
import { wallpaperBackground } from './lib/wallpaper';
import { StudyProvider } from './StudyContext';
import type { IconKey, Settings, TabId } from './types';
import { CustomiseView } from './views/customise/CustomiseView';
import { FlashcardsView } from './views/FlashcardsView';
import { GraphView } from './views/GraphView';
import { HomeView } from './views/HomeView';
import { NotesView } from './views/NotesView';
import { PlannerView } from './views/PlannerView';
import { QuizView } from './views/QuizView';
import { StickiesView } from './views/StickiesView';
import { SubjectsView } from './views/SubjectsView';

/** The tab named in the URL (#planner etc.), else the one open last time, else Notes. */
function startingTab(): TabId {
  const wanted = window.location.hash.slice(1) || loadOpenTab();
  return TABS.find((tab) => tab.id === wanted)?.id ?? DEFAULT_TAB;
}

export function App() {
  const { data, update } = useStudyData();
  const { message, notify } = useToast(2200);
  const [view, setView] = useState<TabId>(startingTab);
  const { settings } = data;
  const wallInk = useTheme(settings.theme, settings.accent, settings.colors);

  useEffect(() => {
    saveOpenTab(view);
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

  // The book maker is kept open in the background (below) so a half-made book survives switching tabs.
  const views: Record<Exclude<TabId, 'bindery'>, ReactNode> = {
    home: <HomeView timer={timer} onOpenPlanner={() => setView('planner')} />,
    units: <SubjectsView />,
    cards: <FlashcardsView session={flashcards} />,
    quiz: <QuizView quiz={quiz} />,
    planner: <PlannerView />,
    notes: <NotesView />,
    graph: <GraphView onOpenNote={() => setView('notes')} />,
    stickies: <StickiesView />,
    custom: <CustomiseView />,
  };

  return (
    <StudyProvider value={context}>
      <div className="wallpaper" style={{ background: wallpaperBackground(settings.wall, wallInk, settings.photo) }} />
      <div className="shell">
        <Ribbon active={view} onSelect={setView} />
        <main className={`pane pane-${view}`}>
          {view !== 'bindery' && views[view]}
          <div hidden={view !== 'bindery'}>
            <BinderyView notify={notify} />
          </div>
        </main>
      </div>
      <Toast message={message} />
    </StudyProvider>
  );
}
