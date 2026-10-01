import { TABS } from '../constants';
import { useStudy } from '../StudyContext';
import type { TabId } from '../types';

interface TabBarProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export function TabBar({ active, onSelect }: TabBarProps) {
  const { icon } = useStudy();

  return (
    <nav className="tabs" role="tablist">
      {TABS.map(({ id, label }) => (
        <button key={id} type="button" className="tab" role="tab" aria-selected={id === active} onClick={() => onSelect(id)}>
          <span aria-hidden="true">{icon(id)}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
