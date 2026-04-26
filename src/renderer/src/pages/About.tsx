import { useEffect, useState } from 'react';
import markUrl from '../assets/stacher-mark.svg';

export default function About() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.stacher.ytdlp.version().then(setVersion);
  }, []);

  return (
    <div
      className="page"
      style={{
        textAlign: 'center',
        paddingTop: 64,
        maxWidth: 520,
        marginInline: 'auto'
      }}
    >
      <img
        src={markUrl}
        width={64}
        height={64}
        alt=""
        style={{ marginBottom: 16 }}
      />
      <h2 style={{ fontSize: 28 }}>Stacher</h2>
      <p className="desc">
        A professional yt-dlp / ffmpeg download manager for Windows.
      </p>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--fg-tertiary)',
          marginTop: 24
        }}
      >
        yt-dlp {version ?? 'unknown'} · Electron · Windows
      </p>
    </div>
  );
}
