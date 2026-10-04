import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import type { ScreensaverSettings } from '../types';
import { clampIdleMinutes, idleDelayMs, isModuleId, MODULE_IDS, readIdleSeconds, readSaverLink, screensaverSettings, withoutSaverParams } from './settings';

const withSaver = (screensaver: ScreensaverSettings) => ({ ...seedSiteData.site, screensaver });

describe('screensaverSettings', () => {
  it('is on with a 2-minute idle, no hot corner and shuffle when the owner set nothing', () => {
    expect(screensaverSettings(seedSiteData.site)).toEqual({ enabled: true, idleMinutes: 2, hotCorner: 'none', pinned: null });
  });

  it('reads the owner’s choices', () => {
    expect(screensaverSettings(withSaver({ enabled: false, idleMinutes: 10, hotCorner: 'bottom-right', pinned: 'facts' }))).toEqual({
      enabled: false,
      idleMinutes: 10,
      hotCorner: 'bottom-right',
      pinned: 'facts',
    });
  });

  it('ignores hand-edited nonsense', () => {
    const odd = { idleMinutes: '5', hotCorner: 'middle', pinned: 'aquarium' } as unknown as ScreensaverSettings;
    expect(screensaverSettings(withSaver(odd))).toEqual({ enabled: true, idleMinutes: 2, hotCorner: 'none', pinned: null });
  });
});

describe('clampIdleMinutes', () => {
  it('keeps whole minutes between 1 and 30, defaulting to 2', () => {
    expect([clampIdleMinutes(undefined), clampIdleMinutes(0), clampIdleMinutes(7.4), clampIdleMinutes(45), clampIdleMinutes(Number.NaN)]).toEqual([2, 1, 7, 30, 2]);
  });
});

describe('module ids', () => {
  it('lists the six modules in editor order', () => {
    expect(MODULE_IDS).toEqual(['hello', 'drift', 'memories', 'facts', 'flurry', 'bounce']);
    expect(isModuleId('flurry')).toBe(true);
    expect(isModuleId('toString')).toBe(false);
    expect(isModuleId(3)).toBe(false);
  });
});

describe('links and the test speed-up', () => {
  it('reads /?lock=1 and /?screensaver=<id>, and removes only those', () => {
    expect(readSaverLink('?lock=1')).toEqual({ lock: true, screensaver: null });
    expect(readSaverLink('?screensaver=hello')).toEqual({ lock: false, screensaver: 'hello' });
    expect(readSaverLink('?lock=0&screensaver=')).toEqual({ lock: false, screensaver: null });
    expect(withoutSaverParams('?lock=1&screensaver=hello&open=about-me&idleSeconds=2')).toBe('?open=about-me&idleSeconds=2');
    expect(withoutSaverParams('?lock=1')).toBe('');
  });

  it('honours idleSeconds only outside production', () => {
    expect(readIdleSeconds('?idleSeconds=2', false)).toBe(2);
    expect(readIdleSeconds('?idleSeconds=2', true)).toBeNull();
    expect(readIdleSeconds('?idleSeconds=abc', false)).toBeNull();
    expect(readIdleSeconds('?idleSeconds=0', false)).toBeNull();
    expect(readIdleSeconds('?idleSeconds=99999', false)).toBe(3600);
    expect(readIdleSeconds('', false)).toBeNull();
  });

  it('turns minutes (or test seconds) into a delay', () => {
    expect(idleDelayMs(2, null)).toBe(120_000);
    expect(idleDelayMs(2, 1.5)).toBe(1500);
  });
});
