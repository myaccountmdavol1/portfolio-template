export type ShareResult = 'shared' | 'copied' | 'failed';

export interface ShareNavigator {
  share?: (data: { url: string; title: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

/** Phones get the system share sheet when there is one; otherwise (or if it fails) the link is copied. */
export async function shareLink(url: string, title: string, options: { preferSheet: boolean; nav?: ShareNavigator }): Promise<ShareResult> {
  const nav = options.nav ?? (navigator as ShareNavigator);
  if (options.preferSheet && nav.share) {
    try {
      await nav.share({ url, title });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'; // they closed the sheet
    }
  }
  try {
    if (!nav.clipboard) return 'failed';
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
