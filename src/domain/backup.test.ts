import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeBackup, encodeBackup, prepareImport } from './backup.ts'
import type { BackupData, InventoryItem } from '../types.ts'

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
  }
}

test('a backup round trip retains Unicode and shopping-list state', () => {
  const data: BackupData = {
    version: 1,
    items: [item('coffee', 'Café beans ☕')],
    shoppingList: ['coffee'],
  }

  assert.deepEqual(decodeBackup(encodeBackup(data)), data)
})

test('malformed and unsupported backups are rejected', () => {
  assert.equal(decodeBackup('not base64 data'), null)

  const unsupported = Buffer.from(
    JSON.stringify({ version: 99, items: [], shoppingList: [] }),
  ).toString('base64')
  assert.equal(decodeBackup(unsupported), null)
})

test('replacement imports preserve the complete validated backup', () => {
  const encoded = encodeBackup({
    version: 1,
    items: [item('valid')],
    shoppingList: ['valid'],
  })

  assert.deepEqual(
    prepareImport(encoded, [item('existing')], ['existing'], false),
    {
      data: {
        version: 1,
        items: [item('valid')],
        shoppingList: ['valid'],
      },
      importedItemCount: 1,
    },
  )
})

test('merge imports add only new identifiers and retain the current list', () => {
  const encoded = encodeBackup({
    version: 1,
    items: [item('existing', 'Imported duplicate'), item('new')],
    shoppingList: ['new'],
  })

  assert.deepEqual(
    prepareImport(encoded, [item('existing')], ['existing'], true),
    {
      data: {
        version: 1,
        items: [item('existing'), item('new')],
        shoppingList: ['existing'],
      },
      importedItemCount: 1,
    },
  )
})
