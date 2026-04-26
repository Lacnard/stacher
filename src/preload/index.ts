import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '@shared/ipcChannels';
import type {
  AppSettings,
  DownloadItem,
  DownloadLogEvent,
  DownloadProgressEvent,
  DownloadRequest,
  DownloadStatusEvent,
  HistoryEntry,
  SiteCredential,
  SiteCredentialInput,
  YtdlpInfo,
  YtdlpUpdateInfo
} from '@shared/types';

const invoke = ipcRenderer.invoke.bind(ipcRenderer);

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

export const api = {
  downloads: {
    start: (req: DownloadRequest) => invoke(IPC.DownloadStart, req) as Promise<DownloadItem[]>,
    pause: (id: string) => invoke(IPC.DownloadPause, id) as Promise<void>,
    resume: (id: string) => invoke(IPC.DownloadResume, id) as Promise<void>,
    cancel: (id: string) => invoke(IPC.DownloadCancel, id) as Promise<void>,
    retry: (id: string) => invoke(IPC.DownloadRetry, id) as Promise<void>,
    list: () => invoke(IPC.DownloadList) as Promise<DownloadItem[]>,
    clear: () => invoke(IPC.DownloadClear) as Promise<void>,
    onProgress: (cb: (e: DownloadProgressEvent) => void) => on(IPC.DownloadProgress, cb),
    onStatus: (cb: (e: DownloadStatusEvent) => void) => on(IPC.DownloadStatus, cb),
    onLog: (cb: (e: DownloadLogEvent) => void) => on(IPC.DownloadLog, cb)
  },
  settings: {
    get: () => invoke(IPC.SettingsGet) as Promise<AppSettings>,
    set: (patch: Partial<AppSettings>) =>
      invoke(IPC.SettingsSet, patch) as Promise<AppSettings>,
    pickFolder: () => invoke(IPC.SettingsPickFolder) as Promise<string | null>
  },
  credentials: {
    list: () => invoke(IPC.CredentialsList) as Promise<SiteCredential[]>,
    set: (input: SiteCredentialInput) =>
      invoke(IPC.CredentialsSet, input) as Promise<SiteCredential>,
    delete: (domain: string) => invoke(IPC.CredentialsDelete, domain) as Promise<void>
  },
  history: {
    list: (limit?: number, offset?: number) =>
      invoke(IPC.HistoryGet, limit, offset) as Promise<HistoryEntry[]>,
    search: (q: string) => invoke(IPC.HistorySearch, q) as Promise<HistoryEntry[]>,
    delete: (id: number) => invoke(IPC.HistoryDelete, id) as Promise<void>,
    openFile: (path: string) => invoke(IPC.HistoryOpenFile, path) as Promise<string>,
    openFolder: (path: string) => invoke(IPC.HistoryOpenFolder, path) as Promise<string>,
    exists: (path: string) => invoke(IPC.HistoryFileExists, path) as Promise<boolean>
  },
  ytdlp: {
    checkUpdate: () => invoke(IPC.YtdlpUpdateCheck) as Promise<YtdlpUpdateInfo>,
    runUpdate: () => invoke(IPC.YtdlpUpdateRun) as Promise<string>,
    fetchInfo: (url: string) => invoke(IPC.YtdlpFetchInfo, url) as Promise<Record<string, unknown>>,
    preview: (url: string) => invoke(IPC.YtdlpPreview, url) as Promise<YtdlpInfo>,
    version: () => invoke(IPC.YtdlpVersion) as Promise<string | null>
  },
  window: {
    minimize: () => invoke(IPC.WindowMinimize) as Promise<void>,
    toggleMaximize: () => invoke(IPC.WindowToggleMaximize) as Promise<void>,
    close: () => invoke(IPC.WindowClose) as Promise<void>,
    isMaximized: () => invoke(IPC.WindowIsMaximized) as Promise<boolean>,
    onMaximizeChanged: (cb: (maximized: boolean) => void) =>
      on<boolean>(IPC.WindowMaximizeChanged, cb)
  }
};

export type StacherAPI = typeof api;

contextBridge.exposeInMainWorld('stacher', api);
