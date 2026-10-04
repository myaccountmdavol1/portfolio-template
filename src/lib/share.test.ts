import { describe, expect, it, vi } from 'vitest';
import { shareLink } from './share';

const clipboard = (ok = true) => ({ writeText: vi.fn(() => (ok ? Promise.resolve() : Promise.reject(new Error('blocked')))) });

describe('shareLink', () => {
  it('uses the share sheet when preferred and available', async () => {
    const nav = { share: vi.fn(() => Promise.resolve()), clipboard: clipboard() };
    expect(await shareLink('https://x.test/?open=a', 'A', { preferSheet: true, nav })).toBe('shared');
    expect(nav.share).toHaveBeenCalledWith({ url: 'https://x.test/?open=a', title: 'A' });
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('treats a cancelled share sheet as done', async () => {
    const nav = { share: vi.fn(() => Promise.reject(new DOMException('cancel', 'AbortError'))), clipboard: clipboard() };
    expect(await shareLink('u', 't', { preferSheet: true, nav })).toBe('shared');
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies when the sheet fails, is missing, or not preferred', async () => {
    const failing = { share: vi.fn(() => Promise.reject(new Error('nope'))), clipboard: clipboard() };
    expect(await shareLink('u', 't', { preferSheet: true, nav: failing })).toBe('copied');
    expect(await shareLink('u', 't', { preferSheet: true, nav: { clipboard: clipboard() } })).toBe('copied');
    const desktop = { share: vi.fn(), clipboard: clipboard() };
    expect(await shareLink('u', 't', { preferSheet: false, nav: desktop })).toBe('copied');
    expect(desktop.share).not.toHaveBeenCalled();
    expect(desktop.clipboard.writeText).toHaveBeenCalledWith('u');
  });

  it('reports failure when copying is blocked', async () => {
    expect(await shareLink('u', 't', { preferSheet: false, nav: { clipboard: clipboard(false) } })).toBe('failed');
    expect(await shareLink('u', 't', { preferSheet: false, nav: {} })).toBe('failed');
  });
});
