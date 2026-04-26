import { useState } from 'react';
import { Cookie, Plus, Trash } from '@phosphor-icons/react';
import { useStore } from '../store';

export default function SiteLogins() {
  const credentials = useStore((s) => s.credentials);
  const refresh = useStore((s) => s.refreshCredentials);

  const [domain, setDomain] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cookiesPath, setCookiesPath] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!domain.trim()) return;
    setBusy(true);
    try {
      await window.stacher.credentials.set({
        domain: domain.trim(),
        username: username || undefined,
        password: password || undefined,
        cookiesPath: cookiesPath || undefined
      });
      setDomain('');
      setUsername('');
      setPassword('');
      setCookiesPath('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: string) => {
    await window.stacher.credentials.delete(d);
    await refresh();
  };

  return (
    <div className="page">
      <h2>Cookies &amp; logins</h2>
      <p className="desc">
        Authenticate yt-dlp against gated sites. Stacher never stores your
        password in plaintext — secrets are encrypted via OS{' '}
        <code>safeStorage</code>.
      </p>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--stroke-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          marginBottom: 14
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            Add or update
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10
          }}
        >
          <input
            className="t-input"
            placeholder="domain (e.g. youtube.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <input
            className="t-input"
            placeholder="username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="t-input"
            type="password"
            placeholder="password (encrypted at rest)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="t-input mono"
            placeholder="cookies.txt path (optional)"
            value={cookiesPath}
            onChange={(e) => setCookiesPath(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            className="btn sm primary"
            onClick={save}
            disabled={busy || !domain.trim()}
          >
            <Plus size={14} weight="regular" />
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {credentials.length === 0 ? (
        <div className="empty">
          <Cookie size={56} weight="duotone" />
          <h3>No saved credentials</h3>
          <p>Add a login above to let yt-dlp access gated content.</p>
        </div>
      ) : (
        credentials.map((c) => (
          <div key={c.domain} className="cookie-row">
            <Cookie
              size={20}
              weight="regular"
              style={{
                color: c.hasSecret ? 'var(--accent-80)' : 'var(--fg-tertiary)'
              }}
            />
            <div>
              <div className="host">{c.domain}</div>
              <div className="src">
                {c.username ? `user: ${c.username}` : 'no username'}
                {c.hasSecret ? ' · password: stored' : ''}
              </div>
            </div>
            <span className={`chip ${c.hasSecret ? 'ok' : 'neutral'}`}>
              {c.hasSecret ? 'active' : 'no password'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn sm subtle danger"
                onClick={() => remove(c.domain)}
                title="Delete"
              >
                <Trash size={14} weight="regular" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
