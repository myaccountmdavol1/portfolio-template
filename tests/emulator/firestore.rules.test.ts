import { readFileSync } from 'node:fs';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const OWNER_EMAIL = 'owner@example.test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-portfolio-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'published/site'), { ownerName: 'Test' });
    await setDoc(doc(ctx.firestore(), 'draft/site'), { ownerName: 'Test draft' });
    await setDoc(doc(ctx.firestore(), 'versions/v1'), { publishedAt: '2026-01-01T00:00:00.000Z' });
  });
});

describe('firestore.rules', () => {
  it('lets anyone read published data', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), 'published/site')));
  });

  it('blocks anonymous reads of draft and versions', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), 'draft/site')));
    await assertFails(getDoc(doc(anon.firestore(), 'versions/v1')));
  });

  it('blocks anonymous writes everywhere', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(anon.firestore(), 'published/site'), { ownerName: 'Hacked' }));
  });

  it('lets a signed-in non-owner read published but not draft, and never write', async () => {
    const stranger = testEnv.authenticatedContext('stranger-uid', { email: 'someone@else.com', email_verified: true });
    await assertSucceeds(getDoc(doc(stranger.firestore(), 'published/site')));
    await assertFails(getDoc(doc(stranger.firestore(), 'draft/site')));
    await assertFails(setDoc(doc(stranger.firestore(), 'published/site'), { ownerName: 'Hacked' }));
  });

  it('lets the verified owner read and write everywhere', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertSucceeds(getDoc(doc(owner.firestore(), 'draft/site')));
    await assertSucceeds(setDoc(doc(owner.firestore(), 'draft/site'), { ownerName: 'Updated' }));
    await assertSucceeds(setDoc(doc(owner.firestore(), 'published/site'), { ownerName: 'Updated' }));
    await assertSucceeds(setDoc(doc(owner.firestore(), 'versions/v2'), { publishedAt: '2026-02-01T00:00:00.000Z' }));
  });

  it('does not trust an unverified email claiming to be the owner', async () => {
    const unverified = testEnv.authenticatedContext('fake-owner-uid', { email: OWNER_EMAIL, email_verified: false });
    await assertFails(setDoc(doc(unverified.firestore(), 'draft/site'), { ownerName: 'Hacked' }));
  });

  it('lets only the owner read and delete chat logs, and nobody write them from a browser', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'chatLogs/c1'), { appId: 'messages-1', turns: [] });
    });
    const owner = testEnv.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore();
    const stranger = testEnv.authenticatedContext('stranger', { email: 'someone@example.com', email_verified: true }).firestore();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(owner, 'chatLogs/c1')));
    await assertFails(getDoc(doc(stranger, 'chatLogs/c1')));
    await assertFails(getDoc(doc(anon, 'chatLogs/c1')));
    await assertFails(setDoc(doc(anon, 'chatLogs/c2'), { turns: [] }));
    await assertFails(setDoc(doc(owner, 'chatLogs/c2'), { turns: [] }));
    await assertSucceeds(deleteDoc(doc(owner, 'chatLogs/c1')));
  });

  it('lets only the owner read the Mail inbox; nobody writes it from a browser', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'inbox/m1'), { name: 'A', email: 'a@b.co', message: 'hi', read: false });
    });
    const owner = testEnv.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'inbox/m1')));
    await assertFails(setDoc(doc(anon, 'inbox/m2'), { message: 'spam' }));
    await assertSucceeds(getDoc(doc(owner, 'inbox/m1')));
    await assertSucceeds(updateDoc(doc(owner, 'inbox/m1'), { read: true }));
    await assertSucceeds(deleteDoc(doc(owner, 'inbox/m1')));
  });

  it('lets only the owner read, approve, and delete guestbook notes; nobody creates them from a browser', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'guestbook/n1'), { appId: 'g', name: 'A', message: 'hi', status: 'pending' });
    });
    const owner = testEnv.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'guestbook/n1')));
    await assertFails(setDoc(doc(anon, 'guestbook/n2'), { name: 'spam', status: 'approved' }));
    await assertFails(setDoc(doc(owner, 'guestbook/n2'), { name: 'x' }));
    await assertSucceeds(getDoc(doc(owner, 'guestbook/n1')));
    await assertSucceeds(updateDoc(doc(owner, 'guestbook/n1'), { status: 'approved' }));
    await assertSucceeds(deleteDoc(doc(owner, 'guestbook/n1')));
  });

  it('lets only the owner read, approve, and remove Hall of Fame names; nobody signs from a browser', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'hallOfFame/h1'), { name: 'A', status: 'pending', createdAt: '2026-09-30T00:00:00.000Z' });
    });
    const owner = testEnv.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore();
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'hallOfFame/h1')));
    await assertFails(setDoc(doc(anon, 'hallOfFame/h2'), { name: 'me', status: 'approved' }));
    await assertFails(setDoc(doc(owner, 'hallOfFame/h2'), { name: 'x' }));
    await assertSucceeds(getDoc(doc(owner, 'hallOfFame/h1')));
    await assertSucceeds(updateDoc(doc(owner, 'hallOfFame/h1'), { status: 'approved' }));
    await assertSucceeds(deleteDoc(doc(owner, 'hallOfFame/h1')));
  });
});
