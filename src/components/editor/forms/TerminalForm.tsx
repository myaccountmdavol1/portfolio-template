'use client';

import type { TerminalApp } from '@/lib/types';
import { ListEditor, Section, TextField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function TerminalForm({ app }: { app: TerminalApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Terminal">
      <TextField label="Welcome message" multiline value={c.welcome} onChange={(v) => set('welcome', v)} />
      <p className="m-0 text-[11px] text-[#6b675f]">Built in: help, whoami, ls, open, cat, contact, date, echo, clear — plus a few easter eggs.</p>
      <ListEditor
        label="Your own commands"
        items={c.commands}
        onChange={(items, s) => set('commands', items, s)}
        create={() => ({ name: 'secret', output: 'You found it! 🎉' })}
        itemTitle={(cmd) => cmd.name}
        addLabel="Add command"
        render={(cmd, update) => (
          <>
            <TextField label="Command" value={cmd.name} onChange={(name) => update({ ...cmd, name: name.replace(/\s+/g, '') })} />
            <TextField label="What it prints" multiline value={cmd.output} onChange={(output) => update({ ...cmd, output })} />
          </>
        )}
      />
    </Section>
  );
}
