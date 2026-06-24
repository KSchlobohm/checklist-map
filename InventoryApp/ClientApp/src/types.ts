export type Vote = 'need' | 'have' | 'skip';

export type ViewName = 'home' | 'walkthrough' | 'list' | 'manage' | 'importExport';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  location: string;
  priority: number;      // 1–5, 5 = highest importance
  needCount: number;     // auto-incremented on "Need It"
  skipCount: number;     // auto-incremented on "Skip"
  checkEvery: number;    // show every N walkthroughs; 1 = every time
  lastCheckedAt: number; // unix timestamp ms
}

export interface HistoryEntry {
  item: InventoryItem;
  vote: Vote;
}

export interface WalkthroughResult {
  finalShoppingList: string[];
  needCountMods: Record<string, number>;
  skipCountMods: Record<string, number>;
  checkedItemIds: string[];
}

export interface AppData {
  version: number;
  items: InventoryItem[];
  shoppingList: string[];
}
