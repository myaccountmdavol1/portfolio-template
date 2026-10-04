'use client';

import { Mic, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import type { VoiceMemosApp } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { ListEditor, Section, smallButton, TextField, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Record straight from the microphone (MediaRecorder), then upload like any other file. */
function Recorder({ onRecorded }: { onRecorded: (url: string) => void }) {
  const editor = useEditor();
  const [state, setState] = useState<'idle' | 'recording' | 'uploading' | 'error'>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        const type = rec.mimeType || 'audio/webm';
        const file = new File([new Blob(chunks, { type })], `memo-${Date.now()}.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type });
        setState('uploading');
        try {
          onRecorded(await editor!.upload(file, 'audio'));
          setState('idle');
        } catch (err) {
          console.error('Upload failed', err);
          setState('error');
        }
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState('recording');
    } catch (err) {
      console.error('Microphone unavailable', err);
      setState('error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === 'recording' ? (
        <button type="button" onClick={() => recorder.current?.stop()} className={`${smallButton} text-[#c0362c]`}>
          <Square size={12} aria-hidden /> Stop ({seconds}s)
        </button>
      ) : (
        <button type="button" disabled={state === 'uploading' || !editor} onClick={() => void start()} className={smallButton}>
          <Mic size={12} aria-hidden /> {state === 'uploading' ? 'Saving…' : 'Record a memo'}
        </button>
      )}
      {state === 'error' && <span className="text-xs text-[#b3261e]">Couldn’t record — check microphone permission.</span>}
    </div>
  );
}

export function VoiceMemosForm({ app }: { app: VoiceMemosApp }) {
  const { set } = useContentEditor(app);
  const memos = app.content.memos;
  return (
    <Section title="Voice Memos">
      <Recorder onRecorded={(url) => set('memos', [...memos, { title: 'New Recording', url, recordedOn: today() }], true)} />
      <ListEditor
        label="Recordings"
        items={memos}
        onChange={(items, s) => set('memos', items, s)}
        create={() => ({ title: 'New Recording', url: '', recordedOn: today() })}
        itemTitle={(m) => m.title}
        addLabel="Add from a file"
        render={(m, update) => (
          <>
            <TextField label="Title" value={m.title} onChange={(title) => update({ ...m, title })} />
            <TextField label="Date" value={m.recordedOn} onChange={(recordedOn) => update({ ...m, recordedOn })} />
            <UploadField label="Audio" folder="audio" accept="audio/*" value={m.url} onChange={(url) => update({ ...m, url })} />
          </>
        )}
      />
    </Section>
  );
}
