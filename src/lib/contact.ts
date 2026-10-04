/** A message sent through the Mail app (Firestore `inbox/{id}`). */
export interface InboxMessage {
  id: string;
  appId: string;
  name: string;
  email: string; // the visitor's address, so the owner can reply
  subject: string;
  message: string;
  createdAt: string; // ISO 8601
  read: boolean;
}

export type ContactSubmission = Omit<InboxMessage, 'id' | 'createdAt' | 'read'>;

export const CONTACT_LIMITS = { name: 80, email: 200, subject: 150, message: 5000 };

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export type ParsedContact = { ok: true; message: ContactSubmission } | { ok: false; error: string };

export function parseContact(body: unknown): ParsedContact {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request' };
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const appId = str(b.appId);
  const name = str(b.name).replace(/\s+/g, ' ');
  const email = str(b.email);
  const subject = str(b.subject).replace(/\s+/g, ' ');
  const message = str(b.message);
  if (!appId) return { ok: false, error: 'Missing appId' };
  if (!name) return { ok: false, error: 'Please add your name.' };
  if (!isEmail(email)) return { ok: false, error: 'Please add a valid email so I can reply.' };
  if (!message) return { ok: false, error: 'Please write a message.' };
  if (name.length > CONTACT_LIMITS.name || email.length > CONTACT_LIMITS.email || subject.length > CONTACT_LIMITS.subject || message.length > CONTACT_LIMITS.message) {
    return { ok: false, error: 'That message is a bit too long.' };
  }
  return { ok: true, message: { appId, name, email, subject, message } };
}

/** Links that open a compose window in the visitor's webmail, for people without a desktop email app. */
export function composeLinks(to: string, subject: string, body: string) {
  const q = (params: Record<string, string>) => new URLSearchParams(params).toString();
  return {
    gmail: `https://mail.google.com/mail/?${q({ view: 'cm', fs: '1', to, su: subject, body })}`,
    outlook: `https://outlook.live.com/mail/0/deeplink/compose?${q({ to, subject, body })}`,
    mailto: `mailto:${to}?${[subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&')}`.replace(/\?$/, ''),
  };
}
