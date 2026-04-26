import { useEffect, useRef, useState } from 'react';
import { FilmStrip, WarningCircle, ListBullets } from '@phosphor-icons/react';
import type { YtdlpInfo, PreviewError } from '@shared/types';

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; info: YtdlpInfo }
  | { kind: 'error'; error: PreviewError };

interface Props {
  url: string;
  enabled: boolean;
  onStateChange?: (s: 'idle' | 'loading' | 'ready' | 'error') => void;
}

const URL_RE = /^https?:\/\/\S+$/i;
const DEBOUNCE_MS = 600;

function formatDuration(seconds?: number): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function UrlPreview({ url, enabled, onStateChange }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const tokenRef = useRef(0);

  useEffect(() => {
    onStateChange?.(state.kind);
  }, [state.kind, onStateChange]);

  useEffect(() => {
    if (!enabled) {
      setState({ kind: 'idle' });
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || !URL_RE.test(trimmed)) {
      setState({ kind: 'idle' });
      return;
    }

    const myToken = ++tokenRef.current;
    setState({ kind: 'loading' });

    const timer = window.setTimeout(() => {
      window.stacher.ytdlp
        .preview(trimmed)
        .then((info) => {
          if (tokenRef.current !== myToken) return;
          setState({ kind: 'ready', info });
        })
        .catch((e: unknown) => {
          if (tokenRef.current !== myToken) return;
          const err = isPreviewError(e)
            ? e
            : { code: 'unknown' as const, message: e instanceof Error ? e.message : String(e) };
          setState({ kind: 'error', error: err });
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      // bump token so any in-flight result is ignored
      tokenRef.current = myToken + 1;
    };
  }, [url, enabled]);

  if (state.kind === 'idle') return null;

  if (state.kind === 'loading') {
    return (
      <div className="preview-card loading" aria-busy="true">
        <div className="q-thumb placeholder skeleton" />
        <div className="preview-body">
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-40" />
          <div className="skeleton-chips">
            <span className="chip neutral skeleton" />
            <span className="chip neutral skeleton" />
            <span className="chip neutral skeleton" />
          </div>
        </div>
        <div className="preview-meta">
          <span className="meta">Fetching metadata…</span>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="preview-card error">
        <div className="q-thumb placeholder">
          <WarningCircle size={24} weight="duotone" />
        </div>
        <div className="preview-body">
          <div className="q-title">{state.error.message}</div>
          <div className="q-source">Preview unavailable — you can still try downloading.</div>
          <div className="q-chips">
            <span className="chip err">{state.error.code}</span>
          </div>
        </div>
        <div className="preview-meta">
          <span className="meta">no preview</span>
        </div>
      </div>
    );
  }

  const { info } = state;
  const dur = formatDuration(info.duration);
  const subtitle = [info.uploader, info.sourceDomain].filter(Boolean).join(' · ');

  return (
    <div className="preview-card">
      <div className={info.thumbnail ? 'q-thumb' : 'q-thumb placeholder'}>
        {info.thumbnail ? (
          <img src={info.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : info.isPlaylist ? (
          <ListBullets size={24} weight="duotone" />
        ) : (
          <FilmStrip size={24} weight="duotone" />
        )}
        {dur && <span className="dur">{dur}</span>}
      </div>
      <div className="preview-body">
        <div className="q-title">{info.title}</div>
        <div className="q-source">{subtitle || info.sourceDomain || ''}</div>
        <div className="q-chips">
          {info.isPlaylist && (
            <span className="chip neutral">
              playlist{info.playlistCount ? ` · ${info.playlistCount}` : ''}
            </span>
          )}
          {(info.qualityLabels ?? []).map((q) => (
            <span key={q} className={q === 'audio' ? 'chip a' : 'chip v'}>
              {q}
            </span>
          ))}
        </div>
      </div>
      <div className="preview-meta">
        <span className="meta">ready</span>
      </div>
    </div>
  );
}

function isPreviewError(e: unknown): e is PreviewError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'message' in e &&
    typeof (e as { code: unknown }).code === 'string'
  );
}
