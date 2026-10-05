// Shapes shared by the server (config, routes, store) and the editor. No Node imports here: the editor uses it.

export type AddonId = 'chat' | 'spotify';

/** An AES-256-GCM sealed value (base64 fields). Only the server can open it. */
export interface Encrypted {
  v: 1;
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

/** What the store keeps for add-ons (Postgres `documents` secret/addons, Firestore `private/addons`). */
export interface StoredAddons {
  anthropicKey?: Encrypted;
  /** The client ID isn't secret, so it is kept as plain text. */
  spotify?: { clientId: string; clientSecret: Encrypted };
  updatedAt: string; // ISO 8601
}

export interface ChatStatus {
  /** env: set by the hosting's ANTHROPIC_API_KEY. reenter: a saved key that the current SETUP_CODE can't open. */
  state: 'off' | 'on' | 'env' | 'reenter';
  /** The saved key's last four characters (state on only). */
  hint?: string;
}

export interface SpotifyStatus {
  /** credentials: keys saved, Spotify not connected yet. connected: keys saved and connected. */
  state: 'off' | 'credentials' | 'connected' | 'env' | 'reenter';
  /** Whether a Spotify account is connected (also for env). */
  connected: boolean;
}

export interface AddonStatus {
  chat: ChatStatus;
  spotify: SpotifyStatus;
  /** False without a usable SETUP_CODE: keys can't be saved (they are encrypted with it). */
  canStore: boolean;
}

/** GET /api/owner/addons (and every POST/DELETE reply). Never contains a key. */
export interface AddonsResponse extends AddonStatus {
  /** What to paste into the Spotify app's settings: <origin>/api/spotify/callback. */
  redirectUri: string;
}

/** Which add-ons the hosting's environment variables set. All the editor knows on Firebase and in local mode. */
export interface HostingAddons {
  chat: boolean;
  spotify: boolean;
}

export const isChatOn = (chat: ChatStatus) => chat.state === 'on' || chat.state === 'env';
