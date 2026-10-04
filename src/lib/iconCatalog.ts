import type { BuiltinIconName, CatalogIconSlug } from './types';

export type { CatalogIconSlug } from './types';

export interface CatalogIcon {
  slug: CatalogIconSlug;
  label: string;
  category: 'system' | 'utilities' | 'media' | 'productivity' | 'drives';
}

/** Real macOS-style icon artwork bundled from the local `macos 27 icons/` folder. See Task 1's Global Constraints note on sourcing. */
export const CATALOG_ICONS: CatalogIcon[] = [
  { slug: 'app-store', label: 'App Store', category: 'system' },
  { slug: 'apps', label: 'Apps', category: 'system' },
  { slug: 'books', label: 'Books', category: 'media' },
  { slug: 'calculator', label: 'Calculator', category: 'utilities' },
  { slug: 'calendar', label: 'Calendar', category: 'productivity' },
  { slug: 'clock', label: 'Clock', category: 'utilities' },
  { slug: 'contacts', label: 'Contacts', category: 'productivity' },
  { slug: 'facetime', label: 'FaceTime', category: 'productivity' },
  { slug: 'find-my', label: 'Find My', category: 'system' },
  { slug: 'finder', label: 'Finder', category: 'system' },
  { slug: 'freeform', label: 'Freeform', category: 'productivity' },
  { slug: 'games', label: 'Games', category: 'media' },
  { slug: 'home', label: 'Home', category: 'productivity' },
  { slug: 'image-playground', label: 'Image Playground', category: 'media' },
  { slug: 'iphone-mirroring', label: 'iPhone Mirroring', category: 'system' },
  { slug: 'journal', label: 'Journal', category: 'productivity' },
  { slug: 'mail', label: 'Mail', category: 'productivity' },
  { slug: 'maps', label: 'Maps', category: 'system' },
  { slug: 'messages', label: 'Messages', category: 'productivity' },
  { slug: 'music', label: 'Music', category: 'media' },
  { slug: 'news', label: 'News', category: 'media' },
  { slug: 'notes', label: 'Notes', category: 'productivity' },
  { slug: 'passwords', label: 'Passwords', category: 'system' },
  { slug: 'phone', label: 'Phone', category: 'productivity' },
  { slug: 'photo-booth', label: 'Photo Booth', category: 'media' },
  { slug: 'photos', label: 'Photos', category: 'media' },
  { slug: 'podcasts', label: 'Podcasts', category: 'media' },
  { slug: 'reminders', label: 'Reminders', category: 'productivity' },
  { slug: 'safari', label: 'Safari', category: 'system' },
  { slug: 'siri', label: 'Siri', category: 'system' },
  { slug: 'stocks', label: 'Stocks', category: 'productivity' },
  { slug: 'system-settings', label: 'System Settings', category: 'system' },
  { slug: 'trash', label: 'Trash', category: 'system' },
  { slug: 'trash-full', label: 'Trash (Full)', category: 'system' },
  { slug: 'tv', label: 'TV', category: 'media' },
  { slug: 'voice-memos', label: 'Voice Memos', category: 'utilities' },
  { slug: 'weather', label: 'Weather', category: 'productivity' },
  { slug: 'activity-monitor', label: 'Activity Monitor', category: 'utilities' },
  { slug: 'audio-midi-setup', label: 'Audio MIDI Setup', category: 'utilities' },
  { slug: 'automator', label: 'Automator', category: 'utilities' },
  { slug: 'bluetooth-file-exchange', label: 'Bluetooth File Exchange', category: 'utilities' },
  { slug: 'chess', label: 'Chess', category: 'utilities' },
  { slug: 'colorsync-utility', label: 'ColorSync Utility', category: 'utilities' },
  { slug: 'console', label: 'Console', category: 'utilities' },
  { slug: 'dictionary', label: 'Dictionary', category: 'utilities' },
  { slug: 'digital-color-meter', label: 'Digital Color Meter', category: 'utilities' },
  { slug: 'disk-utility', label: 'Disk Utility', category: 'utilities' },
  { slug: 'font-book', label: 'Font Book', category: 'utilities' },
  { slug: 'grapher', label: 'Grapher', category: 'utilities' },
  { slug: 'image-capture', label: 'Image Capture', category: 'utilities' },
  { slug: 'migration-assistant', label: 'Migration Assistant', category: 'utilities' },
  { slug: 'mission-control', label: 'Mission Control', category: 'utilities' },
  { slug: 'preview', label: 'Preview', category: 'utilities' },
  { slug: 'print-center', label: 'Print Center', category: 'utilities' },
  { slug: 'quicktime-player', label: 'QuickTime Player', category: 'utilities' },
  { slug: 'screen-sharing', label: 'Screen Sharing', category: 'utilities' },
  { slug: 'screenshot', label: 'Screenshot', category: 'utilities' },
  { slug: 'script-editor', label: 'Script Editor', category: 'utilities' },
  { slug: 'shortcuts', label: 'Shortcuts', category: 'utilities' },
  { slug: 'stickies', label: 'Stickies', category: 'utilities' },
  { slug: 'system-information', label: 'System Information', category: 'utilities' },
  { slug: 'terminal', label: 'Terminal', category: 'utilities' },
  { slug: 'textedit', label: 'TextEdit', category: 'utilities' },
  { slug: 'time-machine', label: 'Time Machine', category: 'utilities' },
  { slug: 'tips', label: 'Tips', category: 'utilities' },
  { slug: 'voiceover-utility', label: 'VoiceOver Utility', category: 'utilities' },
  { slug: 'accessibility-reader', label: 'Accessibility Reader', category: 'system' },
  { slug: 'apple-diagnostics', label: 'Apple Diagnostics', category: 'system' },
  { slug: 'apple-script-utility', label: 'AppleScript Utility', category: 'system' },
  { slug: 'archive-utility', label: 'Archive Utility', category: 'system' },
  { slug: 'automator-application-stub', label: 'Automator Application Stub', category: 'system' },
  { slug: 'avb-configurator', label: 'AVB Configurator', category: 'system' },
  { slug: 'batteries', label: 'Batteries', category: 'system' },
  { slug: 'control-center', label: 'Control Center', category: 'system' },
  { slug: 'desk-view', label: 'Desk View', category: 'system' },
  { slug: 'directory-utility', label: 'Directory Utility', category: 'system' },
  { slug: 'dock', label: 'Dock', category: 'system' },
  { slug: 'dvd-player', label: 'DVD Player', category: 'system' },
  { slug: 'erase-assistant', label: 'Erase Assistant', category: 'system' },
  { slug: 'expansion-slot-utility', label: 'Expansion Slot Utility', category: 'system' },
  { slug: 'feedback-assistant', label: 'Feedback Assistant', category: 'system' },
  { slug: 'folder-actions-setup', label: 'Folder Actions Setup', category: 'system' },
  { slug: 'game-center', label: 'Game Center', category: 'system' },
  { slug: 'games-alt', label: 'Games (Alt)', category: 'system' },
  { slug: 'icloud', label: 'iCloud', category: 'system' },
  { slug: 'install-command-line-tools', label: 'Install Command Line Tools', category: 'system' },
  { slug: 'installer', label: 'Installer', category: 'system' },
  { slug: 'keychain-access', label: 'Keychain Access', category: 'system' },
  { slug: 'magnifier', label: 'Magnifier', category: 'system' },
  { slug: 'medical-imaging-calibrator', label: 'Medical Imaging Calibrator', category: 'system' },
  { slug: 'music-recognition', label: 'Music Recognition', category: 'system' },
  { slug: 'pass-viewer', label: 'Pass Viewer', category: 'system' },
  { slug: 'pip-agent', label: 'PiP Agent', category: 'system' },
  { slug: 'pro-display-calibrator', label: 'Pro Display Calibrator', category: 'system' },
  { slug: 'screen-time', label: 'Screen Time', category: 'system' },
  { slug: 'setup-assistant', label: 'Setup Assistant', category: 'system' },
  { slug: 'spotlight', label: 'Spotlight', category: 'system' },
  { slug: 'ticket-viewer', label: 'Ticket Viewer', category: 'system' },
  { slug: 'universal-control', label: 'Universal Control', category: 'system' },
  { slug: 'wallpaper', label: 'Wallpaper', category: 'system' },
  { slug: 'widgetkit-simulator', label: 'WidgetKit Simulator', category: 'system' },
  { slug: 'wireless-diagnostics', label: 'Wireless Diagnostics', category: 'system' },
  { slug: 'drive-backup', label: 'Backup Drive', category: 'drives' },
  { slug: 'drive-external', label: 'External Drive', category: 'drives' },
  { slug: 'drive-internal', label: 'Internal Drive', category: 'drives' },
  { slug: 'drive-network', label: 'Network', category: 'drives' },
  { slug: 'drive-removable', label: 'Removable Drive', category: 'drives' },
  { slug: 'wallet', label: 'Wallet', category: 'system' },
  { slug: 'canva', label: 'Canva', category: 'productivity' },
  { slug: 'google-slides', label: 'Google Slides', category: 'productivity' },
  { slug: 'spotify', label: 'Spotify', category: 'media' },
  { slug: 'netflix', label: 'Netflix', category: 'media' },
];

