import type { ReactNode } from 'react';

export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span className="muted">{label}</span>
    </div>
  );
}
