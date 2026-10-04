import type { PortfolioApp } from '@/lib/types';
import { AboutView } from './AboutView';
import { CalendarView } from './CalendarView';
import { GameCenterView } from './GameCenterView';
import { MapsView } from './MapsView';
import { PhoneView } from './PhoneView';
import { PhotosView } from './PhotosView';
import { SocialView } from './SocialView';
import { WalletView } from './WalletView';
import { VoiceMemosView } from './VoiceMemosView';
import { ClockView } from './ClockView';
import { CredentialsView } from './CredentialsView';
import { DocumentView } from './DocumentView';
import { FaceTimeView } from './FaceTimeView';
import { FreeformView } from './FreeformView';
import { GuestbookView } from './GuestbookView';
import { LinkView } from './LinkView';
import { MailView } from './MailView';
import { MessagesView } from './MessagesView';
import { NoteView } from './NoteView';
import { ProjectView } from './ProjectView';
import { StatsView } from './StatsView';
import { StatusView } from './StatusView';
import { TerminalView } from './TerminalView';

export function AppContent({ app }: { app: PortfolioApp }) {
  switch (app.type) {
    case 'project':
      return <ProjectView app={app} />;
    case 'document':
      return <DocumentView app={app} />;
    case 'about':
      return <AboutView app={app} />;
    case 'link':
      return <LinkView app={app} />;
    case 'credentials':
      return <CredentialsView app={app} />;
    case 'stats':
      return <StatsView app={app} />;
    case 'note':
      return <NoteView app={app} />;
    case 'clock':
      return <ClockView app={app} />;
    case 'status':
      return <StatusView app={app} />;
    case 'messages':
      return <MessagesView app={app} />;
    case 'guestbook':
      return <GuestbookView app={app} />;
    case 'freeform':
      return <FreeformView app={app} />;
    case 'terminal':
      return <TerminalView app={app} />;
    case 'photos':
      return <PhotosView app={app} />;
    case 'maps':
      return <MapsView app={app} />;
    case 'calendar':
      return <CalendarView app={app} />;
    case 'voicememos':
      return <VoiceMemosView app={app} />;
    case 'gamecenter':
      return <GameCenterView app={app} />;
    case 'mail':
      return <MailView app={app} />;
    case 'facetime':
      return <FaceTimeView app={app} />;
    case 'wallet':
      return <WalletView app={app} />;
    case 'social':
      return <SocialView app={app} />;
    case 'phone':
      return <PhoneView app={app} />;
    default: {
      const unknownApp: never = app;
      return unknownApp;
    }
  }
}
