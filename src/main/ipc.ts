import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { IPC } from '@shared/ipcChannels';
import type {
  DownloadRequest,
  SiteCredentialInput,
  AppSettings
} from '@shared/types';
import { queue } from './queue';
import { getSettings, setSettings } from './settings';
import {
  deleteCredential,
  listCredentials,
  upsertCredential
} from './credentials';
import {
  deleteHistory,
  listHistory,
  searchHistory
} from './history';
import { checkYtdlpUpdate, runYtdlpSelfUpdate } from './updater';
import { fetchInfo, getYtdlpVersion, previewInfo } from './downloader';

export function registerIpc(window: BrowserWindow): void {
  // Bridge queue events → renderer
  queue.on('progress', (e) => window.webContents.send(IPC.DownloadProgress, e));
  queue.on('status', (e) => window.webContents.send(IPC.DownloadStatus, e));
  queue.on('log', (e) => window.webContents.send(IPC.DownloadLog, e));

  // Download control
  ipcMain.handle(IPC.DownloadStart, (_e, req: DownloadRequest) => queue.enqueue(req));
  ipcMain.handle(IPC.DownloadPause, (_e, id: string) => queue.pause(id));
  ipcMain.handle(IPC.DownloadResume, (_e, id: string) => queue.resume(id));
  ipcMain.handle(IPC.DownloadCancel, (_e, id: string) => queue.cancel(id));
  ipcMain.handle(IPC.DownloadRetry, (_e, id: string) => queue.retry(id));
  ipcMain.handle(IPC.DownloadList, () => queue.list());
  ipcMain.handle(IPC.DownloadClear, () => queue.clearCompleted());

  // Settings
  ipcMain.handle(IPC.SettingsGet, () => getSettings());
  ipcMain.handle(IPC.SettingsSet, (_e, patch: Partial<AppSettings>) => setSettings(patch));
  ipcMain.handle(IPC.SettingsPickFolder, async () => {
    const res = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // Credentials
  ipcMain.handle(IPC.CredentialsList, () => listCredentials());
  ipcMain.handle(IPC.CredentialsSet, (_e, input: SiteCredentialInput) => upsertCredential(input));
  ipcMain.handle(IPC.CredentialsDelete, (_e, domain: string) => deleteCredential(domain));

  // History
  ipcMain.handle(IPC.HistoryGet, (_e, limit?: number, offset?: number) =>
    listHistory(limit, offset)
  );
  ipcMain.handle(IPC.HistorySearch, (_e, query: string) => searchHistory(query));
  ipcMain.handle(IPC.HistoryDelete, (_e, id: number) => deleteHistory(id));
  ipcMain.handle(IPC.HistoryOpenFile, (_e, path: string) => shell.openPath(path));
  ipcMain.handle(IPC.HistoryOpenFolder, (_e, path: string) => shell.openPath(dirname(path)));
  ipcMain.handle(IPC.HistoryFileExists, async (_e, path: string) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });

  // yt-dlp helpers
  ipcMain.handle(IPC.YtdlpUpdateCheck, () => checkYtdlpUpdate());
  ipcMain.handle(IPC.YtdlpUpdateRun, () => runYtdlpSelfUpdate());
  ipcMain.handle(IPC.YtdlpFetchInfo, (_e, url: string) => fetchInfo(url));
  ipcMain.handle(IPC.YtdlpPreview, (_e, url: string) => previewInfo(url));
  ipcMain.handle(IPC.YtdlpVersion, () => getYtdlpVersion());

  // Window controls
  ipcMain.handle(IPC.WindowMinimize, () => window.minimize());
  ipcMain.handle(IPC.WindowToggleMaximize, () => {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.handle(IPC.WindowClose, () => window.close());
  ipcMain.handle(IPC.WindowIsMaximized, () => window.isMaximized());

  const sendMaximizeState = () =>
    window.webContents.send(IPC.WindowMaximizeChanged, window.isMaximized());
  window.on('maximize', sendMaximizeState);
  window.on('unmaximize', sendMaximizeState);
}
