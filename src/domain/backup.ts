import { validateBackupData } from '../data.ts'
import type { BackupData, InventoryItem } from '../types.ts'

export interface PreparedImport {
  data: BackupData
  importedItemCount: number
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
  try {
    const binary = atob(value.trim())
    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    )
    return validateBackupData(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
    )
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
  const decoded = decodeBackup(value)
  if (!decoded) return null

  if (merge) {
    const existingIds = new Set(currentItems.map((item) => item.id))
    const addedItems = decoded.items.filter((item) => !existingIds.has(item.id))
    return {
      data: {
        version: 1,
        items: [...currentItems, ...addedItems],
        shoppingList: currentShoppingList,
      },
      importedItemCount: addedItems.length,
    }
  }

  return {
    data: decoded,
    importedItemCount: decoded.items.length,
  }
}
