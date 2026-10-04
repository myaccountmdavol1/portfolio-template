import { describe, expect, it } from 'vitest';

process.env.FIREBASE_PROJECT_ID ??= 'demo-portfolio-test';

describe('appendChatLog against the Firestore emulator', () => {
  it('builds one thread per conversation with a message count', async () => {
    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { appendChatLog } = await import('../../src/lib/chat/firestoreLog');
    const db = adminDb();
    const id = `test-${Date.now()}`;
    await appendChatLog(db, id, 'messages-1', 'Where did you study?', 'At University name.', new Date('2026-09-29T10:00:00Z'));
    await appendChatLog(db, id, 'messages-1', 'Thanks!', 'Anytime!', new Date('2026-09-29T10:01:00Z'));
    const snap = await db.collection('chatLogs').doc(id).get();
    expect(snap.get('appId')).toBe('messages-1');
    expect(snap.get('messageCount')).toBe(2);
    expect(snap.get('updatedAt')).toBe('2026-09-29T10:01:00.000Z');
    expect(snap.get('turns').map((t: { content: string }) => t.content)).toEqual(['Where did you study?', 'At University name.', 'Thanks!', 'Anytime!']);
  });
});
