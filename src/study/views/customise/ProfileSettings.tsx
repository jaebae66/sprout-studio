import { useEffect, useState } from 'react';
import { ColorDots, type ColorDotOption } from '../../../shared/components/ColorDots';
import { Panel } from '../../../shared/components/Panel';
import { ACCENTS, MAX_TIMER_MINUTES, type AccentName } from '../../constants';
import { useStudy } from '../../StudyContext';
import type { ThemePreference } from '../../types';

const ACCENT_OPTIONS: ColorDotOption<AccentName>[] = (Object.keys(ACCENTS) as AccentName[]).map((name) => ({
  value: name,
  fill: ACCENTS[name].light,
}));

export function ProfileSettings() {
  const { data, update, updateSettings, icon } = useStudy();
  const { settings } = data;

  // Typed text is saved as-is, then tidied up when you leave the box.
  const setName = (name: string) => update((current) => ({ ...current, name }));
  const setCourse = (course: string) => update((current) => ({ ...current, course }));

  return (
    <Panel className="stack" title={`${icon('custom')} Make it yours`}>
      <div>
        <label className="lbl" htmlFor="c-name">
          Your name
        </label>
        <input
          type="text"
          id="c-name"
          className="full-width"
          placeholder="What should I call you?"
          value={data.name}
          onChange={(event) => setName(event.target.value)}
          onBlur={(event) => setName(event.target.value.trim())}
        />
      </div>
      <div>
        <label className="lbl" htmlFor="c-course">
          Course or study goal
        </label>
        <input
          type="text"
          id="c-course"
          className="full-width"
          placeholder="e.g. Biology, a certification, or a personal goal"
          value={data.course}
          onChange={(event) => setCourse(event.target.value)}
          onBlur={(event) => setCourse(event.target.value.trim())}
        />
      </div>
      <div>
        <span className="lbl">Colour</span>
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
      <div className="row">
        <MinutesSetting
          id="c-focus"
          label="Focus minutes"
          value={settings.focus}
          onCommit={(focus) => updateSettings({ focus })}
        />
        <MinutesSetting
          id="c-brk"
          label="Break minutes"
          value={settings.brk}
          onCommit={(brk) => updateSettings({ brk })}
        />
      </div>
    </Panel>
  );
}

interface MinutesSettingProps {
  id: string;
  label: string;
  value: number;
  onCommit: (minutes: number) => void;
}

/** A number box that saves (clamped to 1–120) when you leave it or press Enter. */
function MinutesSetting({ id, label, value, onCommit }: MinutesSettingProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const minutes = Math.min(MAX_TIMER_MINUTES, Math.max(1, parseInt(draft, 10) || 0));
    setDraft(String(minutes));
    onCommit(minutes);
  }

  return (
    <div>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        id={id}
        className="minutes-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
      />
    </div>
  );
}
