import clsx from 'clsx';
import {
  Pause,
  Play,
  X,
  FolderSimple,
  ArrowClockwise,
  FilmStrip
} from '@phosphor-icons/react';
import type { DownloadItem } from '@shared/types';

interface Props {
  item: DownloadItem;
}

const STATUS_CHIP: Record<DownloadItem['status'], { cls: string; label: string }> = {
  queued:    { cls: 'neutral', label: 'queued' },
  running:   { cls: 'v',       label: 'running' },
  paused:    { cls: 'warn',    label: 'paused' },
  completed: { cls: 'ok',      label: 'complete' },
  failed:    { cls: 'err',     label: 'failed' },
  cancelled: { cls: 'neutral', label: 'cancelled' }
};

export default function DownloadCard({ item }: Props) {
  const api = window.stacher.downloads;
  const done = item.status === 'completed';
  const err = item.status === 'failed';
  const active = item.status === 'running';

  const canPause = item.status === 'running' || item.status === 'queued';
  const canResume = item.status === 'paused' || item.status === 'cancelled';
  const canCancel = item.status === 'running' || item.status === 'queued';
  const canRetry = item.status === 'failed';
  const canOpen = done && item.outputPath;

  const statusChip = STATUS_CHIP[item.status];

  return (
    <div className={clsx('q-row', active && 'active')}>
      <div className={clsx('q-thumb', !item.thumbnail && 'placeholder')}>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FilmStrip size={24} weight="duotone" />
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="q-title">{item.title || item.url}</div>
        <div className="q-source">{item.url}</div>
        <div className="q-chips">
          <span className={`chip ${statusChip.cls}`}>{statusChip.label}</span>
          <span className="chip neutral">{item.profileId}</span>
          {item.attempt > 1 && (
            <span className="chip warn">
              try {item.attempt}/{item.maxAttempts}
            </span>
          )}
        </div>
        <div className={clsx('q-bar', done && 'done', err && 'err')}>
          <div style={{ width: `${Math.min(100, item.progress)}%` }} />
        </div>
        {item.errorMessage && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: 'var(--status-error)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {item.errorMessage}
          </div>
        )}
      </div>

      <div className="q-meta">
        <div className="pct">
          {err ? 'Error' : done ? 'Complete' : `${item.progress.toFixed(1)}%`}
        </div>
        <div className="rate">
          {err
            ? 'see error above'
            : done
            ? item.size ?? ''
            : [item.speed, item.eta && `ETA ${item.eta}`].filter(Boolean).join(' · ') ||
              statusChip.label}
        </div>
      </div>

      <div className="q-actions">
        {canPause && (
          <button onClick={() => api.pause(item.id)} title="Pause">
            <Pause size={16} weight="regular" />
          </button>
        )}
        {canResume && (
          <button onClick={() => api.resume(item.id)} title="Resume">
            <Play size={16} weight="regular" />
          </button>
        )}
        {canRetry && (
          <button onClick={() => api.retry(item.id)} title="Retry">
            <ArrowClockwise size={16} weight="regular" />
          </button>
        )}
        {canOpen && (
          <button
            onClick={() =>
              item.outputPath &&
              window.stacher.history.openFolder(item.outputPath)
            }
            title="Open folder"
          >
            <FolderSimple size={16} weight="regular" />
          </button>
        )}
        {canCancel ? (
          <button
            className="danger"
            onClick={() => api.cancel(item.id)}
            title="Cancel"
          >
            <X size={16} weight="regular" />
          </button>
        ) : (
          <button
            className="danger"
            onClick={() => api.cancel(item.id)}
            title="Remove"
          >
            <X size={16} weight="regular" />
          </button>
        )}
      </div>
    </div>
  );
}
