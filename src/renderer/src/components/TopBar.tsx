import { useMemo, useState } from 'react';
import {
  LinkSimple,
  SlidersHorizontal,
  DownloadSimple,
  FolderSimple,
  CaretDown,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import type { ProfileId } from '@shared/types';
import { PROFILE_LIST } from '@shared/profiles';
import { useStore } from '../store';
import UrlPreview from './UrlPreview';

type PreviewState = 'idle' | 'loading' | 'ready' | 'error';

export default function TopBar() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const pushToast = useStore((s) => s.pushToast);

  const [text, setText] = useState('');
  const [profile, setProfile] = useState<ProfileId>(settings?.defaultProfileId ?? 'best-video');
  const [presetOpen, setPresetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');

  const currentProfile = PROFILE_LIST.find((p) => p.id === profile) ?? PROFILE_LIST[0];

  const urls = useMemo(
    () =>
      text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [text]
  );

  const skipPreview = settings?.skipUrlPreview ?? false;
  const isSingleUrl = urls.length === 1;
  const previewActive = isSingleUrl && !skipPreview;

  // Gate: when preview is required, wait for ready/error before allowing download.
  // Multi-URL paste, or skip-preview on, bypass the gate entirely.
  const previewGateBlocking =
    previewActive && (previewState === 'idle' || previewState === 'loading');

  const onAdd = async () => {
    if (urls.length === 0) return;
    setBusy(true);
    try {
      await window.stacher.downloads.start({ urls, profileId: profile });
      setText('');
      setPreviewState('idle');
    } finally {
      setBusy(false);
    }
  };

  const pickFolder = async () => {
    const folder = await window.stacher.settings.pickFolder();
    if (!folder) return;
    await updateSettings({ defaultOutputFolder: folder });
    pushToast({ kind: 'success', message: `Download folder: ${folder}` });
  };

  const toggleSkipPreview = async () => {
    await updateSettings({ skipUrlPreview: !skipPreview });
  };

  const onEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim() && !previewGateBlocking) {
      e.preventDefault();
      void onAdd();
    }
  };

  const downloadDisabled = busy || urls.length === 0 || previewGateBlocking;

  return (
    <div style={{ position: 'relative' }}>
      <div className="urlbar">
        <div className="input">
          <LinkSimple size={18} weight="regular" />
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onEnter}
            placeholder="Paste a URL — YouTube, Twitch, Vimeo, 1000+ more. Enter to add, Shift+Enter for a new line."
          />
        </div>

        <button
          className="folder-pill"
          onClick={pickFolder}
          title={`Click to change download folder\n${settings?.defaultOutputFolder ?? ''}`}
        >
          <FolderSimple size={16} weight="regular" />
          <span className="label">Folder</span>
          <span className="path">{settings?.defaultOutputFolder ?? 'Not set'}</span>
        </button>

        <button
          className="btn"
          onClick={() => setPresetOpen((o) => !o)}
          title="Format preset"
        >
          <SlidersHorizontal size={18} weight="regular" />
          {currentProfile.label}
          <CaretDown size={12} weight="regular" style={{ opacity: 0.7 }} />
        </button>

        <button
          className="btn icon subtle"
          onClick={toggleSkipPreview}
          title={skipPreview ? 'Preview disabled — click to enable' : 'Preview enabled — click to skip'}
          aria-pressed={!skipPreview}
        >
          {skipPreview ? <EyeSlash size={16} weight="regular" /> : <Eye size={16} weight="regular" />}
        </button>

        <button className="btn primary" disabled={downloadDisabled} onClick={onAdd}>
          <DownloadSimple size={18} weight="regular" />
          {busy ? 'Adding…' : previewGateBlocking ? 'Loading preview…' : 'Download'}
        </button>
      </div>

      {isSingleUrl && (
        <UrlPreview url={urls[0]!} enabled={!skipPreview} onStateChange={setPreviewState} />
      )}

      {presetOpen && (
        <div
          className="flyout"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 148,
            zIndex: 30,
            background: 'rgba(40,40,40,0.92)',
            backdropFilter: 'blur(40px) saturate(140%)',
            WebkitBackdropFilter: 'blur(40px) saturate(140%)',
            border: '1px solid var(--stroke-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-16)',
            padding: 6,
            minWidth: 320
          }}
          onMouseLeave={() => setPresetOpen(false)}
        >
          <div
            style={{
              padding: '6px 12px 4px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--fg-tertiary)'
            }}
          >
            Presets
          </div>
          {PROFILE_LIST.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setProfile(p.id);
                setPresetOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 4,
                fontSize: 13,
                cursor: 'pointer',
                background:
                  p.id === profile ? 'var(--bg-selected)' : 'transparent',
                color: 'var(--fg-primary)'
              }}
            >
              <span>{p.label}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg-tertiary)'
                }}
              >
                {p.id}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
