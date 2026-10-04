export type Appearance = 'light' | 'dark' | 'auto';

/** The visitor's own Control Center choice wins; otherwise the owner's default; 'auto' follows the device. */
export function resolveDark(visitorChoice: 'light' | 'dark' | null, siteDefault: Appearance | undefined, systemPrefersDark: boolean): boolean {
  if (visitorChoice) return visitorChoice === 'dark';
  const d = siteDefault ?? 'light';
  return d === 'dark' || (d === 'auto' && systemPrefersDark);
}
