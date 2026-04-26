import { useEffect, useState } from 'react';
import { TerminalWindow, Lightning } from '@phosphor-icons/react';

export default function StatusBar({ active }: { active: number }) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.stacher.ytdlp.version().then(setVersion);
  }, []);

  return (
    <div className="statusbar">
      <span className={`dot ${version ? '' : 'off'}`} />
      <span>yt-dlp {version ?? 'not found'}</span>
      <span className="sep">│</span>
      <span>{active} active</span>
      <span className="sep">│</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Lightning size={11} weight="fill" /> NVENC if available
      </span>
      <span className="spacer" />
      <button title="Open terminal">
        <TerminalWindow size={12} weight="regular" />
        Terminal
        <kbd style={{ marginLeft: 6 }}>Ctrl+T</kbd>
      </button>
    </div>
  );
}
