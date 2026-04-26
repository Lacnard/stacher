import clsx from 'clsx';
import {
  ListBullets,
  ClockCounterClockwise,
  Cookie,
  GearSix,
  Info
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import markUrl from '../assets/stacher-mark.svg';

export type NavKey = 'downloads' | 'history' | 'logins' | 'settings' | 'about';

interface Item {
  key: NavKey;
  label: string;
  icon: ReactNode;
  group: 'Downloads' | 'Authentication' | 'System';
}

const ICON_SIZE = 18;

const ITEMS: Item[] = [
  {
    key: 'downloads',
    label: 'Queue',
    icon: <ListBullets size={ICON_SIZE} weight="regular" />,
    group: 'Downloads'
  },
  {
    key: 'history',
    label: 'History',
    icon: <ClockCounterClockwise size={ICON_SIZE} weight="regular" />,
    group: 'Downloads'
  },
  {
    key: 'logins',
    label: 'Cookies & logins',
    icon: <Cookie size={ICON_SIZE} weight="regular" />,
    group: 'Authentication'
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <GearSix size={ICON_SIZE} weight="regular" />,
    group: 'System'
  },
  {
    key: 'about',
    label: 'About',
    icon: <Info size={ICON_SIZE} weight="regular" />,
    group: 'System'
  }
];

interface Props {
  current: NavKey;
  onNavigate: (k: NavKey) => void;
  counts: { active: number };
}

export default function Sidebar({ current, onNavigate, counts }: Props) {
  const groups: Item['group'][] = ['Downloads', 'Authentication', 'System'];

  return (
    <aside className="sidebar">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 16px'
        }}
      >
        <img src={markUrl} height={22} alt="" />
        <span
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          Stacher
        </span>
      </div>

      {groups.map((g) => (
        <div key={g}>
          <div className="nav-h">{g}</div>
          {ITEMS.filter((it) => it.group === g).map((it) => {
            const badge =
              it.key === 'downloads' && counts.active > 0
                ? counts.active
                : null;
            return (
              <button
                key={it.key}
                onClick={() => onNavigate(it.key)}
                className={clsx('nav-item', current === it.key && 'active')}
              >
                {it.icon}
                <span>{it.label}</span>
                {badge != null && <span className="badge">{badge}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
