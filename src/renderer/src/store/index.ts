import { create } from 'zustand';
import type {
  AppSettings,
  DownloadItem,
  SiteCredential
} from '@shared/types';

interface Toast {
  id: string;
  kind: 'info' | 'success' | 'error';
  message: string;
}

export type HistoryDateFilter = 'all' | 'today' | '7d' | '30d';

export interface HistoryFilters {
  date: HistoryDateFilter;
  format: string;
  domain: string;
}

interface Store {
  settings: AppSettings | null;
  downloads: DownloadItem[];
  credentials: SiteCredential[];
  toasts: Toast[];
  historyFilters: HistoryFilters;

  hydrate: () => Promise<void>;
  refreshDownloads: () => Promise<void>;
  refreshCredentials: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setHistoryFilters: (patch: Partial<HistoryFilters>) => void;

  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useStore = create<Store>((set, get) => ({
  settings: null,
  downloads: [],
  credentials: [],
  toasts: [],
  historyFilters: { date: 'all', format: 'all', domain: 'all' },

  hydrate: async () => {
    const api = window.stacher;
    const [settings, downloads, credentials] = await Promise.all([
      api.settings.get(),
      api.downloads.list(),
      api.credentials.list()
    ]);
    set({ settings, downloads, credentials });

    // Live event listeners
    api.downloads.onProgress((e) => {
      set((s) => ({
        downloads: s.downloads.map((d) =>
          d.id === e.id
            ? { ...d, progress: e.progress, speed: e.speed, eta: e.eta, size: e.size }
            : d
        )
      }));
    });

    api.downloads.onStatus((e) => {
      set((s) => {
        const downloads = s.downloads.map((d) =>
          d.id === e.id
            ? {
                ...d,
                status: e.status,
                title: e.title ?? d.title,
                thumbnail: e.thumbnail ?? d.thumbnail,
                outputPath: e.outputPath ?? d.outputPath,
                errorMessage: e.errorMessage ?? d.errorMessage,
                attempt: e.attempt ?? d.attempt
              }
            : d
        );

        const toasts = [...s.toasts];
        if (e.status === 'completed') {
          toasts.push({
            id: crypto.randomUUID(),
            kind: 'success',
            message: `Completed: ${e.title ?? e.id}`
          });
        } else if (e.status === 'failed') {
          toasts.push({
            id: crypto.randomUUID(),
            kind: 'error',
            message: `Failed: ${e.errorMessage ?? e.id}`
          });
        }
        return { downloads, toasts };
      });

      // Refresh list if an item is new (not in current store)
      if (!get().downloads.find((d) => d.id === e.id)) {
        void get().refreshDownloads();
      }
    });
  },

  refreshDownloads: async () => {
    const downloads = await window.stacher.downloads.list();
    set({ downloads });
  },

  refreshCredentials: async () => {
    const credentials = await window.stacher.credentials.list();
    set({ credentials });
  },

  updateSettings: async (patch) => {
    const settings = await window.stacher.settings.set(patch);
    set({ settings });
  },

  setHistoryFilters: (patch) =>
    set((s) => ({ historyFilters: { ...s.historyFilters, ...patch } })),

  pushToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: crypto.randomUUID() }] })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
}));
