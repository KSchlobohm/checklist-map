import type {
  AppData,
  BackupData,
  InventoryItem,
  WalkthroughResult,
} from './types.ts'

export const STORAGE_KEY = 'checklist-map:data:v1'
export const THEME_KEY = 'app_theme'

const LEGACY_KEYS = {
  items: 'pantry_items',
  shoppingList: 'shopping_list',
  walkthroughCount: 'walkthrough_count',
  lastWalkthroughAt: 'last_walkthrough_at',
} as const

const STARTER_ITEMS: InventoryItem[] = [
  {
    id: 'seed-1',
    name: 'Coke Zero 2 Liter',
    category: 'Beverages',
    location: 'Basement',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  },
  {
    id: 'seed-2',
    name: 'Milk',
    category: 'Dairy',
    location: 'Kitchen Fridge',
    priority: 5,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  },
  {
    id: 'seed-3',
    name: 'Decaf K-Cups',
    category: 'Coffee',
    location: 'Basement',
    priority: 4,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  },
  {
    id: 'seed-4',
    name: 'Salsa',
    category: 'Condiments',
    location: 'Basement Pantry',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  },
  {
    id: 'seed-5',
    name: 'Oreos',
    category: 'Snacks',
    location: 'Kitchen Pantry',
    priority: 2,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  },
]

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type LoadResult =
  | {
      source: 'seed' | 'legacy' | 'storage'
      data: AppData
      warning?: string
    }
  | {
      source: 'recovery'
      data: null
      error: string
    }

export class DataValidationError extends Error {}
export class DataPersistenceError extends Error {}

export function createDefaultData(): AppData {
  return {
    version: 1,
    items: STARTER_ITEMS.map((item) => ({ ...item })),
    shoppingList: [],
    walkthroughCount: 0,
    lastWalkthroughAt: 0,
  }
}

export function loadAppData(storage: StorageLike): LoadResult {
  try {
    return loadAccessibleAppData(storage)
  } catch (error) {
    return {
      source: 'seed',
      data: createDefaultData(),
      warning:
        error instanceof Error
          ? error.message
          : 'Browser storage is unavailable.',
    }
  }
}

function loadAccessibleAppData(storage: StorageLike): LoadResult {
  const stored = readStorage(storage, STORAGE_KEY)
  if (stored !== null) {
    try {
      return {
        source: 'storage',
        data: validateAppData(JSON.parse(stored) as unknown),
      }
    } catch (error) {
      return {
        source: 'recovery',
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'Saved data could not be read.',
      }
    }
  }

  const legacyItems = readStorage(storage, LEGACY_KEYS.items)
  if (legacyItems !== null) {
    try {
      const validatedItems = validateAppData({
        version: 1,
        items: JSON.parse(legacyItems) as unknown,
        shoppingList: [],
        walkthroughCount: 0,
        lastWalkthroughAt: 0,
      }).items
      const itemIds = new Set(validatedItems.map((item) => item.id))
      const migrated = validateAppData({
        version: 1,
        items: validatedItems,
        shoppingList: parseLegacyStringArray(
          readStorage(storage, LEGACY_KEYS.shoppingList),
        ).filter((id) => itemIds.has(id)),
        walkthroughCount: parseLegacyNumber(
          readStorage(storage, LEGACY_KEYS.walkthroughCount),
          0,
        ),
        lastWalkthroughAt: parseLegacyNumber(
          readStorage(storage, LEGACY_KEYS.lastWalkthroughAt),
          0,
        ),
      })
      const warning = trySaveAppData(storage, migrated)
      return warning
        ? { source: 'legacy', data: migrated, warning }
        : { source: 'legacy', data: migrated }
    } catch (error) {
      if (error instanceof DataPersistenceError) throw error
      return {
        source: 'recovery',
        data: null,
        error:
          error instanceof Error
            ? `Existing data could not be migrated: ${error.message}`
            : 'Existing data could not be migrated.',
      }
    }
  }

  const seeded = createDefaultData()
  const warning = trySaveAppData(storage, seeded)
  return warning
    ? { source: 'seed', data: seeded, warning }
    : { source: 'seed', data: seeded }
}

function readStorage(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch (error) {
    throw new DataPersistenceError(
      error instanceof Error
        ? `Browser storage is unavailable: ${error.message}`
        : 'Browser storage is unavailable.',
    )
  }
}

export function saveAppData(storage: StorageLike, data: AppData): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(validateAppData(data)))
  } catch (error) {
    throw new DataPersistenceError(
      error instanceof Error
        ? `Changes could not be saved: ${error.message}`
        : 'Changes could not be saved.',
    )
  }
}

export function validateAppData(value: unknown): AppData {
  const record = requireRecord(value, 'Saved data')
  if (record.version !== 1) {
    throw new DataValidationError('This data version is not supported.')
  }
  if (!Array.isArray(record.items)) {
    throw new DataValidationError('Saved data is missing inventory items.')
  }
  if (
    !Array.isArray(record.shoppingList) ||
    !record.shoppingList.every((id) => typeof id === 'string')
  ) {
    throw new DataValidationError('The shopping list is invalid.')
  }
  if (
    !Number.isInteger(record.walkthroughCount) ||
    (record.walkthroughCount as number) < 0
  ) {
    throw new DataValidationError('The walkthrough count is invalid.')
  }
  if (
    typeof record.lastWalkthroughAt !== 'number' ||
    record.lastWalkthroughAt < 0
  ) {
    throw new DataValidationError('The walkthrough timestamp is invalid.')
  }

  const items = validateItems(record.items)
  const itemIds = new Set(items.map((item) => item.id))
  const shoppingList = [...new Set(record.shoppingList as string[])]
  if (!shoppingList.every((id) => itemIds.has(id))) {
    throw new DataValidationError(
      'The shopping list references an unknown inventory item.',
    )
  }

  return {
    version: 1,
    items,
    shoppingList,
    walkthroughCount: record.walkthroughCount as number,
    lastWalkthroughAt: record.lastWalkthroughAt,
  }
}

