import { describe, expect, it } from 'vitest';

process.env.FIREBASE_PROJECT_ID ??= 'demo-portfolio-test';

describe('guestbook storage against the Firestore emulator', () => {
  it('only lists approved notes for the right guestbook, newest first', async () => {
    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { addNote, listApprovedNotes } = await import('../../src/lib/guestbook/firestore');
    const db = adminDb();
    const appId = `gb-${Date.now()}`;
    await addNote(db, { appId, name: 'Old', message: 'first', color: 'yellow' }, 'approved', new Date('2026-09-01T00:00:00Z'));
    await addNote(db, { appId, name: 'New', message: 'second', color: 'pink' }, 'approved', new Date('2026-09-02T00:00:00Z'));
    await addNote(db, { appId, name: 'Hidden', message: 'pending', color: 'blue' }, 'pending');
    await addNote(db, { appId: 'other', name: 'Else', message: 'x', color: 'blue' }, 'approved');
    const notes = await listApprovedNotes(db, appId);
    expect(notes.map((n) => n.name)).toEqual(['New', 'Old']);
    expect(notes[0]).not.toHaveProperty('status');
  });
});
