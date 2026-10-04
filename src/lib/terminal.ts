import { appText } from './spotlight';
import type { PortfolioApp, SiteData, TerminalContent } from './types';

export type TerminalResult = { lines: string[]; openAppId?: string; clear?: boolean };

const BUILTINS: [string, string][] = [
  ['help', 'show these commands'],
  ['whoami', 'who you’re talking to'],
  ['ls', 'list everything on the desktop'],
  ['open <name>', 'open an app, e.g. open resume'],
  ['cat <name>', 'print an app’s text'],
  ['contact', 'how to get in touch'],
  ['date', 'today’s date'],
  ['echo <text>', 'say something back'],
  ['clear', 'clear the screen'],
];

function findApp(data: SiteData, query: string): PortfolioApp | undefined {
  const q = query.trim().toLowerCase().replace(/\.app$/, '');
  if (!q) return undefined;
  const visible = data.apps.filter((a) => a.visible);
  return (
    visible.find((a) => a.title.toLowerCase() === q || a.id.toLowerCase() === q) ??
    visible.find((a) => a.title.toLowerCase().startsWith(q)) ??
    visible.find((a) => a.title.toLowerCase().includes(q))
  );
}

/** Runs one Terminal command against the site. Pure: returns what to print (and any app to open). */
export function runTerminalCommand(input: string, data: SiteData, content: TerminalContent, now = new Date()): TerminalResult {
  const line = input.trim();
  if (!line) return { lines: [] };
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ');
  const name = cmd.toLowerCase();

  const custom = content.commands.find((c) => c.name.trim().toLowerCase() === name);
  if (custom) return { lines: custom.output.split('\n') };

  switch (name) {
    case 'help':
      return {
        lines: [
          'Commands:',
          ...BUILTINS.map(([c, d]) => `  ${c.padEnd(14)} ${d}`),
          ...content.commands.filter((c) => c.name.trim()).map((c) => `  ${c.name.trim().padEnd(14)} ✨`),
        ],
      };
    case 'whoami': {
      const about = data.apps.find((a) => a.type === 'about' && a.visible);
      return { lines: [data.site.ownerName, ...(about?.type === 'about' && about.content.roleTitle ? [about.content.roleTitle] : [])] };
    }
    case 'ls':
      return {
        lines: [
          data.apps
            .filter((a) => a.visible)
            .map((a) => (a.type === 'project' ? `${a.title}/` : a.type === 'document' ? a.title : `${a.title}.app`))
            .join('    '),
        ],
      };
    case 'open': {
      if (!arg) return { lines: ['usage: open <name>   (try “ls” to see names)'] };
      const app = findApp(data, arg);
      return app ? { lines: [`Opening ${app.title}…`], openAppId: app.id } : { lines: [`open: ${arg}: No such file or directory`] };
    }
    case 'cat': {
      if (!arg) return { lines: ['usage: cat <name>'] };
      const app = findApp(data, arg);
      if (!app) return { lines: [`cat: ${arg}: No such file or directory`] };
      const text = appText(app).text.replace(/\s+/g, ' ').trim();
      return { lines: [text.length > 600 ? `${text.slice(0, 600)}…` : text || '(empty)'] };
    }
    case 'contact':
      return {
        lines: [
          ...(data.site.email ? [`email     ${data.site.email}`] : []),
          ...data.site.socialLinks.map((l) => `${l.label.toLowerCase().padEnd(10)}${l.url}`),
        ],
      };
    case 'date':
      return { lines: [now.toDateString()] };
    case 'echo':
      return { lines: [arg] };
    case 'clear':
      return { lines: [], clear: true };
    case 'sudo':
      return { lines: [`Nice try 😄 No root here — but you could hire me: ${data.site.email || 'see “contact”'}`] };
    case 'rm':
      return { lines: ['rm: Permission denied. I worked hard on this!'] };
    case 'exit':
      return { lines: ['Use the red button to close me 🙂'] };
    case 'hello':
    case 'hi':
      return { lines: [`Hi! 👋 I’m ${data.site.ownerName}. Try “help”.`] };
    default:
      return { lines: [`zsh: command not found: ${cmd}. Type “help”.`] };
  }
}
