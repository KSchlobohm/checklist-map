import type {
  HistoryEntry,
  InventoryItem,
  WalkthroughResult,
} from '../types.ts'

export function buildWalkthroughQueue(
  items: InventoryItem[],
  walkthroughCount: number,
): InventoryItem[] {
  const due = items.filter((item) => {
    const every = item.checkEvery > 0 ? item.checkEvery : 1
    return walkthroughCount % every === 0
  })

  return [...due].sort((left, right) => {
    const locationComparison = left.location.localeCompare(right.location)
    if (locationComparison !== 0) return locationComparison
    if (right.priority !== left.priority) return right.priority - left.priority
    return right.needCount - left.needCount
  })
}

export function applyWalkthroughHistory(
  initialShoppingList: string[],
  history: HistoryEntry[],
): string[] {
  let shoppingList = [...initialShoppingList]

  for (const { item, vote } of history) {
    if (vote === 'need' && !shoppingList.includes(item.id)) {
      shoppingList = [...shoppingList, item.id]
    } else if (vote === 'have') {
      shoppingList = shoppingList.filter((id) => id !== item.id)
    }
  }

  return shoppingList
}

export function buildWalkthroughResult(
  history: HistoryEntry[],
  finalShoppingList: string[],
): WalkthroughResult {
  const needCountMods: Record<string, number> = {}
  const skipCountMods: Record<string, number> = {}
  const checkedItemIds: string[] = []

  for (const { item, vote } of history) {
    checkedItemIds.push(item.id)
    if (vote === 'need') {
      needCountMods[item.id] = (needCountMods[item.id] ?? 0) + 1
    }
    if (vote === 'skip') {
      skipCountMods[item.id] = (skipCountMods[item.id] ?? 0) + 1
    }
  }

  return {
    finalShoppingList,
    needCountMods,
    skipCountMods,
    checkedItemIds,
  }
}
