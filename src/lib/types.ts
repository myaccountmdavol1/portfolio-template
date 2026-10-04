// All data shapes for the portfolio. Firestore documents (Plan 2) use exactly these shapes.

export type AppType = 'project' | 'document' | 'about' | 'link' | 'credentials' | 'stats' | 'note' | 'clock' | 'status' | 'messages' | 'guestbook' | 'freeform' | 'terminal' | 'photos' | 'maps' | 'calendar' | 'voicememos' | 'gamecenter' | 'mail' | 'facetime' | 'wallet' | 'social' | 'phone';

/** Types shown as draggable widgets on the desktop (and 2×2 widgets on the phone) rather than icons. */
export const WIDGET_TYPES: readonly AppType[] = ['note', 'clock', 'status'];

export type BuiltinIconName =
  | 'folder'
  | 'file'
  | 'note'
  | 'person'
  | 'chart'
  | 'badge'
  | 'link'
  | 'music'
  | 'mail'
  | 'globe';

export type CatalogIconSlug =
  | 'app-store'
  | 'apps'
  | 'books'
  | 'calculator'
  | 'calendar'
  | 'clock'
  | 'contacts'
  | 'facetime'
  | 'find-my'
  | 'finder'
  | 'freeform'
  | 'games'
  | 'home'
  | 'image-playground'
  | 'iphone-mirroring'
  | 'journal'
  | 'mail'
  | 'maps'
  | 'messages'
  | 'music'
  | 'news'
  | 'notes'
  | 'passwords'
  | 'phone'
  | 'photo-booth'
  | 'photos'
  | 'podcasts'
  | 'reminders'
  | 'safari'
  | 'siri'
  | 'stocks'
  | 'system-settings'
  | 'trash'
  | 'trash-full'
  | 'tv'
  | 'voice-memos'
  | 'weather'
  | 'activity-monitor'
  | 'audio-midi-setup'
  | 'automator'
  | 'bluetooth-file-exchange'
  | 'chess'
  | 'colorsync-utility'
  | 'console'
  | 'dictionary'
  | 'digital-color-meter'
  | 'disk-utility'
  | 'font-book'
  | 'grapher'
  | 'image-capture'
  | 'migration-assistant'
  | 'mission-control'
  | 'preview'
  | 'print-center'
  | 'quicktime-player'
  | 'screen-sharing'
  | 'screenshot'
  | 'script-editor'
  | 'shortcuts'
  | 'stickies'
  | 'system-information'
  | 'terminal'
  | 'textedit'
  | 'time-machine'
  | 'tips'
  | 'voiceover-utility'
  | 'accessibility-reader'
  | 'apple-diagnostics'
  | 'apple-script-utility'
  | 'archive-utility'
  | 'automator-application-stub'
  | 'avb-configurator'
  | 'batteries'
  | 'control-center'
  | 'desk-view'
  | 'directory-utility'
  | 'dock'
  | 'dvd-player'
  | 'erase-assistant'
  | 'expansion-slot-utility'
  | 'feedback-assistant'
  | 'folder-actions-setup'
  | 'game-center'
  | 'games-alt'
  | 'icloud'
  | 'install-command-line-tools'
  | 'installer'
  | 'keychain-access'
  | 'magnifier'
  | 'medical-imaging-calibrator'
  | 'music-recognition'
  | 'pass-viewer'
  | 'pip-agent'
  | 'pro-display-calibrator'
  | 'screen-time'
  | 'setup-assistant'
  | 'spotlight'
  | 'ticket-viewer'
  | 'universal-control'
  | 'wallpaper'
  | 'widgetkit-simulator'
  | 'wireless-diagnostics'
  | 'drive-backup'
  | 'drive-external'
  | 'drive-internal'
  | 'drive-network'
  | 'drive-removable'
  | 'wallet'
  | 'canva'
  | 'google-slides'
  | 'spotify'
  | 'netflix';

export type IconSpec =
  | { kind: 'builtin'; name: BuiltinIconName }
  | { kind: 'catalog'; slug: CatalogIconSlug }
  | { kind: 'image'; url: string };

