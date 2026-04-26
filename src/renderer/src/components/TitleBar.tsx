import { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from '@phosphor-icons/react';
import markUrl from '../assets/stacher-mark.svg';

interface Props {
  subtitle: string;
}

export default function TitleBar({ subtitle }: Props) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.stacher.window.isMaximized().then(setMaximized);
    return window.stacher.window.onMaximizeChanged(setMaximized);
  }, []);

  return (
    <div className="titlebar">
      <div className="brand">
        <img src={markUrl} alt="" />
        <span>Stacher</span>
        <span className="title">— {subtitle}</span>
      </div>
      <div />
      <div className="win-controls">
        <button title="Minimize" onClick={() => window.stacher.window.minimize()}>
          <Minus size={12} weight="regular" />
        </button>
        <button
          title={maximized ? 'Restore' : 'Maximize'}
          onClick={() => window.stacher.window.toggleMaximize()}
        >
          {maximized ? <Copy size={11} weight="regular" /> : <Square size={10} weight="regular" />}
        </button>
        <button className="close" title="Close" onClick={() => window.stacher.window.close()}>
          <X size={12} weight="regular" />
        </button>
      </div>
    </div>
  );
}
