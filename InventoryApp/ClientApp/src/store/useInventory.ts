import { useState, useCallback } from 'react';
import { InventoryItem, AppData } from '../types';

const ITEMS_KEY = 'pantry_items';
const LIST_KEY = 'shopping_list';
const COUNT_KEY = 'walkthrough_count';
const LAST_KEY  = 'last_walkthrough_at';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/storage errors
  }
}

const SEED: InventoryItem[] = [
  {
    id: 'seed-1', name: 'Coke Zero 2 Liter', category: 'Beverages',
    location: 'Basement', priority: 3, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  },
  {
    id: 'seed-2', name: 'Milk', category: 'Dairy',
    location: 'Kitchen Fridge', priority: 5, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  },
  {
    id: 'seed-3', name: 'Decaf K-Cups', category: 'Coffee',
    location: 'Basement', priority: 4, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  },
  {
    id: 'seed-4', name: 'Salsa', category: 'Condiments',
    location: 'Basement Pantry', priority: 3, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  },
  {
    id: 'seed-5', name: 'Oreos', category: 'Snacks',
    location: 'Kitchen Pantry', priority: 2, needCount: 0, skipCount: 0,
    checkEvery: 1, lastCheckedAt: 0,
  },
];

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (raw === null) {
      persist(ITEMS_KEY, SEED);
      return SEED;
    }
    const stored = load<InventoryItem[]>(ITEMS_KEY, []);
    return stored;
  });

  const [shoppingList, setShoppingList] = useState<string[]>(() =>
    load<string[]>(LIST_KEY, [])
  );

  const [walkthroughCount, setWalkthroughCount] = useState<number>(() =>
    load<number>(COUNT_KEY, 0)
  );

  const [lastWalkthroughAt, setLastWalkthroughAt] = useState<number>(() =>
    load<number>(LAST_KEY, 0)
  );

  const saveItems = useCallback((next: InventoryItem[]) => {
    persist(ITEMS_KEY, next);
    setItems(next);
  }, []);

  const saveShoppingList = useCallback((ids: string[]) => {
    persist(LIST_KEY, ids);
    setShoppingList(ids);
  }, []);

  const addItem = useCallback((item: InventoryItem) => {
    setItems(prev => {
      const next = [...prev, item];
      persist(ITEMS_KEY, next);
      return next;
    });
  }, []);

  const updateItem = useCallback((updated: InventoryItem) => {
    setItems(prev => {
      const next = prev.map(i => (i.id === updated.id ? updated : i));
      persist(ITEMS_KEY, next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      persist(ITEMS_KEY, next);
      return next;
    });
    setShoppingList(prev => {
      const next = prev.filter(i => i !== id);
      persist(LIST_KEY, next);
      return next;
    });
  }, []);

  const incrementWalkthroughCount = useCallback(() => {
    setWalkthroughCount(prev => {
      const next = prev + 1;
      persist(COUNT_KEY, next);
      return next;
    });
    const now = Date.now();
    persist(LAST_KEY, now);
    setLastWalkthroughAt(now);
  }, []);

  const importData = useCallback((data: AppData) => {
    persist(ITEMS_KEY, data.items);
    persist(LIST_KEY, data.shoppingList);
    setItems(data.items);
    setShoppingList(data.shoppingList);
  }, []);

  return {
    items,
    shoppingList,
    walkthroughCount,
    lastWalkthroughAt,
    saveItems,
    saveShoppingList,
    addItem,
    updateItem,
    deleteItem,
    incrementWalkthroughCount,
    importData,
  };
}
