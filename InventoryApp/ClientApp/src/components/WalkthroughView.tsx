import React, { useState, useMemo } from 'react';
import { InventoryItem, Vote, HistoryEntry, WalkthroughResult } from '../types';
import {
  applyWalkthroughHistory,
  buildWalkthroughQueue,
  buildWalkthroughResult,
} from '../domain/walkthrough';

interface Props {
  items: InventoryItem[];
  initialShoppingList: string[];
  walkthroughCount: number;
  onDone: (result: WalkthroughResult) => void;
}

const WalkthroughView: React.FC<Props> = ({
  items, initialShoppingList, walkthroughCount, onDone,
}) => {
  const [queue] = useState<InventoryItem[]>(() =>
    buildWalkthroughQueue(items, walkthroughCount)
  );
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [completed, setCompleted] = useState(false);

  const currentList = useMemo(
    () => applyWalkthroughHistory(initialShoppingList, history),
    [initialShoppingList, history]
  );

  const current = queue[index];
  const total   = queue.length;
  const canBack = history.length > 0;

  function castVote(v: Vote) {
    if (!current) return;
    const next = [...history, { item: current, vote: v }];
    setHistory(next);
    if (index + 1 >= total) {
      setCompleted(true);
    } else {
      setIndex(i => i + 1);
    }
  }

  function undoBack() {
    if (!canBack) return;
    setCompleted(false);
    setHistory(h => h.slice(0, -1));
    setIndex(i => Math.max(0, i - 1));
  }

  function endEarly() {
    onDone(buildWalkthroughResult(history, currentList));
  }

  // ── Empty queue ──────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="walkthrough-container">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No items are due for this walkthrough.</p>
          <button className="btn-primary" onClick={() =>
            onDone({ finalShoppingList: initialShoppingList, needCountMods: {}, skipCountMods: {}, checkedItemIds: [] })
          }>Done</button>
        </div>
      </div>
    );
  }

  // ── Completion screen ────────────────────────────────────
  if (completed) {
    const needed  = items.filter(i => currentList.includes(i.id));
    const grouped = needed.reduce<Record<string, InventoryItem[]>>((acc, item) => {
      const loc = item.location || 'Other';
      (acc[loc] = acc[loc] || []).push(item);
      return acc;
    }, {});
    const textList = Object.entries(grouped)
      .map(([loc, its]) => `${loc}:\n${its.map(i => `  - ${i.name}`).join('\n')}`)
      .join('\n\n');

    return (
      <div className="walkthrough-container">
        <div className="completion-screen">
          <div className="completion-icon">✅</div>
          <div className="completion-title">All Done!</div>
          <p className="text-muted">
            {needed.length} item{needed.length !== 1 ? 's' : ''} on your list
          </p>

          {needed.length > 0 ? (
            <div className="completion-list">
              {Object.entries(grouped).map(([loc, its]) => (
                <div key={loc}>
                  <div className="section-title">{loc}</div>
                  {its.map(item => (
                    <div key={item.id} className="item-row">
                      <span className="need-dot">●</span>
                      <span className="item-name">{item.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">Nothing needed — you're all stocked up!</p>
          )}

          <div className="completion-actions">
            {needed.length > 0 && (
              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard?.writeText(textList)}
              >
                📋 Copy List as Text
              </button>
            )}
            <button
              className="btn-have"
              onClick={() => onDone(buildWalkthroughResult(history, currentList))}
            >
              Save &amp; Done
            </button>
            <button className="btn-nav" onClick={undoBack} disabled={!canBack}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main card ────────────────────────────────────────────
  const pct = total > 0 ? (index / total) * 100 : 0;

  return (
    <div className="walkthrough-container">
      <div className="progress-bar-container">
        <div className="progress-label">
          <span>{index + 1} / {total}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="item-card">
        <div className="item-location-label">{current.location}</div>
        <div className="item-name-large">{current.name}</div>
        {current.category && (
          <div className="item-category-label">{current.category}</div>
        )}
      </div>

      {/* Actions anchored to bottom — most important at the very bottom */}
      <div className="walkthrough-actions">
        <button className="btn-end" onClick={endEarly}>End Walkthrough</button>
        <div className="nav-buttons">
          <button className="btn-nav" onClick={undoBack} disabled={!canBack}>← Back</button>
          <button className="btn-nav btn-skip" onClick={() => castVote('skip')}>Skip →</button>
        </div>
        <div className="vote-buttons">
          <button className="btn-have" onClick={() => castVote('have')}>✓ Have It</button>
          <button className="btn-need" onClick={() => castVote('need')}>🛒 Need It</button>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughView;
