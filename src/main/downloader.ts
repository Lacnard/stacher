import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  DownloadItem,
  DownloadRequest,
  DownloadStatus,
  YtdlpInfo,
  PreviewError
} from '@shared/types';
import { PROFILES } from '@shared/profiles';
import { getSettings } from './settings';
import { resolveCredentialForSpawn } from './credentials';
import { defaultYtdlpPath, defaultFfmpegPath, binaryExists } from './paths';

export interface DownloaderEvents {
  progress: (id: string, p: { progress: number; speed?: string; eta?: string; size?: string }) => void;
  status: (id: string, patch: Partial<DownloadItem>) => void;
  log: (id: string, line: string, stream: 'stdout' | 'stderr') => void;
  done: (id: string, success: boolean) => void;
}

// Matches lines like:
// [download]  42.7% of ~123.45MiB at  5.10MiB/s ETA 00:42
const PROGRESS_RE =
  /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/i;

// Title sniffed from "[download] Destination: <path>"
const DEST_RE = /\[download\]\s+Destination:\s+(.+)$/i;

// yt-dlp --print "%(title)s" lines for pre-info could also be parsed,
// but we rely on --newline and progress for simplicity.

export class Downloader extends EventEmitter {
  private child: ChildProcess | null = null;
  private _cancelled = false;

  constructor(public readonly item: DownloadItem, public readonly req: DownloadRequest) {
    super();
  }

  get pid(): number | undefined {
    return this.child?.pid;
  }

  cancel(): void {
    this._cancelled = true;
    if (this.child && !this.child.killed) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  }

  start(): void {
    const settings = getSettings();

    const ytdlp = settings.ytdlpPath ?? defaultYtdlpPath();
    const ffmpeg = settings.ffmpegPath ?? defaultFfmpegPath();

    if (!binaryExists(ytdlp)) {
      this.emit('status', this.item.id, {
        status: 'failed',
        errorMessage: `yt-dlp binary not found at ${ytdlp}`
      });
      this.emit('done', this.item.id, false);
      return;
    }

    const profile = PROFILES[this.req.profileId];
    const outDir = this.req.outputFolder ?? settings.defaultOutputFolder;
    const template = this.req.filenameTemplate ?? settings.filenameTemplate;

    const args: string[] = [
      ...(this.req.profileId === 'custom' ? this.req.customArgs ?? [] : profile.args),
      '-o',
      `${outDir.replace(/[\\/]+$/, '')}/${template}`,
      '--no-part',
      '--newline',
      '--progress',
      '--no-colors',
      '--print',
      'before_dl:TITLE:%(title)s',
      '--print',
      'before_dl:THUMB:%(thumbnail)s',
      '--print',
      'after_move:FILEPATH:%(filepath)s'
    ];

    if (binaryExists(ffmpeg)) {
      args.push('--ffmpeg-location', dirname(ffmpeg));
    }

    if (settings.rateLimit) args.push('--limit-rate', settings.rateLimit);
    if (settings.proxy) args.push('--proxy', settings.proxy);

    const subs = this.req.subtitles ?? settings.subtitles;
    if (subs) {
      args.push('--write-subs', '--write-auto-subs', '--sub-langs', this.req.subtitleLang ?? settings.subtitleLang);
      args.push('--embed-subs');
    }

    if (this.req.sponsorblock ?? settings.sponsorblock) {
      args.push('--sponsorblock-remove', 'sponsor');
    }

    // Auth
    const browser = this.req.cookiesFromBrowser ?? settings.cookiesFromBrowser;
    if (browser && browser !== 'none') {
      args.push('--cookies-from-browser', browser);
    }
    if (this.req.cookiesFile && existsSync(this.req.cookiesFile)) {
      args.push('--cookies', this.req.cookiesFile);
    }
    if (this.req.netrc) args.push('--netrc');
    if (this.req.credentialDomain) {
      const cred = resolveCredentialForSpawn(this.req.credentialDomain);
      if (cred?.username && cred.password) {
        args.push('--username', cred.username, '--password', cred.password);
      }
      if (cred?.cookiesPath && existsSync(cred.cookiesPath)) {
        args.push('--cookies', cred.cookiesPath);
      }
    }

    // Post-processing defaults
    args.push('--embed-thumbnail', '--embed-metadata');

    // URL last
    args.push(this.item.url);

    this.emit('status', this.item.id, { status: 'running' });

    const child = spawn(ytdlp, args, {
      windowsHide: true,
      // Do not log secrets — never print the full args array.
      stdio: ['ignore', 'pipe', 'pipe']
    });
    this.child = child;

    const onLine = (line: string, stream: 'stdout' | 'stderr') => {
      if (!line) return;
      this.emit('log', this.item.id, line, stream);

      // Title sniffing
      const title = line.match(/^TITLE:(.+)$/);
      if (title) {
        this.emit('status', this.item.id, { title: title[1]!.trim() });
        return;
      }
      const thumb = line.match(/^THUMB:(.+)$/);
      if (thumb && thumb[1] && thumb[1] !== 'NA') {
        this.emit('status', this.item.id, { thumbnail: thumb[1].trim() });
        return;
      }

      const finalPath = line.match(/^FILEPATH:(.+)$/);
      if (finalPath && finalPath[1]) {
        this.emit('status', this.item.id, { outputPath: finalPath[1].trim() });
        return;
      }

      const dest = line.match(DEST_RE);
      if (dest) {
        this.emit('status', this.item.id, { outputPath: dest[1]!.trim() });
      }

      const m = line.match(PROGRESS_RE);
      if (m) {
        this.emit('progress', this.item.id, {
          progress: Number(m[1]),
          size: m[2],
          speed: m[3],
          eta: m[4]
        });
      }
    };

    lineReader(child.stdout!, (l) => onLine(l, 'stdout'));
    lineReader(child.stderr!, (l) => onLine(l, 'stderr'));

    child.on('error', (err) => {
      this.emit('status', this.item.id, { status: 'failed', errorMessage: err.message });
      this.emit('done', this.item.id, false);
    });

    child.on('close', (code) => {
      this.child = null;
      if (this._cancelled) {
        this.emit('status', this.item.id, { status: 'cancelled' as DownloadStatus });
        this.emit('done', this.item.id, false);
        return;
      }
      if (code === 0) {
        this.emit('status', this.item.id, { status: 'completed', progress: 100 });
        this.emit('done', this.item.id, true);
      } else {
        this.emit('status', this.item.id, {
          status: 'failed',
          errorMessage: `yt-dlp exited with code ${code}`
        });
        this.emit('done', this.item.id, false);
      }
    });
  }
}

