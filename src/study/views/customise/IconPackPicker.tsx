import { Panel } from '../../../shared/components/Panel';
import { ICON_PACKS, type IconPackName } from '../../constants';
import { useStudy } from '../../StudyContext';

const PACK_NAMES = Object.keys(ICON_PACKS) as IconPackName[];

export function IconPackPicker() {
  const { data, updateSettings } = useStudy();

  return (
    <Panel className="stack" title="Icon pack">
      <div className="packs">
        {PACK_NAMES.map((name) => {
          const pack = ICON_PACKS[name];
          return (
            <button
              key={name}
              type="button"
              className="pack"
              aria-pressed={data.settings.icons === name}
              onClick={() => updateSettings({ icons: name })}
            >
              <div className="ic">
                {pack.mascot}
                {pack.units}
                {pack.cards}
                {pack.quiz}
              </div>
              <b>{pack.name}</b>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
