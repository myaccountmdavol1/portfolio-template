import { FieldValue, type Firestore } from 'firebase-admin/firestore';

/** Appends one question + answer to `chatLogs/{conversationId}` (server-only, Admin SDK). */
export async function appendChatLog(
  db: Firestore,
  conversationId: string,
  appId: string,
  question: string,
  answer: string,
  now = new Date(),
): Promise<void> {
  const at = now.toISOString();
  await db
    .collection('chatLogs')
    .doc(conversationId)
    .set(
      {
        appId,
        updatedAt: at,
        messageCount: FieldValue.increment(1),
        turns: FieldValue.arrayUnion({ role: 'user', content: question, at }, { role: 'assistant', content: answer, at }),
      },
      { merge: true },
    );
}
