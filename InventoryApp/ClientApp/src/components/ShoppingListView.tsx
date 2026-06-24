import React from 'react';
import { InventoryItem } from '../types';

interface Props {
  items: InventoryItem[];
  shoppingList: string[];
  onToggleItem: (id: string) => void;
  onClearAll: () => void;
}

const ShoppingListView: React.FC<Props> = ({ items, shoppingList, onToggleItem, onClearAll }) => {
  const needed  = items.filter(i => shoppingList.includes(i.id));
  const grouped = needed.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const loc = item.location || 'Other';
    (acc[loc] = acc[loc] || []).push(item);
    return acc;
  }, {});
  const textList = Object.entries(grouped)
    .map(([loc, its]) => `${loc}:\n${its.map(i => `  - ${i.name}`).join('\n')}`)
    .join('\n\n');

  return (
    <div>
      <div className="view-content">
        {needed.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>Your shopping list is empty.</p>
          </div>
        ) : (
          <>
            <div className="list-actions">
              <button
                className="btn-secondary btn-sm"
                onClick={() => navigator.clipboard?.writeText(textList)}
              >
                📋 Copy as Text
              </button>
              <button className="btn-danger btn-sm" onClick={onClearAll}>
                Clear All
              </button>
            </div>

            {Object.entries(grouped).map(([loc, its]) => (
              <div key={loc}>
                <div className="section-title">{loc}</div>
                <ul className="item-list">
                  {its.map(item => (
                    <li key={item.id} className="item-row">
                      <button
                        className="check-btn"
                        onClick={() => onToggleItem(item.id)}
                        aria-label="Mark purchased"
                      >
                        ○
                      </button>
                      <span className="item-name">{item.name}</span>
                      {item.category && (
                        <span className="item-category-tag">{item.category}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingListView;
