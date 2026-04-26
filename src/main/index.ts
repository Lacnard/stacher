import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron';
import { join } from 'node:path';
import { registerIpc } from './ipc';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.on('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (!app.isPackaged && devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

function createTray(win: BrowserWindow): void {
  try {
    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip('Stacher');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Show Stacher', click: () => win.show() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
      ])
    );
    tray.on('click', () => win.show());
  } catch {
    // Tray creation is best-effort; skip on failure.
  }
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  registerIpc(mainWindow);
  createTray(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      registerIpc(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
