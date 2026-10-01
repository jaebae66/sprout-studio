import { useEffect, useSyncExternalStore } from 'react';
import { ACCENTS, WALL_INK, type AccentName } from '../constants';
import type { ThemePreference } from '../types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribeToColorScheme, () => window.matchMedia(DARK_QUERY).matches);
}

/**
 * Applies the light/dark choice and accent colour to the page,
 * and returns the wallpaper ink colour that suits the active theme.
 */
export function useTheme(theme: ThemePreference, accent: AccentName): string {
  const systemDark = useSystemPrefersDark();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    const colors = ACCENTS[accent] ?? ACCENTS.mint;
    root.style.setProperty('--accent-l', colors.light);
    root.style.setProperty('--accent-d', colors.dark);
  }, [theme, accent]);

  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
  return isDark ? WALL_INK.dark : WALL_INK.light;
}
