import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/classNames';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Outlined instead of filled. */
  ghost?: boolean;
  size?: 'small' | 'big';
}

export function Button({ ghost = false, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cx('btn', ghost && 'ghost', size, className)} {...props} />;
}
