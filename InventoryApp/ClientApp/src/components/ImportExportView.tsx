import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AppData, InventoryItem } from '../types';
import { encodeBackup, prepareImport } from '../domain/backup';

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
  const [shareUrl] = useState(() => {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('view', 'importExport');
    return url.toString();
  });
  const [shareUrlError, setShareUrlError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const generateQr = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(shareUrl, { width: 220, margin: 1 });
        if (mounted) {
          setQrCodeDataUrl(dataUrl);
        }
      } catch {
        if (!mounted) {
          return;
        }
        setQrCodeDataUrl('');
        setShareUrlError('Unable to generate QR code for the configured URL.');
      }
    };
    void generateQr();
    return () => {
      mounted = false;
    };
  }, [shareUrl]);

  function handleExport() {
    setExportStr(encodeBackup({ version: 1, items, shoppingList }));
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(exportStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleImport(merge: boolean) {
    const prepared = prepareImport(importStr, items, shoppingList, merge);
    if (!prepared) {
      setMessage('❌ Invalid data. Check your paste and try again.');
      return;
    }
    const skipped = prepared.skippedItemCount;
    const skipNote = skipped > 0
      ? ` (${skipped} malformed item${skipped !== 1 ? 's' : ''} skipped)`
      : '';
    onImport(prepared.data);
    if (merge) {
      const added = prepared.importedItemCount;
      setMessage(`✅ Merged ${added} new item${added !== 1 ? 's' : ''}${skipNote}.`);
    } else {
      const imported = prepared.importedItemCount;
      setMessage(`✅ Replaced all data (${imported} item${imported !== 1 ? 's' : ''})${skipNote}.`);
    }
    setImportStr('');
  }

  return (
    <div>
      <div className="view-content">
        <div className="ie-section">
          <h3 className="ie-title">Open on Phone</h3>
          <p className="text-muted">Scan this QR code to open this Data page on your phone.</p>
          <div className="qr-share">
            {qrCodeDataUrl && (
              <img className="qr-image" src={qrCodeDataUrl} alt={`QR code for ${shareUrl}`} />
            )}
            <a className="qr-link" href={shareUrl} target="_blank" rel="noreferrer">
              {shareUrl}
            </a>
          </div>
          {shareUrlError && <p className="import-message">{shareUrlError}</p>}
        </div>

        <div className="ie-divider" />

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
