import Store from 'electron-store';
import type { AppSettings } from '@shared/types';
import { defaultDownloadsFolder } from './paths';

let _store: Store<AppSettings> | null = null;

function store(): Store<AppSettings> {
  if (_store) return _store;
  _store = new Store<AppSettings>({
    name: 'settings',
    defaults: {
      ytdlpPath: null,
      ffmpegPath: null,
      defaultOutputFolder: defaultDownloadsFolder(),
      filenameTemplate: '%(title)s [%(id)s].%(ext)s',
      maxConcurrent: 3,
      maxRetries: 2,
      rateLimit: null,
      proxy: null,
      theme: 'dark',
      cookiesFromBrowser: 'none',
      sponsorblock: false,
      subtitles: false,
      subtitleLang: 'en',
      defaultProfileId: 'best-video',
      skipUrlPreview: false
    }
  });
  return _store;
}

export function getSettings(): AppSettings {
  return store().store;
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const s = store();
  for (const [k, v] of Object.entries(patch)) {
    s.set(k as keyof AppSettings, v as never);
  }
  return s.store;
}
