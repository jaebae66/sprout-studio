import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/classNames';

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  /** Shown on the right of the title, e.g. a counter or a small button. */
  aside?: ReactNode;
}

/** A rounded card section with an optional heading row. */
export function Panel({ title, aside, className, children, ...props }: PanelProps) {
  const heading = title === undefined ? null : <h2>{title}</h2>;
  return (
    <section className={cx('panel', className)} {...props}>
      {aside ? (
        <div className="row spread">
          {heading}
          {aside}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}
