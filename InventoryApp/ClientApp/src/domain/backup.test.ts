import { decodeBackup, encodeBackup, prepareImport } from './backup';
import { AppData, InventoryItem } from '../types';

function item(id: string, name = id): InventoryItem {
  return {
    id,
    name,
    category: 'Category',
    location: 'Kitchen',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  };
}

it('round-trips Unicode inventory data and shopping-list state', () => {
  const data: AppData = {
    version: 1,
    items: [item('coffee', 'Café beans ☕')],
    shoppingList: ['coffee'],
  };

  expect(decodeBackup(encodeBackup(data))).toEqual(data);
});

it('rejects malformed backup text without producing replacement data', () => {
  expect(decodeBackup('not base64 data')).toBeNull();
  expect(prepareImport('not base64 data', [item('existing')], ['existing'], false)).toBeNull();
});

it('prepares a replacement while filtering malformed items and list identifiers', () => {
  const encoded = encodeBackup({
    version: 1,
    items: [
      item('valid'),
      { id: 'invalid', name: 'Missing location' } as InventoryItem,
    ],
    shoppingList: ['valid', 42 as unknown as string],
  });

  expect(prepareImport(encoded, [item('existing')], ['existing'], false)).toEqual({
    data: {
      version: 1,
      items: [item('valid')],
      shoppingList: ['valid'],
    },
    importedItemCount: 1,
    skippedItemCount: 1,
  });
});

it('merges only new item identifiers and preserves the current shopping list', () => {
  const encoded = encodeBackup({
    version: 1,
    items: [item('existing', 'Imported duplicate'), item('new')],
    shoppingList: ['new'],
  });

  expect(prepareImport(encoded, [item('existing')], ['existing'], true)).toEqual({
    data: {
      version: 1,
      items: [item('existing'), item('new')],
      shoppingList: ['existing'],
    },
    importedItemCount: 1,
    skippedItemCount: 0,
  });
});
