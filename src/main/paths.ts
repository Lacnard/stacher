import { app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const isPackaged = app.isPackaged;

function resolveBinary(name: string): string {
  if (isPackaged) {
    return join(process.resourcesPath, name);
  }
  return join(app.getAppPath(), 'resources', name);
}

export function defaultYtdlpPath(): string {
  return resolveBinary('yt-dlp.exe');
}

export function defaultFfmpegPath(): string {
  return resolveBinary('ffmpeg.exe');
}

export function binaryExists(path: string): boolean {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

export function defaultDownloadsFolder(): string {
  return app.getPath('downloads');
}

export function userDataFile(name: string): string {
  return join(app.getPath('userData'), name);
}