export type RichTextBlock = { type: 'paragraph'; text: string } | { type: 'heading'; text: string };
export interface RichText {
  blocks: RichTextBlock[];
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface ProjectContent {
  coverUrl: string; // '' = show a gradient placeholder
  tag: string;
  year: string;
  role: string;
  body: RichText;
  gallery: { url: string; caption: string }[];
  links: LinkItem[];
}

export interface DocumentContent {
  fileUrl: string; // '' = "No document uploaded yet"
  fileName: string;
  showDownload: boolean;
}

export interface AboutContent {
  media: { kind: 'image' | 'video'; url: string }; // url '' = person placeholder
  roleTitle: string;
  bio: RichText;
  lists: { heading: string; items: string[] }[];
  quote: { text: string; author: string } | null;
  contactLinks: LinkItem[];
}

export type EmbedKind = 'spotify' | 'youtube' | 'google-slides' | 'canva' | 'generic-iframe';

export interface LinkContent {
  url: string;
  mode: 'open' | 'embed'; // open = new browser tab, embed = iframe inside the window/sheet
  embedKind?: EmbedKind; // filled in by the editor in Plan 4; the UI always re-detects from url
}

export interface EducationItem {
  abbr: string;
  step: string;
  title: string;
  school: string;
  year: string;
  inProgress: boolean;
  progress: number; // 0–100, only shown when inProgress
}

export interface CredentialItem {
  short: string; // 1–3 characters shown on the badge tile when there is no image
  name: string;
  issuer: string;
  year: string;
  desc: string;
  imageUrl?: string;
  verifyUrl?: string;
}

export interface CredentialGroup {
  name: string;
  color: string; // any CSS background value, e.g. a linear-gradient
  items: CredentialItem[];
}

export interface CredentialsContent {
  education: EducationItem[];
  groups: CredentialGroup[];
}

export interface StatsContent {
  heading: string;
  subheading: string;
  steps: { name: string; desc: string }[];
  metrics: { label: string; value: string }[];
  chart: { title: string; bars: { label: string; value: number }[] } | null;
  showAsPhoneWidget: boolean;
}

export interface NoteContent {
  title: string;
  items: { text: string; done: boolean }[];
}

export interface ClockContent {
  city: string; // shown on the widget, e.g. "Boston"
  timeZone: string; // IANA name, e.g. "America/New_York"
  latitude: number | null; // null = no weather
  longitude: number | null;
  showWeather: boolean;
  units: 'fahrenheit' | 'celsius';
}

export interface StatusContent {
  emoji: string;
  headline: string; // e.g. "Open to work"
  detail: string; // e.g. "Product design roles · Remote or NYC"
  color: string; // accent dot / glow colour
}

export interface MessagesContent {
  contactName: string; // shown at the top of the chat, e.g. "Jordan"
  greeting: string; // first bubble visitors see
  /** Tone and extra facts for the AI, e.g. "Warm and brief. I'm relocating to Denver in 2027." */
  persona: string;
  suggestions: string[]; // tappable starter questions
}

export interface GuestbookContent {
  heading: string; // e.g. "Leave me a note!"
  prompt: string; // placeholder in the message box
  /** true = notes stay hidden until the owner approves them in the editor (recommended). */
  requireApproval: boolean;
  /** The owner's own sticker images visitors can put on their note. */
  stickers?: { label: string; url: string }[];
  /** Offer the built-in emoji stickers too (missing = on). */
  emojiStickers?: boolean;
}

export interface FreeformContent {
  prompt: string; // e.g. "Draw me something!"
  /** Let visitors send their drawing to the guestbook as a note. */
  allowSend: boolean;
}

export interface TerminalContent {
  /** First lines printed when the Terminal opens. */
  welcome: string;
  /** Extra commands the owner defines: typing `name` prints `output`. */
  commands: { name: string; output: string }[];
}

export interface PhotosContent {
  /** `link` (optional) makes the photo clickable in the viewer. */
  albums: { name: string; photos: { url: string; caption: string; link?: string }[] }[];
}

export type PlaceKind = 'home' | 'school' | 'work' | 'travel' | 'other';

export interface MapsContent {
  heading: string;
  places: { name: string; detail: string; years: string; kind: PlaceKind; latitude: number; longitude: number }[];
}

export interface CalendarContent {
  heading: string;
  note: string; // e.g. "30-minute intro calls, Tue–Thu"
  bookingUrl: string; // Cal.com / Calendly / Google appointment link
  /** true = show the booking page inside the window (if the site allows it); false = open it in a new tab. */
  embed: boolean;
}

export interface VoiceMemosContent {
  memos: { title: string; url: string; recordedOn: string }[];
}

export interface MailContent {
  /** Leave blank to use the email address in Site settings. */
  to: string;
  subject: string; // pre-filled subject line
  intro: string; // a line shown above the form
}

export interface FaceTimeContent {
  /** Leave blank to use the incoming-call video (Site settings → Incoming call). */
  videoUrl: string;
  subtitle: string; // under the name, e.g. "Usually replies within a day"
}

/** A microcredential, badge, or certificate, shown as an Apple Wallet-style pass. */
export interface BadgePass {
  id: string;
  title: string;
  issuer: string;
  /** Groups passes for the filter chips; defaults to the issuer. */
  category?: string;
  imageUrl?: string;
  issuerLogoUrl?: string;
  /** A certificate PDF (visitors get “View certificate”). */
  certificateUrl?: string;
  /** Where anyone can check it's real (Credly, Digital Promise, Accredible…). */
  verifyUrl?: string;
  earned?: string; // YYYY-MM-DD
  expires?: string; // YYYY-MM-DD
  description?: string;
  skills?: string[];
  level?: string;
  credentialId?: string;
  /** The pass colour; picked from the issuer when empty. */
  color?: string;
  source?: 'credly';
}

export interface WalletContent {
  heading: string;
  message: string;
  /** Badges and microcredentials, shown as Wallet passes. */
  passes?: BadgePass[];
  /** How visitors first see the passes: the Wallet stack or a trophy shelf. */
  view?: 'stack' | 'shelf' | 'timeline';
  /** Show on the desktop and phone as a widget of the newest badges, instead of an icon. */
  showAsWidget?: boolean;
  /** Heading above the payment cards, if there are any. */
  cardsHeading?: string;
  /** Each card links to a payment page; the service (Venmo, PayPal…) is recognised from the URL. */
  cards: { label: string; url: string }[];
}

export interface SocialContent {
  heading: string;
  /** Profile links; the network is recognised from the URL. `label` overrides the shown handle. */
  links: { url: string; label: string }[];
}

export interface PhoneContent {
  label: string; // e.g. "Office"
  number: string; // shown as typed, e.g. "+1 (555) 123-4567"
  hours: string; // e.g. "Mon–Fri, 9–5 ET"
  note: string;
  allowText: boolean; // show a Message (SMS) button
}

export interface GameCenterContent {
  /** Shown at the top of the Game Center window. */
  tagline: string;
  /** Platinum visitors can sign a Hall of Fame (names wait for approval). On unless switched off. */
  hallOfFame?: boolean;
  /** Achievement ids the owner switched off. */
  disabledAchievements?: string[];
  /** The show that plays when a visitor unlocks every achievement. Missing = on, with a default message. */
  finale?: {
    enabled?: boolean;
    rewardMessage?: string;
    rewardLink?: string;
    rewardLinkLabel?: string;
    videoUrl?: string;
    /** Your own song for the credits (uploaded audio). Missing = the built-in tune. */
    songUrl?: string;
    /** false = credits play in silence. Missing = music on. */
    music?: boolean;
  };
}

/** The red bubble on an app's icon. `auto` counts real things (badges in Wallet, achievements left in Game Center). */
export type AppNotification = { mode: 'dot' } | { mode: 'number'; count: number } | { mode: 'auto' };

interface AppBase<T extends AppType, C> {
  id: string;
  type: T;
  title: string;
  icon: IconSpec;
  visible: boolean;
  order: number;
  /** Off when missing. A visitor's bubble clears once they open the app. */
  notification?: AppNotification;
  content: C;
}

export type ProjectApp = AppBase<'project', ProjectContent>;
export type DocumentApp = AppBase<'document', DocumentContent>;
export type AboutApp = AppBase<'about', AboutContent>;
export type LinkApp = AppBase<'link', LinkContent>;
export type CredentialsApp = AppBase<'credentials', CredentialsContent>;
export type StatsApp = AppBase<'stats', StatsContent>;
export type NoteApp = AppBase<'note', NoteContent>;
export type ClockApp = AppBase<'clock', ClockContent>;
export type StatusApp = AppBase<'status', StatusContent>;
export type MessagesApp = AppBase<'messages', MessagesContent>;
export type GuestbookApp = AppBase<'guestbook', GuestbookContent>;
export type FreeformApp = AppBase<'freeform', FreeformContent>;
export type TerminalApp = AppBase<'terminal', TerminalContent>;
export type PhotosApp = AppBase<'photos', PhotosContent>;
export type MapsApp = AppBase<'maps', MapsContent>;
export type CalendarApp = AppBase<'calendar', CalendarContent>;
export type VoiceMemosApp = AppBase<'voicememos', VoiceMemosContent>;
export type GameCenterApp = AppBase<'gamecenter', GameCenterContent>;
export type MailApp = AppBase<'mail', MailContent>;
export type FaceTimeApp = AppBase<'facetime', FaceTimeContent>;
export type WalletApp = AppBase<'wallet', WalletContent>;
export type SocialApp = AppBase<'social', SocialContent>;
export type PhoneApp = AppBase<'phone', PhoneContent>;

export type PortfolioApp =
  | ProjectApp
  | DocumentApp
  | AboutApp
  | LinkApp
  | CredentialsApp
  | StatsApp
  | NoteApp
  | ClockApp
  | StatusApp
  | MessagesApp
  | GuestbookApp
  | FreeformApp
  | TerminalApp
  | PhotosApp
  | MapsApp
  | CalendarApp
  | VoiceMemosApp
  | GameCenterApp
  | MailApp
  | FaceTimeApp
  | WalletApp
  | SocialApp
  | PhoneApp;

export type WallpaperPreset = 'sky' | 'paper' | 'grid' | 'dusk';

/** action strings: "openApp:<appId>" or "url:<href>" (href may be https:, mailto:, tel:, sms:) */
/** Built-in pieces of the desktop menu bar that the owner can switch off. */
/** Tiles in the visitor's Control Center. */
export type ControlCenterTile = 'darkMode' | 'airdrop' | 'nightShift' | 'focus' | 'nowPlaying' | 'display';

export type MenuBarPart = 'name' | 'search' | 'controlCenter' | 'date' | 'clock';

export interface MenuItem {
  label: string;
  action: string;
}

/** Looks for the headline on the wallpaper. Every field is optional; missing = the original look. */
export interface HeadlineStyle {
  color?: string; // '' or missing = matches the wallpaper
  font?: 'serif' | 'sans' | 'mono'; // legacy: the editor no longer writes it; SiteStyle.headingFont wins when set
  size?: number; // percent, 50–150
  position?: 'top' | 'center' | 'bottom';
  shadow?: boolean; // helps on photo wallpapers
  italicSmallLine?: boolean; // missing = true
  showName?: boolean; // missing = true
}

/** One stop of the guided tour: a deep link to open, and what to say while it's open. */
export interface TourStop {
  open: string; // deep-link `open` value (app slug or id)
  item?: string; // deep-link `item` value (a badge or photo)
  caption: string; // ≤ 90 characters, shown in a pill while the stop plays
  seconds?: number; // how long the window stays open; missing = 6 (3–12)
}

export interface TourSettings {
  stops: TourStop[] | null; // null = the default generated from the published apps
  autoplay?: boolean; // first-time visitors, after 4 s idle; missing = off
  stopOnMove?: boolean; // desktop: moving the mouse stops the tour; missing = on. Off: the cursor stays and the bar gets Pause/Stop
  showButton?: boolean; // the desktop "Take the 60-second tour" pill; missing = on
}

/** The six screen savers (src/lib/screensavers). */
export type ScreensaverModuleId = 'hello' | 'drift' | 'memories' | 'facts' | 'flurry' | 'bounce';

export type HotCorner = 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** The lock screen after the screen saver. Every field is optional; missing = the default. */
export interface LockSettings {
  enabled?: boolean; // show the lock step after the screen saver; missing = on
  ownerName?: string; // missing = the site owner's name
  avatarUrl?: string; // missing = the About Me photo (or initials)
  guest?: boolean; // the Guest tile; missing = on (always on with no password)
  password?: string | null; // missing = 'hello'; null or blank = no password (Guest only)
  hint?: string; // missing = "it’s how you say hi 👋"
  notifications?: { missedCall?: boolean; newestBadge?: boolean; guestbook?: boolean; nowPlaying?: boolean }; // each missing = on
}

export interface ScreensaverSettings {
  enabled?: boolean; // the whole feature; missing = on
  idleMinutes?: number; // missing = 2, allowed 1–30
  hotCorner?: HotCorner; // missing = 'none'
  pinned?: ScreensaverModuleId | null; // always that one; null/missing = shuffle
  modules?: Partial<Record<ScreensaverModuleId, { on?: boolean; settings?: unknown }>>; // missing = on + generated defaults
  lock?: LockSettings;
}

/** Fonts (and, later, the icon pack) picked in Site settings → Style. Every field is optional; missing = the original look. */
export interface SiteStyle {
  headingFont?: string; // a font id from src/lib/fonts.ts
  bodyFont?: string; // a font id from src/lib/fonts.ts
}

export interface SiteSettings {
  ownerName: string;
  email: string;
  socialLinks: LinkItem[];
  /** `showOnPhone`: also draw it behind the phone home screen (missing = off). */
  headline: { show: boolean; showOnPhone?: boolean; line1: string; line2: string; style?: HeadlineStyle };
  /** For images, `tone` is how bright the picture is (measured on upload; missing = treat as dark → white text). */
  wallpaper: { kind: 'preset'; preset: WallpaperPreset } | { kind: 'image'; imageUrl: string; tone?: 'light' | 'dark' };
  accent: string; // hex colour
  /** Fonts picked in Site settings → Style. Missing = Instrument Serif headline, Geist body. */
  style?: SiteStyle;
  /** Default look for visitors; they can switch it in Control Center. Missing = 'light'. */
  appearance?: 'light' | 'dark' | 'auto';
  clock24: boolean;
  menuBar: {
    items: MenuItem[];
    hide?: MenuBarPart[];
    /** What sits left of your name: the accent-coloured dot (default), an icon or image, or nothing. */
    logo?: { kind: 'dot' } | { kind: 'none' } | { kind: 'icon'; icon: IconSpec };
  };
  /** Show what the owner is listening to on Spotify in Control Center (once Spotify is connected). */
  nowPlaying?: boolean;
  /** Control Center tiles the owner switched off. */
  controlCenter?: { hide?: ControlCenterTile[] };
  /** The “page not found” page: a background photo, a message, and the hidden runner game. */
  notFound?: { message?: string; imageUrl?: string; game?: boolean };
  /** The guided tour. Missing = the generated default, button on, autoplay off. */
  tour?: TourSettings;
  /** The screen saver and lock screen. Missing = on, 2 minutes, shuffle, lock with Guest and the password "hello". */
  screensaver?: ScreensaverSettings;
  incomingCall: {
    enabled: boolean;
    delaySec: number;
    callerName: string;
    imageUrl?: string;
    /** When set, answering opens a FaceTime screen that plays this video; hanging up then runs answerAction. */
    videoUrl?: string;
    answerAction: string;
  };
  seo: { title: string; description: string; ogImageUrl?: string };
  /** Optional custom favicon / home-screen icon; otherwise one is drawn from your initials and accent colour. */
  iconUrl?: string;
  updatedAt: string; // ISO 8601
}

/** iOS-style widget sizes: small = 2×2, medium = 4×2, large = 4×4 on the phone grid. */
export type WidgetSize = 'small' | 'medium' | 'large';

export interface DesktopPlacement {
  appId: string;
  /** Widgets only; missing = 'small' (sticky notes: 'medium'). */
  size?: WidgetSize;
  xPct: number; // 0–100, left edge as % of desktop area width
  yPct: number; // 0–100, top edge as % of desktop area height
}

export type DockEntry =
  | { kind: 'app'; appId: string }
  | { kind: 'url'; url: string; label: string; iconUrl?: string }
  | { kind: 'separator' };

export interface PhoneSlot {
  appId: string;
  size: '1x1' | '2x2' | '4x2' | '4x4';
}

export interface PhoneOverrides {
  pages: PhoneSlot[][];
  dock: string[]; // app ids, max 4
}

export interface Layout {
  desktop: {
    icons: DesktopPlacement[];
    widgets: DesktopPlacement[];
    dock: DockEntry[];
  };
  phone: { overrides: PhoneOverrides | null }; // null = auto-generate
}

export interface SiteData {
  site: SiteSettings;
  apps: PortfolioApp[];
  layout: Layout;
}
