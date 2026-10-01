import { useCallback, useEffect, useRef, useState } from 'react';

/** A short message that hides itself after `durationMs`. */
export function useToast(durationMs: number) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback(
    (text: string) => {
      setMessage(text);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(''), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, notify };
}
