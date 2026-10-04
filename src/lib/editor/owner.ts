/** The site owner's Google account. Set NEXT_PUBLIC_OWNER_EMAIL; with it unset nobody can open the editor. */
export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL ?? '').trim();

/** UI-only check; firestore.rules / storage.rules are what actually enforce owner access. */
export function isOwnerUser(user: { email: string | null; emailVerified: boolean } | null): boolean {
  if (!OWNER_EMAIL) return false;
  return Boolean(user && user.emailVerified && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
}
