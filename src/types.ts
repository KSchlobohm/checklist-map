export type Vote = 'need' | 'have' | 'skip'

export type ViewName = 'home' | 'walkthrough' | 'list' | 'manage' | 'importExport'

export type Theme = 'dark' | 'light'

export interface InventoryItem {
  id: string
  name: string
  category: string
  location: string
  priority: number
  needCount: number
  skipCount: number
  checkEvery: number
  lastCheckedAt: number
}

export interface HistoryEntry {
  item: InventoryItem
  vote: Vote
}

export interface WalkthroughResult {
  finalShoppingList: string[]
  needCountMods: Record<string, number>
  skipCountMods: Record<string, number>
  checkedItemIds: string[]
}

export interface AppData {
  version: 1
  items: InventoryItem[]
  shoppingList: string[]
  walkthroughCount: number
  lastWalkthroughAt: number
}

export interface BackupData {
  version: 1
  items: InventoryItem[]
  shoppingList: string[]
}
