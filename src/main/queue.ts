import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  DownloadItem,
  DownloadProgressEvent,
  DownloadRequest,
  DownloadStatusEvent
} from '@shared/types';
import { Downloader } from './downloader';
import { getSettings } from './settings';
import { addHistory, updateHistoryStatus } from './history';

interface QueueEvents {
  progress: (e: DownloadProgressEvent) => void;
  status: (e: DownloadStatusEvent) => void;
  log: (e: { id: string; line: string; stream: 'stdout' | 'stderr' }) => void;
}

export class DownloadQueue extends EventEmitter {
  private items = new Map<string, DownloadItem>();
  private requests = new Map<string, DownloadRequest>();
  private historyIds = new Map<string, number>();
  private active = new Map<string, Downloader>();
  private order: string[] = [];

  list(): DownloadItem[] {
    return this.order.map((id) => this.items.get(id)!).filter(Boolean);
  }

  enqueue(req: DownloadRequest): DownloadItem[] {
    const created: DownloadItem[] = [];
    const settings = getSettings();
    for (const url of req.urls) {
      const id = randomUUID();
      const item: DownloadItem = {
        id,
        url,
        title: url,
        status: 'queued',
        profileId: req.profileId,
        progress: 0,
        attempt: 0,
        maxAttempts: 1 + settings.maxRetries,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.items.set(id, item);
      this.requests.set(id, { ...req, urls: [url] });
      this.order.push(id);

      const historyId = addHistory({
        url,
        title: url,
        thumbnail_url: null,
        status: 'queued',
        format: req.profileId,
        output_path: null,
        date: Date.now(),
        duration: null,
        filesize: null
      });
      this.historyIds.set(id, historyId);

      this.emit('status', { id, status: 'queued' });
      created.push(item);
    }
    this.pump();
    return created;
  }

  cancel(id: string): void {
    const dl = this.active.get(id);
    if (dl) {
      dl.cancel();
      return;
    }
    const item = this.items.get(id);
    if (item && item.status === 'queued') {
      this.patch(id, { status: 'cancelled' });
    }
  }

  pause(id: string): void {
    // yt-dlp does not support true pause; treat as cancel that can be resumed.
    const dl = this.active.get(id);
    if (dl) {
      dl.cancel();
      this.patch(id, { status: 'paused' });
    } else {
      const item = this.items.get(id);
      if (item && item.status === 'queued') this.patch(id, { status: 'paused' });
    }
  }

  resume(id: string): void {
    const item = this.items.get(id);
    if (!item) return;
    if (item.status === 'paused' || item.status === 'cancelled' || item.status === 'failed') {
      this.patch(id, { status: 'queued', progress: 0, errorMessage: undefined });
      this.pump();
    }
  }

  retry(id: string): void {
    const item = this.items.get(id);
    if (!item) return;
    item.attempt = 0;
    this.patch(id, { status: 'queued', progress: 0, errorMessage: undefined });
    this.pump();
  }

  clearCompleted(): void {
    for (const id of [...this.order]) {
      const it = this.items.get(id);
      if (!it) continue;
      if (it.status === 'completed' || it.status === 'cancelled' || it.status === 'failed') {
        this.items.delete(id);
        this.requests.delete(id);
        this.historyIds.delete(id);
        this.order = this.order.filter((x) => x !== id);
      }
    }
  }

  private pump(): void {
    const settings = getSettings();
    const max = Math.max(1, settings.maxConcurrent);
    for (const id of this.order) {
      if (this.active.size >= max) break;
      const item = this.items.get(id);
      if (!item || item.status !== 'queued') continue;
      if (this.active.has(id)) continue;
      this.startOne(id);
    }
  }

  private startOne(id: string): void {
    const item = this.items.get(id);
    const req = this.requests.get(id);
    if (!item || !req) return;

    item.attempt += 1;
    const dl = new Downloader(item, req);
    this.active.set(id, dl);

    dl.on('progress', (_id, p) => {
      this.patch(id, { progress: p.progress, speed: p.speed, eta: p.eta, size: p.size });
      this.emit('progress', { id, ...p });
    });

    dl.on('status', (_id, patch) => {
      this.patch(id, patch);
    });

    dl.on('log', (_id, line, stream) => {
      this.emit('log', { id, line, stream });
    });

    dl.on('done', (_id, success) => {
      this.active.delete(id);
      const cur = this.items.get(id);
      if (!success && cur && cur.status === 'failed' && cur.attempt < cur.maxAttempts) {
        // Auto-retry
        setTimeout(() => {
          this.patch(id, { status: 'queued', progress: 0 });
          this.pump();
        }, 1500);
        return;
      }
      const historyId = this.historyIds.get(id);
      if (historyId && cur) {
        updateHistoryStatus(historyId, cur.status, {
          output_path: cur.outputPath ?? null,
          title: cur.title,
          thumbnail_url: cur.thumbnail ?? null
        });
      }
      this.pump();
    });

    dl.start();
  }

  private patch(id: string, patch: Partial<DownloadItem>): void {
    const item = this.items.get(id);
    if (!item) return;
    Object.assign(item, patch, { updatedAt: Date.now() });
    this.emit('status', {
      id,
      status: item.status,
      title: item.title,
      thumbnail: item.thumbnail,
      outputPath: item.outputPath,
      errorMessage: item.errorMessage,
      attempt: item.attempt
    });
  }
}

export const queue = new DownloadQueue();
