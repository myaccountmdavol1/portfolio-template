import { describe, expect, it, vi } from 'vitest';
import { SignedOutError } from '../editor/httpBackend';
import { seedSiteData } from '../seed';
import { finishSetup, publishWizard } from './publish';

describe('publishWizard', () => {
  it('saves the whole site as the draft, publishes it, then records that setup is finished', async () => {
    const steps: string[] = [];
    const backend = {
      saveDraft: vi.fn(async () => void steps.push('save')),
      publish: vi.fn(async () => void steps.push('publish')),
    };
    await publishWizard(backend, seedSiteData, async () => void steps.push('finish'));
    expect(steps).toEqual(['save', 'publish', 'finish']);
    expect(backend.saveDraft).toHaveBeenCalledWith(seedSiteData, null);
    expect(backend.publish).toHaveBeenCalledWith(seedSiteData);
  });

  it('does not record setup as finished when publishing fails', async () => {
    const finish = vi.fn(async () => {});
    const backend = {
      saveDraft: vi.fn(async () => {}),
      publish: vi.fn(async () => {
        throw new Error('POST /api/owner/publish failed with 500');
      }),
    };
    await expect(publishWizard(backend, seedSiteData, finish)).rejects.toThrow(/500/);
    expect(finish).not.toHaveBeenCalled();
  });
});

describe('publishWizard afterSave', () => {
  it('runs once the draft is saved, even when publishing then fails', async () => {
    const steps: string[] = [];
    const backend = {
      saveDraft: vi.fn(async () => void steps.push('save')),
      publish: vi.fn(async () => {
        steps.push('publish');
        throw new Error('500');
      }),
    };
    await expect(publishWizard(backend, seedSiteData, async () => {}, () => void steps.push('after'))).rejects.toThrow();
    expect(steps).toEqual(['save', 'after', 'publish']);
  });

  it('does not run when saving the draft fails', async () => {
    const afterSave = vi.fn();
    const backend = { saveDraft: vi.fn(async () => { throw new Error('x'); }), publish: vi.fn(async () => {}) };
    await expect(publishWizard(backend, seedSiteData, async () => {}, afterSave)).rejects.toThrow();
    expect(afterSave).not.toHaveBeenCalled();
  });
});

describe('publishWizard when saving the draft fails', () => {
  it('stops before publishing and before recording setup', async () => {
    const finish = vi.fn(async () => {});
    const backend = {
      saveDraft: vi.fn(async () => {
        throw new Error('save failed');
      }),
      publish: vi.fn(async () => {}),
    };
    await expect(publishWizard(backend, seedSiteData, finish)).rejects.toThrow(/save failed/);
    expect(backend.publish).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});

describe('finishSetup', () => {
  const answering = (status: number) => vi.fn(async () => new Response(JSON.stringify({}), { status }));

  it('posts to /api/owner/setup', async () => {
    const fetch = answering(200);
    await finishSetup({ fetch: fetch as unknown as typeof globalThis.fetch, onUnauthorized: () => {} });
    expect(fetch).toHaveBeenCalledWith('/api/owner/setup', { method: 'POST', credentials: 'same-origin' });
  });

  it('a 401 sends the owner to sign in', async () => {
    const onUnauthorized = vi.fn();
    await expect(finishSetup({ fetch: answering(401) as unknown as typeof globalThis.fetch, onUnauthorized })).rejects.toBeInstanceOf(SignedOutError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('other failures reject with the status', async () => {
    await expect(finishSetup({ fetch: answering(500) as unknown as typeof globalThis.fetch, onUnauthorized: () => {} })).rejects.toThrow(/500/);
  });
});
