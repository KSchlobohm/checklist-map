import { AppData, InventoryItem } from '../types';

export interface PreparedImport {
  data: AppData;
  importedItemCount: number;
  skippedItemCount: number;
}

export function encodeBackup(data: AppData): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeBackup(value: string): AppData | null {
  try {
    const binary = atob(value.trim());
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as AppData;
  } catch {
    return null;
  }
}

export function prepareImport(
  value: string,
  currentItems: InventoryItem[],
  currentShoppingList: string[],
  merge: boolean
): PreparedImport | null {
  const decoded = decodeBackup(value);
  if (!decoded || !Array.isArray(decoded.items)) {
    return null;
  }

  const safeItems = sanitizeItems(decoded.items);
  const safeShoppingList = Array.isArray(decoded.shoppingList)
    ? decoded.shoppingList.filter((id): id is string => typeof id === 'string')
    : [];
  const skippedItemCount = decoded.items.length - safeItems.length;

  if (merge) {
    const existingIds = new Set(currentItems.map(item => item.id));
    const addedItems = safeItems.filter(item => !existingIds.has(item.id));
    return {
      data: {
        version: 1,
        items: [...currentItems, ...addedItems],
        shoppingList: currentShoppingList,
      },
      importedItemCount: addedItems.length,
      skippedItemCount,
    };
  }

  return {
    data: {
      version: 1,
      items: safeItems,
      shoppingList: safeShoppingList,
    },
    importedItemCount: safeItems.length,
    skippedItemCount,
  };
}

function sanitizeItems(items: unknown[]): InventoryItem[] {
  return items.filter(
    (item): item is InventoryItem =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as InventoryItem).id === 'string' &&
      typeof (item as InventoryItem).name === 'string' &&
      typeof (item as InventoryItem).location === 'string'
  );
}
