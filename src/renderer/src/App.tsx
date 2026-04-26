import { useEffect, useMemo, useState } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar, { type NavKey } from './components/Sidebar';
import StatusBar from './components/StatusBar';
import Downloads from './pages/Downloads';
import History from './pages/History';
import SiteLogins from './pages/SiteLogins';
import Settings from './pages/Settings';
import About from './pages/About';
import Toasts from './components/Toasts';
import { useStore } from './store';
import ErrorBoundary from './components/ErrorBoundary';

const TITLES: Record<NavKey, string> = {
  downloads: 'Queue',
  history: 'History',
  logins: 'Cookies & logins',
  settings: 'Settings',
  about: 'About'
};

export default function App() {
  const [page, setPage] = useState<NavKey>('downloads');
  const hydrate = useStore((s) => s.hydrate);
  const theme = useStore((s) => s.settings?.theme ?? 'dark');
  const downloads = useStore((s) => s.downloads);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const active = useMemo(
    () => downloads.filter((d) => d.status === 'running' || d.status === 'queued').length,
    [downloads]
  );

  return (
    <div className="win">
      <TitleBar subtitle={TITLES[page]} />
      <div className="main">
        <Sidebar current={page} onNavigate={setPage} counts={{ active }} />
        <div className="content">
          <ErrorBoundary>
            {page === 'downloads' && <Downloads />}
            {page === 'history' && <History />}
            {page === 'logins' && <SiteLogins />}
            {page === 'settings' && <Settings />}
            {page === 'about' && <About />}
          </ErrorBoundary>
        </div>
      </div>
      <StatusBar active={active} />
      <Toasts />
    </div>
  );
}
