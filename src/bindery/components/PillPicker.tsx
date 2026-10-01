import type { ReactNode } from 'react';

interface PillPickerProps<T extends string> {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  renderLabel?: (value: T) => ReactNode;
}

/** A row of pill buttons where exactly one is pressed. */
export function PillPicker<T extends string>({
  options,
  selected,
  onSelect,
  renderLabel = (value) => value,
}: PillPickerProps<T>) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button key={option} type="button" aria-pressed={option === selected} onClick={() => onSelect(option)}>
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}