/** The catalog icon each legacy CSS/lucide builtin name maps to, used to migrate seed content. */
export const DEFAULT_CATALOG_FOR_BUILTIN: Record<BuiltinIconName, CatalogIconSlug> = {
  folder: 'finder',
  file: 'preview',
  note: 'stickies',
  person: 'contacts',
  chart: 'stocks',
  badge: 'passwords',
  link: 'safari',
  music: 'music',
  mail: 'mail',
  globe: 'maps',
};

export function catalogIconUrl(slug: CatalogIconSlug): string {
  // WebP copies of the PNGs (about 1/6 the size). The PNGs stay for links saved with their old URLs.
  return `/icons/catalog/${slug}.webp`;
}

export type CatalogCategory = CatalogIcon['category'];

export const CATALOG_CATEGORIES: { id: CatalogCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'media', label: 'Media' },
  { id: 'system', label: 'System' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'drives', label: 'Drives' },
];

/** Icons in `category` whose label or slug contains `query` (case-insensitive). */
export function filterIcons(query: string, category: CatalogCategory | 'all'): CatalogIcon[] {
  const q = query.trim().toLowerCase();
  return CATALOG_ICONS.filter(
    (icon) => (category === 'all' || icon.category === category) && (!q || icon.label.toLowerCase().includes(q) || icon.slug.includes(q)),
  );
}
