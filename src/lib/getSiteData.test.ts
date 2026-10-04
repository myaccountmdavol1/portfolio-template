import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStore } from './store';
import type { ServerStore } from './store/types';

vi.mock('./store', () => ({ getStore: vi.fn(() => null) }));
// Outside Next there's no cross-request cache; run the function directly.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.mocked(getStore).mockReset(); // undefined (falsy) means no store, so cases don't depend on order
});

describe('getPublishedSite', () => {
  it('returns seed data when there is no store', async () => {
    const { getPublishedSite } = await import('./getSiteData');
    const { seedSiteData } = await import('./seed');
    await expect(getPublishedSite()).resolves.toEqual(seedSiteData);
  });

  it('falls back to seed data when the store read fails', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('boom'));
    vi.mocked(getStore).mockReturnValue({ site: { read } } as unknown as ServerStore);

    const { getPublishedSite } = await import('./getSiteData');
    const { seedSiteData } = await import('./seed');
    await expect(getPublishedSite()).resolves.toEqual(seedSiteData);
    expect(read).toHaveBeenCalled();
  });

  it('falls back to seed data when getStore itself throws', async () => {
    vi.mocked(getStore).mockImplementation(() => {
      throw new Error('Failed to parse private key.');
    });

    const { getPublishedSite } = await import('./getSiteData');
    const { seedSiteData } = await import('./seed');
    await expect(getPublishedSite()).resolves.toEqual(seedSiteData);
  });

  it('returns the store result when the read succeeds', async () => {
    const { seedSiteData } = await import('./seed');
    const read = vi.fn().mockResolvedValueOnce(seedSiteData);
    vi.mocked(getStore).mockReturnValue({ site: { read } } as unknown as ServerStore);

    const { getPublishedSite } = await import('./getSiteData');
    await expect(getPublishedSite()).resolves.toEqual(seedSiteData);
    expect(read).toHaveBeenCalledWith('published');
  });
});
