import { beforeEach, describe, expect, it } from 'vitest';
import { ensureSchema } from '../store/postgres/schema';
import { pgliteSql } from '../store/postgres/sql';
import { postgresStore } from '../store/postgres/store';
import type { ServerStore } from '../store/types';
import { addonStatus, chatKey, hostingAddons, spotifyCredentials } from './config';
import { encryptSecret } from './secrets';

const CODE = 'config-setup-code';
const sql = pgliteSql();
let store: ServerStore;

beforeEach(async () => {
  store = postgresStore(sql);
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
});

const saveChat = (key: string, code = CODE) => store.addons.set({ anthropicKey: encryptSecret(key, code), updatedAt: '2026-10-05T00:00:00.000Z' });
const saveSpotify = (clientId: string, secret: string, code = CODE) =>
  store.addons.set({ spotify: { clientId, clientSecret: encryptSecret(secret, code) }, updatedAt: '2026-10-05T00:00:00.000Z' });

describe('chatKey', () => {
  it('is null with nothing set, or with no storage', async () => {
    await expect(chatKey({ env: { SETUP_CODE: CODE }, store })).resolves.toBeNull();
    await expect(chatKey({ env: { SETUP_CODE: CODE }, store: null })).resolves.toBeNull();
  });

  it('uses the saved key when the hosting sets none', async () => {
    await saveChat('sk-ant-saved-1234');
    await expect(chatKey({ env: { SETUP_CODE: CODE }, store })).resolves.toEqual({ key: 'sk-ant-saved-1234', source: 'stored' });
  });

  it('lets the hosting variable win over a saved key', async () => {
    await saveChat('sk-ant-saved-1234');
    await expect(chatKey({ env: { SETUP_CODE: CODE, ANTHROPIC_API_KEY: ' sk-ant-env ' }, store })).resolves.toEqual({ key: 'sk-ant-env', source: 'env' });
    // A blank variable counts as not set.
    await expect(chatKey({ env: { SETUP_CODE: CODE, ANTHROPIC_API_KEY: ' ' }, store })).resolves.toMatchObject({ source: 'stored' });
  });

  it('is null when the setup code changed, or is gone or too short', async () => {
    await saveChat('sk-ant-saved-1234');
    for (const SETUP_CODE of ['another-setup-code', undefined, 'short']) await expect(chatKey({ env: { SETUP_CODE }, store })).resolves.toBeNull();
  });

  it('is null, not a crash, when the store fails', async () => {
    const broken = { ...store, addons: { get: async () => Promise.reject(new Error('down')), set: store.addons.set } } as ServerStore;
    await expect(chatKey({ env: { SETUP_CODE: CODE }, store: broken })).resolves.toBeNull();
  });
});

describe('no usable setup code', () => {
  it('skips the store read for both add-ons, while the status still reports a saved key as reenter', async () => {
    await store.addons.set({
      anthropicKey: encryptSecret('sk-ant-saved-1234', CODE),
      spotify: { clientId: 'saved-id', clientSecret: encryptSecret('saved-secret', CODE) },
      updatedAt: '2026-10-05T00:00:00.000Z',
    });
    let reads = 0;
    const counting = { ...store, addons: { get: async () => (reads++, store.addons.get()), set: store.addons.set } } as ServerStore;
    await expect(chatKey({ env: {}, store: counting })).resolves.toBeNull();
    await expect(spotifyCredentials({ env: { SETUP_CODE: 'short' }, store: counting })).resolves.toBeNull();
    expect(reads).toBe(0);
    await expect(addonStatus({ env: {}, store: counting })).resolves.toMatchObject({
      chat: { state: 'reenter' },
      spotify: { state: 'reenter' },
      canStore: false,
    });
    expect(reads).toBe(1);
  });
});

