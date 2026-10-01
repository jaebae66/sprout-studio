import { TABS } from '../constants';
import { useStudy } from '../StudyContext';
import type { TabId } from '../types';

interface RibbonProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

/** The slim icon bar down the left edge, like Obsidian's. Customise sits at the bottom. */
export function Ribbon({ active, onSelect }: RibbonProps) {
  const { icon } = useStudy();

  return (
    <nav className="ribbon" role="tablist" aria-orientation="vertical">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className="ribbon-tab"
          role="tab"
          aria-selected={id === active}
          aria-label={label}
          title={label}
          onClick={() => onSelect(id)}
        >
          <span aria-hidden="true">{icon(id)}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}
