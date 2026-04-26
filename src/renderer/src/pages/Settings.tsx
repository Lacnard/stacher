import { useEffect, useState } from 'react';
import { FolderSimple, ArrowCircleUp } from '@phosphor-icons/react';
import type {
  AppSettings,
  CookieBrowser,
  ProfileId,
  YtdlpUpdateInfo
} from '@shared/types';
import { PROFILE_LIST } from '@shared/profiles';
import { useStore } from '../store';

const BROWSERS: CookieBrowser[] = [
  'none',
  'chrome',
  'firefox',
  'edge',
  'brave',
  'opera',
  'vivaldi'
];

const TABS = ['general', 'downloading', 'network', 'post-processing', 'advanced'] as const;
type Tab = (typeof TABS)[number];

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const pushToast = useStore((s) => s.pushToast);
  const [version, setVersion] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<YtdlpUpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('general');

  useEffect(() => {
    void window.stacher.ytdlp.version().then(setVersion);
  }, []);

  if (!settings)
    return (
      <div className="page">
        <p className="desc">Loading…</p>
      </div>
    );

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    update({ [k]: v } as Partial<AppSettings>);

  const pickFolder = async () => {
    const folder = await window.stacher.settings.pickFolder();
    if (folder) {
      await update({ defaultOutputFolder: folder });
      pushToast({ kind: 'success', message: `Download folder: ${folder}` });
    }
  };

  const checkUpdate = async () => {
    setBusy(true);
    try {
      setUpdateInfo(await window.stacher.ytdlp.checkUpdate());
    } finally {
      setBusy(false);
    }
  };

  const runUpdate = async () => {
    setBusy(true);
    try {
      await window.stacher.ytdlp.runUpdate();
      setVersion(await window.stacher.ytdlp.version());
      setUpdateInfo(await window.stacher.ytdlp.checkUpdate());
      pushToast({ kind: 'success', message: 'yt-dlp updated.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h2>Settings</h2>
      <p className="desc">
        Every setting here maps directly to a yt-dlp or ffmpeg flag.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.replace('-', ' ').replace(/^./, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="settings-grid">
          <div
            className="setting"
            style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}
          >
            <div>
              <h4>Download folder</h4>
              <p
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--fg-secondary)',
                  fontSize: 12,
                  wordBreak: 'break-all'
                }}
              >
                {settings.defaultOutputFolder}
              </p>
            </div>
            <button className="btn sm" onClick={pickFolder}>
              <FolderSimple size={16} weight="regular" />
              Browse
            </button>
          </div>

          <div className="setting">
            <div>
              <h4>Filename template</h4>
              <p>Passed to yt-dlp as <code>-o</code>.</p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 360 }}
              value={settings.filenameTemplate}
              onChange={(e) => set('filenameTemplate', e.target.value)}
            />
          </div>

          <div className="setting">
            <div>
              <h4>Default format profile</h4>
              <p>Applied when you paste a URL without overriding the preset.</p>
            </div>
            <select
              className="t-select"
              value={settings.defaultProfileId}
              onChange={(e) =>
                set('defaultProfileId', e.target.value as ProfileId)
              }
            >
              {PROFILE_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="setting">
            <div>
              <h4>Theme</h4>
              <p>Dark is the designed target; light theme is provided for parity.</p>
            </div>
            <select
              className="t-select"
              value={settings.theme}
              onChange={(e) => set('theme', e.target.value as 'dark' | 'light')}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      )}

      {tab === 'downloading' && (
        <div className="settings-grid">
          <div className="setting">
            <div>
              <h4>Max concurrent downloads</h4>
              <p>How many yt-dlp processes may run at once.</p>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              className="t-input"
              style={{ width: 80, textAlign: 'right' }}
              value={settings.maxConcurrent}
              onChange={(e) =>
                set('maxConcurrent', Math.max(1, Number(e.target.value)))
              }
            />
          </div>
          <div className="setting">
            <div>
              <h4>Max retries per item</h4>
              <p>Automatic retry count before marking a download failed.</p>
            </div>
            <input
              type="number"
              min={0}
              max={10}
              className="t-input"
              style={{ width: 80, textAlign: 'right' }}
              value={settings.maxRetries}
              onChange={(e) =>
                set('maxRetries', Math.max(0, Number(e.target.value)))
              }
            />
          </div>
          <ToggleRow
            title="Download subtitles"
            desc={`Adds --write-subs. Language: ${settings.subtitleLang || 'en'}.`}
            on={settings.subtitles}
            toggle={() => set('subtitles', !settings.subtitles)}
          />
          <div className="setting">
            <div>
              <h4>Subtitle language code</h4>
              <p>ISO 639-1 / 2 codes, comma-separated.</p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 120 }}
              value={settings.subtitleLang}
              onChange={(e) => set('subtitleLang', e.target.value)}
            />
          </div>
        </div>
      )}

      {tab === 'network' && (
        <div className="settings-grid">
          <div className="setting">
            <div>
              <h4>Rate limit</h4>
              <p>
                Passed as <code>-r</code>, e.g. <code>2M</code> = 2 MB/s. Blank =
                unlimited.
              </p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 160 }}
              placeholder="unlimited"
              value={settings.rateLimit ?? ''}
              onChange={(e) => set('rateLimit', e.target.value || null)}
            />
          </div>
          <div className="setting">
            <div>
              <h4>Proxy</h4>
              <p>Any URL yt-dlp accepts — <code>http://…</code>, <code>socks5://…</code>.</p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 320 }}
              placeholder="socks5://127.0.0.1:1080"
              value={settings.proxy ?? ''}
              onChange={(e) => set('proxy', e.target.value || null)}
            />
          </div>
          <div className="setting">
            <div>
              <h4>Cookies from browser</h4>
              <p>Reads cookies from a locally installed browser profile.</p>
            </div>
            <select
              className="t-select"
              value={settings.cookiesFromBrowser}
              onChange={(e) =>
                set('cookiesFromBrowser', e.target.value as CookieBrowser)
              }
            >
              {BROWSERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === 'post-processing' && (
        <div className="settings-grid">
          <ToggleRow
            title="SponsorBlock — remove segments"
            desc="Cut sponsor, intro, and self-promotion segments from downloaded video."
            on={settings.sponsorblock}
            toggle={() => set('sponsorblock', !settings.sponsorblock)}
          />
        </div>
      )}

      {tab === 'advanced' && (
        <div className="settings-grid">
          <div className="setting">
            <div>
              <h4>yt-dlp binary path</h4>
              <p>
                Override the bundled binary. Leave blank to use{' '}
                <code>resources/yt-dlp.exe</code>.
              </p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 360 }}
              placeholder="bundled"
              value={settings.ytdlpPath ?? ''}
              onChange={(e) => set('ytdlpPath', e.target.value || null)}
            />
          </div>
          <div className="setting">
            <div>
              <h4>ffmpeg binary path</h4>
              <p>
                Override the bundled binary. Leave blank to use{' '}
                <code>resources/ffmpeg.exe</code>.
              </p>
            </div>
            <input
              className="t-input mono"
              style={{ width: 360 }}
              placeholder="bundled"
              value={settings.ffmpegPath ?? ''}
              onChange={(e) => set('ffmpegPath', e.target.value || null)}
            />
          </div>

          <div
            className="setting"
            style={{ gridTemplateColumns: '1fr auto', gap: 16 }}
          >
            <div>
              <h4>yt-dlp version</h4>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--fg-secondary)',
                  fontSize: 12
                }}
              >
                {version ?? 'not found'}
                {updateInfo?.latest && (
                  <>
                    {' '}
                    <span style={{ color: 'var(--fg-tertiary)' }}>
                      · latest {updateInfo.latest}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn sm"
                onClick={checkUpdate}
                disabled={busy}
              >
                Check for updates
              </button>
              {updateInfo?.hasUpdate && (
                <button
                  className="btn sm primary"
                  onClick={runUpdate}
                  disabled={busy}
                >
                  <ArrowCircleUp size={14} weight="regular" />
                  Update → {updateInfo.latest}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  on,
  toggle
}: {
  title: string;
  desc: string;
  on: boolean;
  toggle: () => void;
}) {
  return (
    <div className="setting">
      <div>
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
      <button
        className={`switch ${on ? 'on' : ''}`}
        aria-pressed={on}
        onClick={toggle}
      />
    </div>
  );
}
