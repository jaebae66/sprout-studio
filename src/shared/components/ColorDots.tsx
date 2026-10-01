export interface ColorDotOption<T extends string> {
  value: T;
  fill: string;
  /** Optional coloured ring drawn around the dot. */
  ring?: string;
}

interface ColorDotsProps<T extends string> {
  options: readonly ColorDotOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

/** A row of round colour buttons where one is selected. */
export function ColorDots<T extends string>({ options, selected, onSelect }: ColorDotsProps<T>) {
  return (
    <div className="dots">
      {options.map(({ value, fill, ring }) => (
        <button
          key={value}
          type="button"
          className="dot"
          title={value}
          aria-label={value}
          aria-pressed={value === selected}
          style={{ background: fill, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
          onClick={() => onSelect(value)}
        />
      ))}
    </div>
  );
}