export function validateBackupData(value: unknown): BackupData {
  const record = requireRecord(value, 'Backup data')
  const validated = validateAppData({
    ...record,
    walkthroughCount: 0,
    lastWalkthroughAt: 0,
  })
  return {
    version: 1,
    items: validated.items,
    shoppingList: validated.shoppingList,
  }
}

export function addItem(data: AppData, item: InventoryItem): AppData {
  return validateAppData({
    ...structuredClone(data),
    items: [...data.items, item],
  })
}

export function updateItem(
  data: AppData,
  updatedItem: InventoryItem,
): AppData {
  if (!data.items.some((item) => item.id === updatedItem.id)) {
    throw new DataValidationError('That inventory item no longer exists.')
  }
  return validateAppData({
    ...structuredClone(data),
    items: data.items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item,
    ),
  })
}

export function deleteItem(data: AppData, itemId: string): AppData {
  return validateAppData({
    ...structuredClone(data),
    items: data.items.filter((item) => item.id !== itemId),
    shoppingList: data.shoppingList.filter((id) => id !== itemId),
  })
}

export function replaceBackup(data: AppData, backup: BackupData): AppData {
  return validateAppData({
    ...data,
    items: backup.items,
    shoppingList: backup.shoppingList,
  })
}

export function toggleShoppingItem(data: AppData, itemId: string): AppData {
  const shoppingList = data.shoppingList.includes(itemId)
    ? data.shoppingList.filter((id) => id !== itemId)
    : [...data.shoppingList, itemId]
  return validateAppData({ ...data, shoppingList })
}

export function completeWalkthrough(
  data: AppData,
  result: WalkthroughResult,
  completedAt = Date.now(),
): AppData {
  const checkedIds = new Set(result.checkedItemIds)
  return validateAppData({
    ...data,
    shoppingList: result.finalShoppingList,
    walkthroughCount: data.walkthroughCount + 1,
    lastWalkthroughAt: completedAt,
    items: data.items.map((item) => ({
      ...item,
      needCount: item.needCount + (result.needCountMods[item.id] ?? 0),
      skipCount: item.skipCount + (result.skipCountMods[item.id] ?? 0),
      lastCheckedAt: checkedIds.has(item.id) ? completedAt : item.lastCheckedAt,
    })),
  })
}

function trySaveAppData(
  storage: StorageLike,
  data: AppData,
): string | undefined {
  try {
    saveAppData(storage, data)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'Data could not be saved.'
  }
}

function parseLegacyStringArray(value: string | null): string[] {
  if (value === null) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return []
  }
}

function parseLegacyNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'number' &&
      Number.isFinite(parsed) &&
      parsed >= 0
      ? parsed
      : fallback
  } catch {
    return fallback
  }
}

function validateItems(value: unknown[]): InventoryItem[] {
  const ids = new Set<string>()
  return value.map((candidate, index) => {
    const item = requireRecord(candidate, `Item ${index + 1}`)
    const id = requireString(item, 'id', index)
    const name = requireString(item, 'name', index)
    const category = requireString(item, 'category', index)
    const location = requireString(item, 'location', index)
    const priority = requireNumber(item, 'priority', index)
    const needCount = requireNumber(item, 'needCount', index)
    const skipCount = requireNumber(item, 'skipCount', index)
    const checkEvery = requireNumber(item, 'checkEvery', index)
    const lastCheckedAt = requireNumber(item, 'lastCheckedAt', index)

    if (id.trim() === '') {
      throw new DataValidationError(`Item ${index + 1} has an invalid ID.`)
    }
    if (ids.has(id)) {
      throw new DataValidationError(`Item ${index + 1} has a duplicate ID.`)
    }
    ids.add(id)

    if (name.trim() === '') {
      throw new DataValidationError(`Item ${index + 1} needs a name.`)
    }
    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 5
    ) {
      throw new DataValidationError(
        `Item ${index + 1} has an invalid priority.`,
      )
    }
    if (
      !Number.isInteger(needCount) ||
      needCount < 0 ||
      !Number.isInteger(skipCount) ||
      skipCount < 0 ||
      !Number.isInteger(checkEvery) ||
      checkEvery < 0 ||
      lastCheckedAt < 0
    ) {
      throw new DataValidationError(
        `Item ${index + 1} has invalid tracking values.`,
      )
    }

    return {
      id,
      name: name.trim(),
      category: category.trim(),
      location: location.trim(),
      priority,
      needCount,
      skipCount,
      checkEvery,
      lastCheckedAt,
    }
  })
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  itemIndex: number,
): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new DataValidationError(
      `Item ${itemIndex + 1} has an invalid ${field}.`,
    )
  }
  return value
}

function requireNumber(
  record: Record<string, unknown>,
  field: string,
  itemIndex: number,
): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DataValidationError(
      `Item ${itemIndex + 1} has an invalid ${field}.`,
    )
  }
  return value
}

function requireRecord(
  value: unknown,
  description: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DataValidationError(`${description} must be an object.`)
  }
  return value as Record<string, unknown>
}
