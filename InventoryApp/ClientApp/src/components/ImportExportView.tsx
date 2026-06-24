import React, { useState } from 'react';
import { InventoryItem, AppData } from '../types';

function encode(data: AppData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decode(str: string): AppData | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str.trim())))) as AppData;
  } catch {
    return null;
  }
}

interface Props {
  items: InventoryItem[];
  shoppingList: string[];
  onImport: (data: AppData) => void;
}

const ImportExportView: React.FC<Props> = ({ items, shoppingList, onImport }) => {
  const [exportStr, setExportStr] = useState('');
  const [importStr, setImportStr] = useState('');
  const [message,   setMessage]   = useState('');
  const [copied,    setCopied]    = useState(false);

  function handleExport() {
    setExportStr(encode({ version: 1, items, shoppingList }));
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(exportStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleImport(merge: boolean) {
    const data = decode(importStr);
    if (!data || !Array.isArray(data.items)) {
      setMessage('❌ Invalid data. Check your paste and try again.');
      return;
    }
    if (merge) {
      const existing = new Set(items.map(i => i.id));
      const added    = data.items.filter(i => !existing.has(i.id));
      onImport({ version: 1, items: [...items, ...added], shoppingList });
      setMessage(`✅ Merged ${added.length} new item${added.length !== 1 ? 's' : ''}.`);
    } else {
      onImport(data);
      setMessage(`✅ Replaced all data (${data.items.length} items).`);
    }
    setImportStr('');
  }

  return (
    <div>
      <div className="view-content">
        <div className="ie-section">
          <h3 className="ie-title">Export</h3>
          <p className="text-muted">Back up your items or share with another device.</p>
          <button className="btn-primary" onClick={handleExport}>Generate Export</button>
          {exportStr && (
            <>
              <textarea className="textarea-code" readOnly value={exportStr} rows={4} />
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
              </button>
            </>
          )}
        </div>

        <div className="ie-divider" />

        <div className="ie-section">
          <h3 className="ie-title">Import</h3>
          <p className="text-muted">Paste exported data from another device below.</p>
          <textarea className="textarea-code" value={importStr}
            onChange={e => { setImportStr(e.target.value); setMessage(''); }}
            placeholder="Paste export data here…" rows={4} />
          <div className="import-actions">
            <button className="btn-primary" disabled={!importStr.trim()}
              onClick={() => handleImport(false)}>Replace All</button>
            <button className="btn-secondary" disabled={!importStr.trim()}
              onClick={() => handleImport(true)}>Merge Items</button>
          </div>
          {message && <p className="import-message">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ImportExportView;
