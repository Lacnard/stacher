export const IPC = {
  // Download control
  DownloadStart: 'download:start',
  DownloadPause: 'download:pause',
  DownloadResume: 'download:resume',
  DownloadCancel: 'download:cancel',
  DownloadRetry: 'download:retry',
  DownloadList: 'download:list',
  DownloadClear: 'download:clear',

  // Download events (main → renderer)
  DownloadProgress: 'download:progress',
  DownloadStatus: 'download:status',
  DownloadLog: 'download:log',

  // Settings
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsPickFolder: 'settings:pick-folder',

  // Credentials
  CredentialsList: 'credentials:list',
  CredentialsSet: 'credentials:set',
  CredentialsDelete: 'credentials:delete',

  // History
  HistoryGet: 'history:get',
  HistorySearch: 'history:search',
  HistoryDelete: 'history:delete',
  HistoryOpenFile: 'history:open-file',
  HistoryOpenFolder: 'history:open-folder',
  HistoryFileExists: 'history:file-exists',

  // yt-dlp helpers
  YtdlpUpdateCheck: 'ytdlp:update-check',
  YtdlpUpdateRun: 'ytdlp:update-run',
  YtdlpFetchInfo: 'ytdlp:fetch-info',
  YtdlpPreview: 'ytdlp:preview',
  YtdlpVersion: 'ytdlp:version',

  // System
  SystemToast: 'system:toast',

  // Window controls
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggle-maximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:is-maximized',
  WindowMaximizeChanged: 'window:maximize-changed'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
