import { json, ownerOnly } from './http';
import type { OwnerStore } from './owner';

type Kind = 'guestbook' | 'hall-of-fame' | 'inbox' | 'chat-logs';

interface Moderated {
  list(appId: string): Promise<unknown[]>;
  /** The one POST action this collection accepts, or null for none. */
  action: 'approve' | 'markRead' | null;
  run(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  needsApp: boolean;
}

function moderated(store: OwnerStore, kind: Kind): Moderated {
  switch (kind) {
    case 'guestbook':
      return { list: (appId) => store.guestbook.list(appId), action: 'approve', run: (id) => store.guestbook.approve(id), remove: (id) => store.guestbook.remove(id), needsApp: true };
    case 'hall-of-fame':
      return { list: () => store.hallOfFame.list(), action: 'approve', run: (id) => store.hallOfFame.approve(id), remove: (id) => store.hallOfFame.remove(id), needsApp: false };
    case 'inbox':
      return { list: (appId) => store.inbox.list(appId), action: 'markRead', run: (id) => store.inbox.markRead(id), remove: (id) => store.inbox.remove(id), needsApp: true };
    case 'chat-logs':
      return { list: () => store.chatLogs.list(), action: null, run: async () => {}, remove: (id) => store.chatLogs.remove(id), needsApp: false };
  }
}

/** GET (list), POST (approve / markRead) and DELETE handlers for one moderated collection. Owner only. */
export function moderationRoutes(kind: Kind) {
  return {
    async GET(request: Request) {
      const auth = await ownerOnly(request);
      if (auth instanceof Response) return auth;
      const m = moderated(auth.store, kind);
      const appId = new URL(request.url).searchParams.get('appId') ?? '';
      if (m.needsApp && !appId) return json(400, { error: 'appId is required' });
      return json(200, { items: await m.list(appId) });
    },
    async POST(request: Request) {
      const auth = await ownerOnly(request);
      if (auth instanceof Response) return auth;
      const m = moderated(auth.store, kind);
      const body = (await request.json().catch(() => null)) as { action?: unknown; id?: unknown } | null;
      if (!m.action || body?.action !== m.action || typeof body.id !== 'string') return json(400, { error: 'Unknown action' });
      await m.run(body.id);
      return json(200, { ok: true });
    },
    async DELETE(request: Request) {
      const auth = await ownerOnly(request);
      if (auth instanceof Response) return auth;
      const id = new URL(request.url).searchParams.get('id');
      if (!id) return json(400, { error: 'id is required' });
      await moderated(auth.store, kind).remove(id);
      return json(200, { ok: true });
    },
  };
}
