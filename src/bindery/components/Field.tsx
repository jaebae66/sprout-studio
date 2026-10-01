import type { ReactNode } from 'react';

interface FieldProps {
  /** id of the control inside, so the label is linked to it. */
  id: string;
  label: string;
  children: ReactNode;
}

export function Field({ id, label, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
