import { useEffect, useSyncExternalStore } from 'react';
import { isDarkHex, mixHex } from '../../shared/lib/color';
import { ACCENTS, SPROUT_COLORS, WALL_INK, type AccentName } from '../constants';
import type { ColorSet, ThemePreference } from '../types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The CSS custom properties (src/shared/styles/theme.css) that your own colours replace. */
const CUSTOM_PROPERTIES = ['--accent', '--bg', '--panel', '--panel-solid', '--fg', '--muted', '--line', '--soft', 'color-scheme'];

function subscribeToColorScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribeToColorScheme, () => window.matchMedia(DARK_QUERY).matches);
}

/** Whether the Sprout theme is showing its dark palette. */
export function useSproutIsDark(theme: ThemePreference): boolean {
  const systemDark = useSystemPrefersDark();
  return theme === 'dark' || (theme === 'system' && systemDark);
}

/** The colours on screen right now, as a full set: yours, or the Sprout theme's. */
export function currentColors(colors: ColorSet | null, accent: AccentName, dark: boolean): ColorSet {
  if (colors) return colors;
  const accents = ACCENTS[accent] ?? ACCENTS.mint;
  return { accent: dark ? accents.dark : accents.light, ...SPROUT_COLORS[dark ? 'dark' : 'light'] };
}

/**
 * Applies the light/dark choice, accent, and any colours of your own to the page,
 * and returns the wallpaper ink colour that suits them.
 */
export function useTheme(theme: ThemePreference, accent: AccentName, colors: ColorSet | null): string {
  const dark = useSproutIsDark(theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    const accents = ACCENTS[accent] ?? ACCENTS.mint;
    root.style.setProperty('--accent-l', accents.light);
    root.style.setProperty('--accent-d', accents.dark);

    // Your own colours go on the root element itself, which beats the stylesheet's light and dark palettes.
    CUSTOM_PROPERTIES.forEach((property) => root.style.removeProperty(property));
    if (!colors) return;
    const properties: Record<string, string> = {
      '--accent': colors.accent,
      '--bg': colors.background,
      '--panel-solid': colors.card,
      // Slightly see-through, so the wallpaper shows like it does in the Sprout theme.
      '--panel': `color-mix(in srgb, ${colors.card} 88%, transparent)`,
      '--fg': colors.text,
      '--muted': colors.faded,
      '--line': colors.border,
      '--soft': `color-mix(in srgb, ${colors.accent} 14%, ${colors.card})`,
      'color-scheme': isDarkHex(colors.background) ? 'dark' : 'light',
    };
    Object.entries(properties).forEach(([property, value]) => root.style.setProperty(property, value));
  }, [theme, accent, colors]);

  if (colors) return mixHex(colors.background, colors.accent, 0.22);
  return dark ? WALL_INK.dark : WALL_INK.light;
}
