import React, { useState } from 'react';
import './App.css';
import { useInventory } from './store/useInventory';
import { useTheme } from './store/useTheme';
import type { Theme } from './store/useTheme';
import { ViewName, WalkthroughResult } from './types';
import NavBar from './components/NavBar';
import HomeView from './components/HomeView';
import WalkthroughView from './components/WalkthroughView';
import ShoppingListView from './components/ShoppingListView';
import ManageItemsView from './components/ManageItemsView';
import ImportExportView from './components/ImportExportView';

function getInitialView(): ViewName {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'list' || view === 'manage' || view === 'importExport') {
    return view;
  }
  return 'home';
}

function App() {
  const [view, setView] = useState<ViewName>(getInitialView);
  const inv = useInventory();
  const { theme, toggle }: { theme: Theme; toggle: () => void } = useTheme();

  const handleWalkthroughDone = (result: WalkthroughResult) => {
    inv.saveShoppingList(result.finalShoppingList);
    const updatedItems = inv.items.map(item => ({
      ...item,
      needCount: item.needCount + (result.needCountMods[item.id] ?? 0),
      skipCount: item.skipCount + (result.skipCountMods[item.id] ?? 0),
      lastCheckedAt: result.checkedItemIds.includes(item.id)
        ? Date.now()
        : item.lastCheckedAt,
    }));
    inv.saveItems(updatedItems);
    inv.incrementWalkthroughCount();
    setView('list');
  };

  return (
    <div className="app">
      {view !== 'walkthrough' && view !== 'home' && (
        <header className="app-topbar">
          <span className="app-topbar-title">
            {{ list: 'Shopping List', manage: 'Inventory Items', importExport: 'Import / Export' }[view] ?? ''}
          </span>
          {view === 'list' && inv.shoppingList.length > 0 && (
            <span className="badge">{inv.shoppingList.length}</span>
          )}
          <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
      )}
      <main className="app-main">
        {view === 'home' && (
          <HomeView
            items={inv.items}
            shoppingList={inv.shoppingList}
            lastWalkthroughAt={inv.lastWalkthroughAt}
            theme={theme}
            onToggleTheme={toggle}
            onStartWalkthrough={() => setView('walkthrough')}
            onViewList={() => setView('list')}
          />
        )}
        {view === 'walkthrough' && (
          <WalkthroughView
            items={inv.items}
            initialShoppingList={inv.shoppingList}
            walkthroughCount={inv.walkthroughCount}
            onDone={handleWalkthroughDone}
          />
        )}
        {view === 'list' && (
          <ShoppingListView
            items={inv.items}
            shoppingList={inv.shoppingList}
            onToggleItem={id => {
              const next = inv.shoppingList.includes(id)
                ? inv.shoppingList.filter(i => i !== id)
                : [...inv.shoppingList, id];
              inv.saveShoppingList(next);
            }}
            onClearAll={() => inv.saveShoppingList([])}
          />
        )}
        {view === 'manage' && (
          <ManageItemsView
            items={inv.items}
            onAdd={inv.addItem}
            onUpdate={inv.updateItem}
            onDelete={inv.deleteItem}
          />
        )}
        {view === 'importExport' && (
          <ImportExportView
            items={inv.items}
            shoppingList={inv.shoppingList}
            onImport={inv.importData}
          />
        )}
      </main>
      {view !== 'walkthrough' && (
        <NavBar currentView={view} onNavigate={setView} />
      )}
    </div>
  );
}

export default App;
