import React, { useState } from 'react';
import { InventoryItem } from '../types';

function blankItem(): InventoryItem {
  return {
    id: Date.now().toString(),
    name: '', category: '', location: '',
    priority: 3, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  };
}

interface FormProps {
  item: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
  submitLabel: string;
}

const ItemForm: React.FC<FormProps> = ({ item: initial, onSave, onCancel, submitLabel }) => {
  const [d, setD] = useState<InventoryItem>(initial);
  const set = (f: keyof InventoryItem, v: string | number) => setD(prev => ({ ...prev, [f]: v }));

  return (
    <div className="item-form">
      <div className="form-row">
        <input className="form-input" placeholder="Item name *" value={d.name}
          onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-row">
        <input className="form-input" placeholder="Location (e.g. Pantry)" value={d.location}
          onChange={e => set('location', e.target.value)} />
        <input className="form-input" placeholder="Category (e.g. Snacks)" value={d.category}
          onChange={e => set('category', e.target.value)} />
      </div>
      <div className="form-row form-row-inline">
        <span className="form-label">Priority</span>
        <div className="priority-buttons">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              className={`priority-btn${d.priority === n ? ' active' : ''}`}
              onClick={() => set('priority', n)}>{n}</button>
          ))}
        </div>
        <span className="form-label">Check every</span>
        <select className="form-select" value={d.checkEvery}
          onChange={e => set('checkEvery', Number(e.target.value))}>
          {[1, 2, 3, 4, 6, 8].map(n => (
            <option key={n} value={n}>
              {n === 1 ? 'Every time' : `Every ${n}×`}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row form-row-actions">
        <button className="btn-primary" disabled={!d.name.trim()}
          onClick={() => d.name.trim() && onSave(d)}>{submitLabel}</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

interface Props {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const ManageItemsView: React.FC<Props> = ({ items, onAdd, onUpdate, onDelete }) => {
  const [adding, setAdding]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const loc = item.location || 'No Location';
    (acc[loc] = acc[loc] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="view-content">
        {!adding && !editingId && (
          <button className="btn-primary btn-full" onClick={() => setAdding(true)}>
            + Add Item
          </button>
        )}

        {adding && (
          <ItemForm
            item={blankItem()}
            onSave={item => { onAdd(item); setAdding(false); }}
            onCancel={() => setAdding(false)}
            submitLabel="Add Item"
          />
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No items yet. Add something to get started.</p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([loc, its]) => (
              <div key={loc}>
                <div className="section-title">{loc}</div>
                <ul className="item-list">
                  {its
                    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
                    .map(item => (
                      <li key={item.id}>
                        {editingId === item.id ? (
                          <ItemForm
                            item={item}
                            onSave={updated => { onUpdate(updated); setEditingId(null); }}
                            onCancel={() => setEditingId(null)}
                            submitLabel="Save"
                          />
                        ) : (
                          <div className="item-row">
                            <div className="item-row-content">
                              <span className="item-name">{item.name}</span>
                              <div className="item-meta">
                                {item.category && (
                                  <span className="item-category-tag">{item.category}</span>
                                )}
                                <span className="priority-tag">P{item.priority}</span>
                                {item.checkEvery > 1 && (
                                  <span className="freq-tag">÷{item.checkEvery}</span>
                                )}
                              </div>
                            </div>
                            <div className="item-row-actions">
                              <button className="btn-icon" onClick={() => setEditingId(item.id)}
                                aria-label="Edit">✏️</button>
                              <button className="btn-icon" aria-label="Delete"
                                onClick={() => window.confirm(`Delete "${item.name}"?`) && onDelete(item.id)}>
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default ManageItemsView;
