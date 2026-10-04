import { describe, expect, it } from 'vitest';
import { seedSiteData } from './seed';
import { runTerminalCommand } from './terminal';

const content = { welcome: '', commands: [{ name: 'coffee', output: '☕ done' }] };
const run = (cmd: string) => runTerminalCommand(cmd, seedSiteData, content, new Date('2026-09-29T12:00:00Z'));

describe('runTerminalCommand', () => {
  it('help lists built-ins and custom commands', () => {
    const out = run('help').lines.join('\n');
    expect(out).toContain('open <name>');
    expect(out).toContain('coffee');
  });

  it('ls lists visible apps like files', () => {
    expect(run('ls').lines[0]).toContain('Project One/');
    expect(run('ls').lines[0]).toContain('Resume.pdf');
  });

  it('open finds apps by partial, case-insensitive name', () => {
    expect(run('open resume')).toMatchObject({ openAppId: 'resume' });
    expect(run('open ABOUT')).toMatchObject({ openAppId: 'about' });
    expect(run('open nope').lines[0]).toContain('No such file');
  });

  it('cat prints app text, whoami and contact use the site', () => {
    expect(run('cat about').lines[0]).toContain('Helen Keller');
    expect(run('whoami').lines[0]).toBe('Your Name');
    expect(run('contact').lines[0]).toContain('you@example.com');
  });

  it('runs custom commands, easter eggs, and handles unknowns', () => {
    expect(run('coffee').lines).toEqual(['☕ done']);
    expect(run('sudo rm -rf /').lines[0]).toContain('hire me');
    expect(run('clear')).toEqual({ lines: [], clear: true });
    expect(run('fly').lines[0]).toBe('zsh: command not found: fly. Type “help”.');
    expect(run('   ').lines).toEqual([]);
  });
});