function lineReader(stream: NodeJS.ReadableStream, onLine: (line: string) => void): void {
  let buf = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    buf += chunk;
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      onLine(line);
    }
  });
  stream.on('end', () => {
    if (buf) onLine(buf);
  });
}

export async function fetchInfo(url: string): Promise<Record<string, unknown>> {
  const settings = getSettings();
  const ytdlp = settings.ytdlpPath ?? defaultYtdlpPath();
  return new Promise((resolve, reject) => {
    if (!binaryExists(ytdlp)) {
      reject(new Error(`yt-dlp binary not found at ${ytdlp}`));
      return;
    }
    const args = ['-J', '--no-warnings', '--skip-download', url];
    const child = spawn(ytdlp, args, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.stderr.on('data', (c) => (err += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `yt-dlp exited ${code}`));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(e);
      }
    });
  });
}

interface RawYtdlpJson {
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url_domain?: string;
  extractor?: string;
  extractor_key?: string;
  webpage_url?: string;
  _type?: string;
  entries?: unknown[];
  playlist_count?: number;
  formats?: Array<{
    format_id?: string;
    ext?: string;
    resolution?: string;
    height?: number;
    vcodec?: string;
    acodec?: string;
    filesize?: number;
    filesize_approx?: number;
  }>;
}

function classifyPreviewError(stderr: string, networkLike: boolean): PreviewError {
  const s = stderr.toLowerCase();
  if (
    s.includes('private video') ||
    s.includes('login required') ||
    s.includes('sign in') ||
    s.includes('members-only') ||
    s.includes('age-restricted')
  ) {
    return { code: 'private', message: 'Private or login required' };
  }
  if (s.includes('unsupported url') || s.includes('is not a valid url')) {
    return { code: 'unsupported', message: 'Unsupported URL' };
  }
  if (
    networkLike ||
    s.includes('unable to download') ||
    s.includes('network is unreachable') ||
    s.includes('failed to resolve') ||
    s.includes('timed out') ||
    s.includes('connection reset')
  ) {
    return { code: 'network', message: 'Network error' };
  }
  return { code: 'unknown', message: stderr.split('\n').filter(Boolean).pop() ?? "Couldn't fetch metadata" };
}

