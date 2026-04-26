import { spawn } from 'node:child_process';
import { net } from 'electron';
import type { YtdlpUpdateInfo } from '@shared/types';
import { getYtdlpVersion } from './downloader';
import { getSettings } from './settings';
import { defaultYtdlpPath, binaryExists } from './paths';

const GITHUB_LATEST = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';

export async function checkYtdlpUpdate(): Promise<YtdlpUpdateInfo> {
  const current = await getYtdlpVersion();
  const latest = await fetchLatestTag();
  return {
    current,
    latest,
    hasUpdate: Boolean(current && latest && current !== latest)
  };
}

async function fetchLatestTag(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = net.request({ url: GITHUB_LATEST, method: 'GET' });
    req.setHeader('User-Agent', 'Stacher');
    req.setHeader('Accept', 'application/vnd.github+json');
    let body = '';
    req.on('response', (res) => {
      res.on('data', (c) => (body += c.toString()));
      res.on('end', () => {
        try {
          const json = JSON.parse(body) as { tag_name?: string; name?: string };
          resolve((json.tag_name ?? json.name ?? '').replace(/^v/, '') || null);
        } catch {
          resolve(null);
        }
      });
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

export async function runYtdlpSelfUpdate(): Promise<string> {
  const settings = getSettings();
  const ytdlp = settings.ytdlpPath ?? defaultYtdlpPath();
  if (!binaryExists(ytdlp)) throw new Error(`yt-dlp not found at ${ytdlp}`);
  return new Promise((resolve, reject) => {
    const child = spawn(ytdlp, ['-U'], { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.stderr.on('data', (c) => (err += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(err || `yt-dlp -U exited ${code}`));
    });
  });
}
