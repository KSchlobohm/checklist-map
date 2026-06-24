import React from 'react';
import { InventoryItem } from '../types';

interface Props {
  items: InventoryItem[];
  shoppingList: string[];
  lastWalkthroughAt: number;
  theme: string;
  onToggleTheme: () => void;
  onStartWalkthrough: () => void;
  onViewList: () => void;
}

function formatLastWalkthrough(ts: number): string {
  if (!ts) return 'Never';
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
}

const HomeView: React.FC<Props> = ({ items, shoppingList, lastWalkthroughAt, theme, onToggleTheme, onStartWalkthrough, onViewList }) => {
  const neededItems = items.filter(i => shoppingList.includes(i.id));

  return (
    <div>
      <div className="home-hero">
        <div className="hero-row">
          <div>
            <h1>Checklist Map</h1>
            <p>Walk your home. Build your list.</p>
            <p className="hero-last-walked">Last walked: {formatLastWalkthrough(lastWalkthroughAt)}</p>
          </div>
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="view-content">
        <button className="btn-start" onClick={onStartWalkthrough}>
          Start Walkthrough
        </button>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No items yet. Go to Items to add things you want to track.</p>
          </div>
        ) : neededItems.length > 0 ? (
          <div>
            <div className="section-title">
              Shopping List ({neededItems.length} item{neededItems.length !== 1 ? 's' : ''})
            </div>
            <ul className="item-list">
              {neededItems.slice(0, 5).map(item => (
                <li key={item.id} className="item-row">
                  <span className="need-dot">●</span>
                  <span className="item-name">{item.name}</span>
                  <span className="item-location-tag">{item.location}</span>
                </li>
              ))}
            </ul>
            {neededItems.length > 5 && (
              <p className="text-muted text-center">+{neededItems.length - 5} more</p>
            )}
            <button className="btn-outline" onClick={onViewList}>
              View Full List →
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Shopping list is empty. Start a walkthrough to check what you need.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;