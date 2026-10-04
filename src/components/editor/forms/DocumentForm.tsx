'use client';

import type { DocumentApp } from '@/lib/types';
import { Section, TextField, Toggle, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function DocumentForm({ app }: { app: DocumentApp }) {
  const { set, patch } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Document">
      <UploadField
        label="PDF file"
        folder="docs"
        accept="application/pdf"
        value={c.fileUrl}
        onChange={(fileUrl, file) => patch(file ? { fileUrl, fileName: file.name } : { fileUrl })}
      />
      {c.fileUrl && <p className="m-0 text-xs text-[#6b675f]">Uploaded: {c.fileName}</p>}
      <TextField label="File name shown" value={c.fileName} onChange={(v) => set('fileName', v)} />
      <Toggle label="Show a download button" checked={c.showDownload} onChange={(v) => set('showDownload', v, true)} />
    </Section>
  );
}
