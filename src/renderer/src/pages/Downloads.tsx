import { DownloadSimple } from '@phosphor-icons/react';
import TopBar from '../components/TopBar';
import DownloadCard from '../components/DownloadCard';
import { useStore } from '../store';

export default function Downloads() {
  const downloads = useStore((s) => s.downloads);
  const active = downloads.filter(
    (d) => d.status === 'running' || d.status === 'queued'
  ).length;

  const clearFinished = async () => {
    await window.stacher.downloads.clear();
    await useStore.getState().refreshDownloads();
  };

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <h2>Queue</h2>
      <p className="desc">
        Paste a URL to begin. Stacher sends it straight to yt-dlp using the
        selected format preset. Change the download folder via the pill in the
        bar below.
      </p>

      <TopBar />

      <div className="sec-head">
        <h3>Active · {active}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="meta">{downloads.length} items total</span>
          {downloads.length > 0 && (
            <button className="btn sm subtle" onClick={clearFinished}>
              Clear finished
            </button>
          )}
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="empty">
          <DownloadSimple size={56} weight="duotone" />
          <h3>No downloads yet</h3>
          <p>Paste a URL above to begin.</p>
        </div>
      ) : (
        downloads.map((d) => <DownloadCard key={d.id} item={d} />)
      )}
    </div>
  );
}
