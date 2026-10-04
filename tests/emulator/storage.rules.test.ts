import { readFileSync } from 'node:fs';
import { deleteObject, getBytes, listAll, ref, uploadBytes } from 'firebase/storage';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const OWNER_EMAIL = 'owner@example.test';
let testEnv: RulesTestEnvironment;

const smallImage = new Uint8Array(1024); // 1KB — well under the 10MB image limit
const bigImage = new Uint8Array(11 * 1024 * 1024); // 11MB — over the 10MB image limit
const smallPdf = new Uint8Array(2048);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-portfolio-test',
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

describe('storage.rules', () => {
  it('anyone can open an uploaded file, but only the owner can list uploads (the media library)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' });
    });
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getBytes(ref(anon.storage(), 'images/cover.png')));
    await assertFails(listAll(ref(anon.storage(), 'images')));
    await assertSucceeds(listAll(ref(owner.storage(), 'images')));
  });


  it('lets the owner upload an image under the 10MB limit', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertSucceeds(uploadBytes(ref(owner.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' }));
  });

  it('blocks an image over the 10MB limit even for the owner', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertFails(uploadBytes(ref(owner.storage(), 'images/huge.png'), bigImage, { contentType: 'image/png' }));
  });

  it('lets the owner upload a PDF under the 20MB limit to /docs', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertSucceeds(uploadBytes(ref(owner.storage(), 'docs/resume.pdf'), smallPdf, { contentType: 'application/pdf' }));
  });

  it('blocks a non-PDF upload to /docs', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertFails(uploadBytes(ref(owner.storage(), 'docs/resume.png'), smallImage, { contentType: 'image/png' }));
  });

  it('blocks anonymous uploads', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(uploadBytes(ref(anon.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' }));
  });

  it('blocks a signed-in non-owner from uploading to images, docs, or icons', async () => {
    const stranger = testEnv.authenticatedContext('stranger-uid', { email: 'someone@else.com', email_verified: true });
    await assertFails(uploadBytes(ref(stranger.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(stranger.storage(), 'docs/resume.pdf'), smallPdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(stranger.storage(), 'icons/app.png'), smallImage, { contentType: 'image/png' }));
  });

  it('lets anyone read an uploaded file', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await uploadBytes(ref(owner.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' });
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getBytes(ref(anon.storage(), 'images/cover.png')));
  });

  it('lets the owner upload a video to /videos, but only a video', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertSucceeds(uploadBytes(ref(owner.storage(), 'videos/intro.mp4'), smallImage, { contentType: 'video/mp4' }));
    await assertFails(uploadBytes(ref(owner.storage(), 'videos/intro.png'), smallImage, { contentType: 'image/png' }));
  });

  it('blocks a signed-in non-owner from uploading a video', async () => {
    const stranger = testEnv.authenticatedContext('stranger-uid', { email: 'someone@example.com', email_verified: true });
    await assertFails(uploadBytes(ref(stranger.storage(), 'videos/intro.mp4'), smallImage, { contentType: 'video/mp4' }));
  });

  it('lets the owner upload audio to /audio, but only audio', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertSucceeds(uploadBytes(ref(owner.storage(), 'audio/hello.webm'), smallImage, { contentType: 'audio/webm' }));
    await assertFails(uploadBytes(ref(owner.storage(), 'audio/hello.png'), smallImage, { contentType: 'image/png' }));
    const stranger = testEnv.authenticatedContext('stranger-uid', { email: 'someone@example.com', email_verified: true });
    await assertFails(uploadBytes(ref(stranger.storage(), 'audio/hello.webm'), smallImage, { contentType: 'audio/webm' }));
  });

  it('blocks writes outside images, docs, videos, and icons', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await assertFails(uploadBytes(ref(owner.storage(), 'random/cover.png'), smallImage, { contentType: 'image/png' }));
  });

  it('lets the owner delete an uploaded file', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await uploadBytes(ref(owner.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' });
    await assertSucceeds(deleteObject(ref(owner.storage(), 'images/cover.png')));
  });

  it('blocks a non-owner (or anonymous) from deleting an uploaded file', async () => {
    const owner = testEnv.authenticatedContext('owner-uid', { email: OWNER_EMAIL, email_verified: true });
    await uploadBytes(ref(owner.storage(), 'images/cover.png'), smallImage, { contentType: 'image/png' });

    const stranger = testEnv.authenticatedContext('stranger-uid', { email: 'someone@else.com', email_verified: true });
    await assertFails(deleteObject(ref(stranger.storage(), 'images/cover.png')));

    const anon = testEnv.unauthenticatedContext();
    await assertFails(deleteObject(ref(anon.storage(), 'images/cover.png')));
  });
});
