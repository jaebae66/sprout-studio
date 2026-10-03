import { Button } from '../../../shared/components/Button';
import { ColorDots, type ColorDotOption } from '../../../shared/components/ColorDots';
import { Panel } from '../../../shared/components/Panel';
import { PAPER_STYLES } from '../../../shared/lib/paper';
import { ACCENTS, COLOR_FIELDS, COLOR_THEMES, type AccentName } from '../../constants';
import { currentColors, useSproutIsDark } from '../../hooks/useTheme';
import { useStudy } from '../../StudyContext';
import type { ColorSet, ThemePreference } from '../../types';

const ACCENT_OPTIONS: ColorDotOption<AccentName>[] = (Object.keys(ACCENTS) as AccentName[]).map((name) => ({
  value: name,
  fill: ACCENTS[name].light,
}));

function sameColors(first: ColorSet, second: ColorSet): boolean {
  return COLOR_FIELDS.every(({ key }) => first[key].toLowerCase() === second[key].toLowerCase());
}

/** A little stripe of a theme's colours, for its button. */
function Swatch({ colors }: { colors: ColorSet }) {
  return (
    <span className="theme-swatch" aria-hidden="true" style={{ background: colors.background, borderColor: colors.border }}>
      <i style={{ background: colors.card }} />
      <i style={{ background: colors.accent }} />
      <i style={{ background: colors.text }} />
    </span>
  );
}

export function ColoursPanel() {
  const { data, updateSettings, icon } = useStudy();
  const { settings } = data;
  const dark = useSproutIsDark(settings.theme);
  const shown = currentColors(settings.colors, settings.accent, dark);
  const sprout = currentColors(null, settings.accent, dark);
  const matchingTheme = settings.colors && COLOR_THEMES.find((theme) => sameColors(theme.colors, settings.colors!));

  /** Changing one colour starts your own set from whatever is showing now. */
  function setColor(key: keyof ColorSet, value: string) {
    updateSettings({ colors: { ...shown, [key]: value } });
  }

  return (
    <Panel className="stack" title={`${icon('custom')} Colours`}>
      <div>
        <span className="lbl">Theme</span>
        <div className="themes">
          <button
            type="button"
            className="theme-option"
            aria-pressed={!settings.colors}
            onClick={() => updateSettings({ colors: null })}
          >
            <Swatch colors={sprout} />
            Sprout
          </button>
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="theme-option"
              aria-pressed={matchingTheme === theme}
              onClick={() => updateSettings({ colors: { ...theme.colors } })}
            >
              <Swatch colors={theme.colors} />
              {theme.label}
            </button>
          ))}
          {settings.colors && !matchingTheme && (
            <span className="theme-option" aria-pressed="true">
              <Swatch colors={settings.colors} />
              Your own
            </span>
          )}
        </div>
      </div>

      {!settings.colors && (
        <div className="row">
          <div>
            <span className="lbl">Sprout colour</span>
            <ColorDots options={ACCENT_OPTIONS} selected={settings.accent} onSelect={(accent) => updateSettings({ accent })} />
          </div>
          <div>
            <label className="lbl" htmlFor="c-theme">
              Light or dark
            </label>
            <select
              id="c-theme"
              value={settings.theme}
              onChange={(event) => updateSettings({ theme: event.target.value as ThemePreference })}
            >
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <span className="lbl">Pick your own</span>
        <div className="color-fields">
          {COLOR_FIELDS.map(({ key, label }) => (
            <label key={key} className="color-field">
              <input type="color" value={shown[key]} onChange={(event) => setColor(key, event.target.value)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="lbl">Note paper</span>
        <div className="segmented" role="group" aria-label="Note paper">
          {PAPER_STYLES.map((paper) => (
            <button
              key={paper.id}
              type="button"
              aria-pressed={settings.notePaper === paper.id}
              onClick={() => updateSettings({ notePaper: paper.id })}
            >
              {paper.label}
            </button>
          ))}
        </div>
      </div>

      {settings.colors && (
        <Button ghost size="small" onClick={() => updateSettings({ colors: null })}>
          Back to the Sprout colours
        </Button>
      )}
    </Panel>
  );
}
