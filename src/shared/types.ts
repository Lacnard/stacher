export type DownloadStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProfileId =
  | 'best-video'
  | 'audio-mp3'
  | 'audio-flac'
  | 'audio-m4a'
  | 'video-4k'
  | 'video-1080p'
  | 'video-720p'
  | 'video-480p'
  | 'custom';

export interface FormatProfile {
  id: ProfileId;
  label: string;
  description: string;
  args: string[];
}

export interface DownloadRequest {
  urls: string[];
  profileId: ProfileId;
  customArgs?: string[];
  outputFolder?: string;
  filenameTemplate?: string;
  subtitles?: boolean;
  subtitleLang?: string;
  sponsorblock?: boolean;
  cookiesFromBrowser?: CookieBrowser;
  cookiesFile?: string;
  netrc?: boolean;
  credentialDomain?: string;
}

export type CookieBrowser = 'chrome' | 'firefox' | 'edge' | 'brave' | 'opera' | 'vivaldi' | 'none';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  status: DownloadStatus;
  profileId: ProfileId;
  progress: number; // 0-100
  speed?: string;
  eta?: string;
  size?: string;
  outputPath?: string;
  errorMessage?: string;
  attempt: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
}

export interface DownloadProgressEvent {
  id: string;
  progress: number;
  speed?: string;
  eta?: string;
  size?: string;
}

export interface DownloadStatusEvent {
  id: string;
  status: DownloadStatus;
  title?: string;
  thumbnail?: string;
  outputPath?: string;
  errorMessage?: string;
  attempt?: number;
}

export interface DownloadLogEvent {
  id: string;
  line: string;
  stream: 'stdout' | 'stderr';
}

export interface AppSettings {
  ytdlpPath: string | null;     // null → use bundled
  ffmpegPath: string | null;
  defaultOutputFolder: string;
  filenameTemplate: string;
  maxConcurrent: number;
  maxRetries: number;
  rateLimit: string | null;     // e.g. "2M" | null
  proxy: string | null;
  theme: 'dark' | 'light';
  cookiesFromBrowser: CookieBrowser;
  sponsorblock: boolean;
  subtitles: boolean;
  subtitleLang: string;
  defaultProfileId: ProfileId;
  skipUrlPreview: boolean;
}

export interface SiteCredential {
  domain: string;
  // secret values are encrypted at rest via Electron safeStorage; never sent
  // to renderer in plaintext. Renderer only sees `hasSecret: true`.
  hasSecret: boolean;
  username?: string;
  updatedAt: number;
}

export interface SiteCredentialInput {
  domain: string;
  username?: string;
  password?: string;
  cookiesPath?: string;
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  thumbnail_url: string | null;
  status: DownloadStatus;
  format: string;
  output_path: string | null;
  date: number;
  duration: number | null;
  filesize: number | null;
}

export interface YtdlpInfo {
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  formats?: Array<{ format_id: string; ext: string; resolution?: string; filesize?: number }>;
  sourceDomain?: string;
  isPlaylist?: boolean;
  playlistCount?: number;
  qualityLabels?: string[]; // e.g. ["2160p", "1080p", "720p", "audio"]
}

export type PreviewErrorCode = 'private' | 'unsupported' | 'network' | 'binary-missing' | 'unknown';

export interface PreviewError {
  code: PreviewErrorCode;
  message: string;
}

export interface YtdlpUpdateInfo {
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
}
