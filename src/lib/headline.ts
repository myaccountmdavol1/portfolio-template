import type { CSSProperties } from 'react';
import type { HeadlineStyle } from './types';

const FONTS = { serif: 'var(--font-serif)', sans: 'var(--font-sans)', mono: 'var(--font-mono)' } as const;

export interface ResolvedHeadline {
  text: CSSProperties; // colour, font, shadow for all three lines
  scale: number; // multiply font sizes by this
  justify: 'flex-start' | 'center' | 'flex-end';
  italicSmallLine: boolean;
  showName: boolean;
}

/** Turns the owner's headline options into concrete styles, with the original look as the default. */
export function resolveHeadline(style: HeadlineStyle | undefined, ink: string, wallpaperShadow?: string): ResolvedHeadline {
  const s = style ?? {};
  const size = Math.min(150, Math.max(50, s.size ?? 100));
  return {
    text: {
      color: s.color?.trim() || ink,
      fontFamily: FONTS[s.font ?? 'serif'] ?? FONTS.serif,
      // A custom colour opts out of the wallpaper's automatic shadow (the owner chose it deliberately).
      textShadow: s.shadow ? '0 2px 18px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.25)' : s.color?.trim() ? undefined : wallpaperShadow,
    },
    scale: size / 100,
    justify: s.position === 'top' ? 'flex-start' : s.position === 'bottom' ? 'flex-end' : 'center',
    italicSmallLine: s.italicSmallLine !== false,
    showName: s.showName !== false,
  };
}