describe('spotifyCredentials', () => {
  it('needs both hosting variables to use them, and they win', async () => {
    await saveSpotify('saved-id', 'saved-secret');
    const env = { SETUP_CODE: CODE, SPOTIFY_CLIENT_ID: 'env-id', SPOTIFY_CLIENT_SECRET: 'env-secret' };
    await expect(spotifyCredentials({ env, store })).resolves.toEqual({ clientId: 'env-id', clientSecret: 'env-secret', source: 'env' });
    await expect(spotifyCredentials({ env: { ...env, SPOTIFY_CLIENT_SECRET: '' }, store })).resolves.toEqual({
      clientId: 'saved-id',
      clientSecret: 'saved-secret',
      source: 'stored',
    });
  });

  it('is null with nothing set, or when the saved secret can\u2019t be opened', async () => {
    await expect(spotifyCredentials({ env: { SETUP_CODE: CODE }, store })).resolves.toBeNull();
    await saveSpotify('saved-id', 'saved-secret', 'an-older-setup-code');
    await expect(spotifyCredentials({ env: { SETUP_CODE: CODE }, store })).resolves.toBeNull();
  });
});

describe('addonStatus', () => {
  it('reports nothing set up, and whether keys can be saved', async () => {
    await expect(addonStatus({ env: { SETUP_CODE: CODE }, store })).resolves.toEqual({
      chat: { state: 'off' },
      spotify: { state: 'off', connected: false },
      canStore: true,
    });
    expect((await addonStatus({ env: { SETUP_CODE: 'short' }, store })).canStore).toBe(false);
  });

  it('shows a saved key only by its last four characters', async () => {
    await saveChat('sk-ant-saved-abcd');
    const status = await addonStatus({ env: { SETUP_CODE: CODE }, store });
    expect(status.chat).toEqual({ state: 'on', hint: 'abcd' });
    expect(JSON.stringify(status)).not.toContain('sk-ant');
  });

  it('asks to re-enter keys the setup code can no longer open', async () => {
    await store.addons.set({
      anthropicKey: encryptSecret('sk-ant-old', 'an-older-setup-code'),
      spotify: { clientId: 'id', clientSecret: encryptSecret('s', 'an-older-setup-code') },
      updatedAt: '2026-10-05T00:00:00.000Z',
    });
    const status = await addonStatus({ env: { SETUP_CODE: CODE }, store });
    expect(status.chat).toEqual({ state: 'reenter' });
    expect(status.spotify.state).toBe('reenter');
  });

  it('follows Spotify from keys saved to connected', async () => {
    await saveSpotify('id', 'secret');
    expect((await addonStatus({ env: { SETUP_CODE: CODE }, store })).spotify).toEqual({ state: 'credentials', connected: false });
    await store.spotify.save({ refreshToken: 'r', spotifyUserId: 'alex' });
    expect((await addonStatus({ env: { SETUP_CODE: CODE }, store })).spotify).toEqual({ state: 'connected', connected: true });
  });

  it('says env for anything the hosting sets', async () => {
    await saveChat('sk-ant-saved-abcd');
    const env = { SETUP_CODE: CODE, ANTHROPIC_API_KEY: 'sk-ant-env', SPOTIFY_CLIENT_ID: 'i', SPOTIFY_CLIENT_SECRET: 's', SPOTIFY_REFRESH_TOKEN: 'r' };
    await expect(addonStatus({ env, store })).resolves.toEqual({ chat: { state: 'env' }, spotify: { state: 'env', connected: true }, canStore: true });
  });
});

describe('hostingAddons', () => {
  it('is booleans only', () => {
    expect(hostingAddons({ ANTHROPIC_API_KEY: 'k', SPOTIFY_CLIENT_ID: 'i' })).toEqual({ chat: true, spotify: false });
    expect(hostingAddons({ SPOTIFY_CLIENT_ID: 'i', SPOTIFY_CLIENT_SECRET: 's' })).toEqual({ chat: false, spotify: true });
  });
});