function extractDomain(raw: RawYtdlpJson): string | undefined {
  if (raw.webpage_url_domain) return raw.webpage_url_domain;
  if (raw.webpage_url) {
    try {
      return new URL(raw.webpage_url).hostname.replace(/^www\./, '');
    } catch {
      // ignore
    }
  }
  return raw.extractor_key ?? raw.extractor;
}

function deriveQualityLabels(raw: RawYtdlpJson): string[] {
  const formats = raw.formats ?? [];
  const heights = new Set<number>();
  let hasAudio = false;
  for (const f of formats) {
    if (f.vcodec && f.vcodec !== 'none' && typeof f.height === 'number' && f.height > 0) {
      heights.add(f.height);
    }
    if (f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')) {
      hasAudio = true;
    }
  }
  const sorted = [...heights].sort((a, b) => b - a);
  const labels: string[] = [];
  for (const h of sorted) {
    if (h >= 2160) labels.push('2160p');
    else if (h >= 1440) labels.push('1440p');
    else if (h >= 1080) labels.push('1080p');
    else if (h >= 720) labels.push('720p');
    else if (h >= 480) labels.push('480p');
    else labels.push(`${h}p`);
    if (labels.length >= 4) break;
  }
  // dedupe in order
  const seen = new Set<string>();
  const unique = labels.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
  if (hasAudio) unique.push('audio');
  return unique;
}

function normalizeInfo(raw: RawYtdlpJson): YtdlpInfo {
  const isPlaylist = raw._type === 'playlist' || Array.isArray(raw.entries);
  const formats = (raw.formats ?? [])
    .filter((f) => typeof f.format_id === 'string' && typeof f.ext === 'string')
    .map((f) => ({
      format_id: f.format_id as string,
      ext: f.ext as string,
      resolution: f.resolution,
      filesize: f.filesize ?? f.filesize_approx
    }));
  return {
    title: raw.title ?? (isPlaylist ? 'Playlist' : 'Untitled'),
    uploader: raw.uploader ?? raw.channel,
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    thumbnail: raw.thumbnail,
    formats: formats.length > 0 ? formats : undefined,
    sourceDomain: extractDomain(raw),
    isPlaylist,
    playlistCount: isPlaylist
      ? raw.playlist_count ?? (Array.isArray(raw.entries) ? raw.entries.length : undefined)
      : undefined,
    qualityLabels: deriveQualityLabels(raw)
  };
}

export async function previewInfo(url: string): Promise<YtdlpInfo> {
  const settings = getSettings();
  const ytdlp = settings.ytdlpPath ?? defaultYtdlpPath();
  if (!binaryExists(ytdlp)) {
    const err: PreviewError = { code: 'binary-missing', message: `yt-dlp binary not found at ${ytdlp}` };
    throw err;
  }
  return new Promise((resolve, reject) => {
    const args = ['-J', '--no-warnings', '--skip-download', '--flat-playlist', url];
    if (settings.proxy) args.push('--proxy', settings.proxy);
    const child = spawn(ytdlp, args, { windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.stderr.on('data', (c) => (err += c.toString()));
    child.on('error', (e) => {
      const pe: PreviewError = { code: 'network', message: e.message };
      reject(pe);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(classifyPreviewError(err, false));
        return;
      }
      try {
        const raw = JSON.parse(out) as RawYtdlpJson;
        resolve(normalizeInfo(raw));
      } catch (e) {
        const pe: PreviewError = {
          code: 'unknown',
          message: e instanceof Error ? e.message : 'Failed to parse yt-dlp output'
        };
        reject(pe);
      }
    });
  });
}

export async function getYtdlpVersion(): Promise<string | null> {
  const settings = getSettings();
  const ytdlp = settings.ytdlpPath ?? defaultYtdlpPath();
  if (!binaryExists(ytdlp)) return null;
  return new Promise((resolve) => {
    const child = spawn(ytdlp, ['--version'], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (c) => (out += c.toString()));
    child.on('error', () => resolve(null));
    child.on('close', () => resolve(out.trim() || null));
  });
}
