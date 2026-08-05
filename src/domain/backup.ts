import { validateBackupData } from '../data.ts'
import type { BackupData, InventoryItem } from '../types.ts'

export interface PreparedImport {
  data: BackupData
  importedItemCount: number
  skippedItemCount: number
}

export function encodeBackup(data: BackupData): string {
  const json = JSON.stringify(validateBackupData(data))
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function decodeBackup(value: string): BackupData | null {
  return decodeBackupWithReport(value)?.data ?? null
}

function decodeBackupWithReport(
  value: string,
): { data: BackupData; skippedItemCount: number } | null {
  try {
    const binary = atob(value.trim())
    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    )
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return null
    }
    const record = decoded as Record<string, unknown>
    if (
      record.version !== 1 ||
      !Array.isArray(record.items) ||
      !Array.isArray(record.shoppingList)
    ) {
      return null
    }

    const items: InventoryItem[] = []
    for (const candidate of record.items) {
      try {
        const validated = validateBackupData({
          version: 1,
          items: [candidate],
          shoppingList: [],
        })
        const item = validated.items[0]
        if (item && !items.some((existing) => existing.id === item.id)) {
          items.push(item)
        }
      } catch {
        // A damaged item must not prevent recovery of the remaining backup.
      }
    }
    const itemIds = new Set(items.map((item) => item.id))
    const shoppingList = record.shoppingList.filter(
      (id): id is string => typeof id === 'string' && itemIds.has(id),
    )
    return {
      data: validateBackupData({
        version: 1,
        items,
        shoppingList,
      }),
      skippedItemCount: record.items.length - items.length,
    }
  } catch {
    return null
  }
}

export function prepareImport(
  value: string,
  currentItems: InventoryItem[],
  currentShoppingList: string[],
  merge: boolean,
): PreparedImport | null {
  const decoded = decodeBackupWithReport(value)
  if (!decoded) return null

  if (merge) {
    const existingIds = new Set(currentItems.map((item) => item.id))
    const addedItems = decoded.data.items.filter(
      (item) => !existingIds.has(item.id),
    )
    return {
      data: {
        version: 1,
        items: [...currentItems, ...addedItems],
        shoppingList: currentShoppingList,
      },
      importedItemCount: addedItems.length,
      skippedItemCount: decoded.skippedItemCount,
    }
  }

  return {
    data: decoded.data,
    importedItemCount: decoded.data.items.length,
    skippedItemCount: decoded.skippedItemCount,
  }
}
