import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, ClockCounterClockwise } from '@phosphor-icons/react';
import type { HistoryEntry } from '@shared/types';
import { useStore } from '../store';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [q, setQ] = useState('');
  const [existsMap, setExistsMap] = useState<Record<number, boolean>>({});

  const filters = useStore((s) => s.historyFilters);
  const setFilters = useStore((s) => s.setHistoryFilters);
  const defaultFolder = useStore((s) => s.settings?.defaultOutputFolder ?? '');

  const load = async () => {
    const data = q.trim()
      ? await window.stacher.history.search(q.trim())
      : await window.stacher.history.list(200, 0);
    setEntries(data);
  };

  useEffect(() => {
    void load();
  }, [q]);

  // Batch-check file existence for entries with output_path.
  useEffect(() => {
    let cancelled = false;
    const targets = entries.filter((e) => !!e.output_path);
    if (targets.length === 0) {
      setExistsMap({});
      return;
    }
    void Promise.all(
      targets.map(async (e) => {
        const ok = await window.stacher.history.exists(e.output_path!);
        return [e.id, ok] as const;
      })
    ).then((pairs) => {
      if (cancelled) return;
      setExistsMap(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const formatOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.format) set.add(e.format);
    return Array.from(set).sort();
  }, [entries]);

  const domainOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const h = hostnameOf(e.url);
      if (h) set.add(h);
    }
    return Array.from(set).sort();
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const now = Date.now();
    let dateThreshold: number | null = null;
    if (filters.date === 'today') dateThreshold = startOfTodayMs();
    else if (filters.date === '7d') dateThreshold = now - 7 * DAY_MS;
    else if (filters.date === '30d') dateThreshold = now - 30 * DAY_MS;

    return entries.filter((e) => {
      if (dateThreshold !== null && e.date < dateThreshold) return false;
      if (filters.format !== 'all' && e.format !== filters.format) return false;
      if (filters.domain !== 'all') {
        const h = hostnameOf(e.url);
        if (h !== filters.domain) return false;
      }
      return true;
    });
  }, [entries, filters]);

  return (
    <div className="page">
      <h2>History</h2>
      <p className="desc">
        A running log of every extract and download. Used to skip duplicates
        and jump back to files on disk.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--stroke-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 14
        }}
      >
        <div
          className="urlbar__input"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            height: 32,
            padding: '0 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--stroke-control)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <MagnifyingGlass
            size={16}
            weight="regular"
            style={{ color: 'var(--fg-tertiary)' }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, URL, format…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 0,
              color: 'var(--fg-primary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>

        <div className="hist-filters">
          <label>
            <span>Date</span>
            <select
              value={filters.date}
              onChange={(e) =>
                setFilters({ date: e.target.value as typeof filters.date })
              }
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
          <label>
            <span>Format</span>
            <select
              value={filters.format}
              onChange={(e) => setFilters({ format: e.target.value })}
            >
              <option value="all">All</option>
              {formatOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Domain</span>
            <select
              value={filters.domain}
              onChange={(e) => setFilters({ domain: e.target.value })}
            >
              <option value="all">All</option>
              {domainOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="empty">
          <ClockCounterClockwise size={56} weight="duotone" />
          <h3>No history yet</h3>
          <p>Downloads you complete will appear here.</p>
        </div>
      ) : (
        <table className="hist-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Format</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ width: 320, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((e) => {
              const hasPath = !!e.output_path;
              const exists = hasPath ? existsMap[e.id] : undefined;
              const fileMissing = hasPath && exists === false;
              return (
                <tr key={e.id}>
                  <td>
                    <div className="t1">{e.title}</div>
                    <div className="t2">{e.url}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {e.format}
                  </td>
                  <td>
                    <span
                      className={`chip ${
                        e.status === 'completed'
                          ? 'ok'
                          : e.status === 'failed'
                          ? 'err'
                          : 'neutral'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--fg-tertiary)', fontSize: 12 }}>
                    {new Date(e.date).toLocaleString()}
                  </td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        justifyContent: 'flex-end'
                      }}
                    >
                      {hasPath && (
                        <button
                          className="btn sm subtle"
                          disabled={fileMissing}
                          title={fileMissing ? 'File not found' : 'Open file'}
                          onClick={() =>
                            window.stacher.history.openFile(e.output_path!)
                          }
                        >
                          Open
                        </button>
                      )}
                      <button
                        className="btn sm subtle"
                        disabled={!hasPath && !defaultFolder}
                        title={
                          hasPath
                            ? fileMissing
                              ? 'File not found — opening download folder'
                              : 'Open folder'
                            : defaultFolder
                            ? `Open default download folder (${defaultFolder})`
                            : 'No download folder configured'
                        }
                        onClick={() => {
                          if (hasPath && !fileMissing) {
                            window.stacher.history.openFolder(e.output_path!);
                          } else if (defaultFolder) {
                            window.stacher.history.openFile(defaultFolder);
                          }
                        }}
                      >
                        Open folder
                      </button>
                      <button
                        className="btn sm"
                        onClick={() =>
                          window.stacher.downloads.start({
                            urls: [e.url],
                            profileId: 'best-video'
                          })
                        }
                      >
                        Re-download
                      </button>
                      <button
                        className="btn sm subtle danger"
                        onClick={async () => {
                          await window.stacher.history.delete(e.id);
                          void load();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
