import { describe, expect, it } from 'vitest';
import { resolveDark } from './appearance';

describe('resolveDark', () => {
  it('lets the visitor’s choice win', () => {
    expect(resolveDark('dark', 'light', false)).toBe(true);
    expect(resolveDark('light', 'dark', true)).toBe(false);
  });
  it('falls back to the site default, where auto follows the device', () => {
    expect(resolveDark(null, undefined, true)).toBe(false);
    expect(resolveDark(null, 'dark', false)).toBe(true);
    expect(resolveDark(null, 'auto', true)).toBe(true);
    expect(resolveDark(null, 'auto', false)).toBe(false);
  });
});
