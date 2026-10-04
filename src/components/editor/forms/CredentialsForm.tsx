'use client';

import type { CredentialItem, CredentialsApp, EducationItem } from '@/lib/types';
import { ListEditor, NumberField, Section, TextField, Toggle, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

const newEducation = (): EducationItem => ({ abbr: 'B.A.', step: 'Step 1', title: 'Degree', school: 'School', year: '2026', inProgress: false, progress: 100 });
const newCredential = (): CredentialItem => ({ short: 'C', name: 'Credential', issuer: 'Issuer', year: '2026', desc: '' });

export function CredentialsForm({ app }: { app: CredentialsApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="Education">
        <ListEditor
          label="Degrees"
          items={c.education}
          onChange={(items, s) => set('education', items, s)}
          create={newEducation}
          itemTitle={(e) => e.title}
          addLabel="Add degree"
          render={(e, update) => (
            <>
              <TextField label="Degree" value={e.title} onChange={(title) => update({ ...e, title })} />
              <TextField label="Short form" value={e.abbr} onChange={(abbr) => update({ ...e, abbr })} />
              <TextField label="Step label" value={e.step} onChange={(step) => update({ ...e, step })} />
              <TextField label="School" value={e.school} onChange={(school) => update({ ...e, school })} />
              <TextField label="Year" value={e.year} onChange={(year) => update({ ...e, year })} />
              <Toggle label="In progress" checked={e.inProgress} onChange={(inProgress) => update({ ...e, inProgress })} />
              {e.inProgress && (
                <NumberField label="Progress (%)" min={0} max={100} value={e.progress} onChange={(progress) => update({ ...e, progress: Math.max(0, Math.min(100, progress)) })} />
              )}
            </>
          )}
        />
      </Section>
      <Section title="Credential groups">
        <ListEditor
          label="Groups"
          items={c.groups}
          onChange={(items, s) => set('groups', items, s)}
          create={() => ({ name: 'New group', color: 'linear-gradient(145deg,#64d2ff,#0a84ff)', items: [] })}
          itemTitle={(g) => g.name}
          addLabel="Add group"
          render={(g, update) => (
            <>
              <TextField label="Group name" value={g.name} onChange={(name) => update({ ...g, name })} />
              <TextField label="Badge colour" value={g.color} onChange={(color) => update({ ...g, color })} hint="Any CSS colour or gradient" />
              <ListEditor
                label="Credentials"
                items={g.items}
                onChange={(items) => update({ ...g, items })}
                create={newCredential}
                itemTitle={(i) => i.name}
                addLabel="Add credential"
                render={(i, updateItem) => (
                  <>
                    <TextField label="Name" value={i.name} onChange={(name) => updateItem({ ...i, name })} />
                    <TextField label="Badge letters" value={i.short} onChange={(short) => updateItem({ ...i, short: short.slice(0, 3) })} />
                    <TextField label="Issuer" value={i.issuer} onChange={(issuer) => updateItem({ ...i, issuer })} />
                    <TextField label="Year" value={i.year} onChange={(year) => updateItem({ ...i, year })} />
                    <TextField label="Description" multiline value={i.desc} onChange={(desc) => updateItem({ ...i, desc })} />
                    <UploadField label="Badge image" value={i.imageUrl ?? ''} onChange={(url) => updateItem({ ...i, imageUrl: url || undefined })} />
                    <TextField label="Verify link" type="url" value={i.verifyUrl ?? ''} onChange={(url) => updateItem({ ...i, verifyUrl: url || undefined })} />
                  </>
                )}
              />
            </>
          )}
        />
      </Section>
    </>
  );
}
