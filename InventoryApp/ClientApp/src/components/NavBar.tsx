import React from 'react';
import { ViewName } from '../types';

interface Props {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}

const NAV_ITEMS: { view: ViewName; icon: string; label: string }[] = [
  { view: 'home',         icon: '🏠', label: 'Home'  },
  { view: 'list',         icon: '🛒', label: 'List'  },
  { view: 'manage',       icon: '📝', label: 'Items' },
  { view: 'importExport', icon: '📤', label: 'Data'  },
];

const NavBar: React.FC<Props> = ({ currentView, onNavigate }) => (
  <nav className="bottom-nav">
    {NAV_ITEMS.map(({ view, icon, label }) => (
      <button
        key={view}
        className={`nav-item${currentView === view ? ' active' : ''}`}
        onClick={() => onNavigate(view)}
      >
        <span className="nav-icon-wrap">
          <span className="nav-icon">{icon}</span>
        </span>
        <span>{label}</span>
      </button>
    ))}
  </nav>
);

export default NavBar;
