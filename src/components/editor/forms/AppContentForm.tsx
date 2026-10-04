'use client';

import type { PortfolioApp } from '@/lib/types';
import { AboutForm } from './AboutForm';
import { CalendarForm } from './CalendarForm';
import { GameCenterForm } from './GameCenterForm';
import { MapsForm } from './MapsForm';
import { PhoneForm } from './PhoneForm';
import { PhotosForm } from './PhotosForm';
import { SocialForm } from './SocialForm';
import { WalletForm } from './WalletForm';
import { VoiceMemosForm } from './VoiceMemosForm';
import { ClockForm } from './ClockForm';
import { CredentialsForm } from './CredentialsForm';
import { DocumentForm } from './DocumentForm';
import { FaceTimeForm } from './FaceTimeForm';
import { FreeformForm } from './FreeformForm';
import { GuestbookForm } from './GuestbookForm';
import { LinkForm } from './LinkForm';
import { MailForm } from './MailForm';
import { MessagesForm } from './MessagesForm';
import { NoteForm } from './NoteForm';
import { ProjectForm } from './ProjectForm';
import { StatsForm } from './StatsForm';
import { StatusForm } from './StatusForm';
import { TerminalForm } from './TerminalForm';

export function AppContentForm({ app }: { app: PortfolioApp }) {
  switch (app.type) {
    case 'project':
      return <ProjectForm app={app} />;
    case 'document':
      return <DocumentForm app={app} />;
    case 'about':
      return <AboutForm app={app} />;
    case 'link':
      return <LinkForm app={app} />;
    case 'credentials':
      return <CredentialsForm app={app} />;
    case 'stats':
      return <StatsForm app={app} />;
    case 'note':
      return <NoteForm app={app} />;
    case 'clock':
      return <ClockForm app={app} />;
    case 'status':
      return <StatusForm app={app} />;
    case 'messages':
      return <MessagesForm app={app} />;
    case 'guestbook':
      return <GuestbookForm app={app} />;
    case 'freeform':
      return <FreeformForm app={app} />;
    case 'terminal':
      return <TerminalForm app={app} />;
    case 'photos':
      return <PhotosForm app={app} />;
    case 'maps':
      return <MapsForm app={app} />;
    case 'calendar':
      return <CalendarForm app={app} />;
    case 'voicememos':
      return <VoiceMemosForm app={app} />;
    case 'gamecenter':
      return <GameCenterForm app={app} />;
    case 'mail':
      return <MailForm app={app} />;
    case 'facetime':
      return <FaceTimeForm app={app} />;
    case 'wallet':
      return <WalletForm app={app} />;
    case 'social':
      return <SocialForm app={app} />;
    case 'phone':
      return <PhoneForm app={app} />;
    default: {
      const unknownApp: never = app;
      return unknownApp;
    }
  }
}
