/** One saved Messages-app conversation (Firestore `chatLogs/{id}`). No IPs or visitor identifiers are stored. */
export interface ChatLog {
  id: string;
  appId: string;
  updatedAt: string; // ISO 8601
  messageCount: number; // visitor messages
  turns: { role: 'user' | 'assistant'; content: string; at: string }[];
}

/** Browser-generated conversation ids: random UUIDs, so they can't collide or be guessed. */
export function isValidConversationId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}
