export type ParsedAction =
  | { kind: 'openApp'; appId: string }
  | { kind: 'url'; href: string }
  | { kind: 'none' };

/** Action strings are "openApp:<appId>" or "url:<href>". Anything else is ignored. */
export function parseAction(action: string): ParsedAction {
  if (action.startsWith('openApp:')) {
    const appId = action.slice('openApp:'.length);
    return appId ? { kind: 'openApp', appId } : { kind: 'none' };
  }
  if (action.startsWith('url:')) {
    const href = action.slice('url:'.length);
    return href ? { kind: 'url', href } : { kind: 'none' };
  }
  return { kind: 'none' };
}

/** Opens a link: mail/phone/sms links in the same tab (they launch an app), everything else in a new tab. */
export function openExternal(href: string): void {
  if (/^(mailto|tel|sms):/i.test(href)) {
    window.location.href = href;
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

export function runAction(action: string, openApp: (appId: string) => void): void {
  const parsed = parseAction(action);
  if (parsed.kind === 'openApp') openApp(parsed.appId);
  else if (parsed.kind === 'url') openExternal(parsed.href);
}

export type ActionChoice =
  | { mode: 'app'; ref: string }
  | { mode: 'email'; address: string }
  | { mode: 'link'; href: string }
  | { mode: 'none' };

/** Splits an action string into what the editor's picker shows. */
export function describeAction(action: string): ActionChoice {
  const parsed = parseAction(action);
  if (parsed.kind === 'openApp') return { mode: 'app', ref: parsed.appId };
  if (parsed.kind === 'url') {
    return /^mailto:/i.test(parsed.href) ? { mode: 'email', address: parsed.href.slice('mailto:'.length) } : { mode: 'link', href: parsed.href };
  }
  return { mode: 'none' };
}

export function actionString(choice: ActionChoice): string {
  switch (choice.mode) {
    case 'app':
      return choice.ref ? `openApp:${choice.ref}` : '';
    case 'email':
      return `url:mailto:${choice.address.trim()}`;
    case 'link':
      return `url:${choice.href.trim()}`;
    case 'none':
      return '';
  }
}
