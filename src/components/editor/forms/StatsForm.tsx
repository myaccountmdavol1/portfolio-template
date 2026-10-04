'use client';

import type { StatsApp } from '@/lib/types';
import { ListEditor, NumberField, Section, TextField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function StatsForm({ app }: { app: StatsApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="Stats">
        <TextField label="Heading" value={c.heading} onChange={(v) => set('heading', v)} />
        <TextField label="Subheading" value={c.subheading} onChange={(v) => set('subheading', v)} />
        <Toggle label="Show as a phone widget" checked={c.showAsPhoneWidget} onChange={(v) => set('showAsPhoneWidget', v, true)} />
      </Section>
      <Section title="Numbers">
        <ListEditor
          label="Metrics"
          items={c.metrics}
          onChange={(items, s) => set('metrics', items, s)}
          create={() => ({ label: 'Metric', value: '0' })}
          itemTitle={(m) => `${m.value} ${m.label}`}
          addLabel="Add metric"
          render={(m, update) => (
            <>
              <TextField label="Value" value={m.value} onChange={(value) => update({ ...m, value })} />
              <TextField label="Label" value={m.label} onChange={(label) => update({ ...m, label })} />
            </>
          )}
        />
      </Section>
      <Section title="Steps">
        <ListEditor
          label="Steps"
          items={c.steps}
          onChange={(items, s) => set('steps', items, s)}
          create={() => ({ name: 'Step', desc: '' })}
          itemTitle={(st) => st.name}
          addLabel="Add step"
          render={(st, update) => (
            <>
              <TextField label="Name" value={st.name} onChange={(name) => update({ ...st, name })} />
              <TextField label="Description" multiline value={st.desc} onChange={(desc) => update({ ...st, desc })} />
            </>
          )}
        />
      </Section>
      <Section title="Chart">
        <Toggle label="Show a bar chart" checked={c.chart !== null} onChange={(on) => set('chart', on ? { title: 'Chart', bars: [] } : null, true)} />
        {c.chart && (
          <>
            <TextField label="Chart title" value={c.chart.title} onChange={(title) => set('chart', { ...c.chart!, title })} />
            <ListEditor
              label="Bars"
              items={c.chart.bars}
              onChange={(bars, s) => set('chart', { ...c.chart!, bars }, s)}
              create={() => ({ label: String(new Date().getFullYear()), value: 0 })}
              itemTitle={(b) => `${b.label}: ${b.value}`}
              addLabel="Add bar"
              render={(b, update) => (
                <>
                  <TextField label="Label" value={b.label} onChange={(label) => update({ ...b, label })} />
                  <NumberField label="Value" value={b.value} onChange={(value) => update({ ...b, value })} />
                </>
              )}
            />
          </>
        )}
      </Section>
    </>
  );
}
