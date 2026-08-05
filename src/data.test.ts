import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DataPersistenceError,
  STORAGE_KEY,
  addItem,
  completeWalkthrough,
  createDefaultData,
  deleteItem,
  loadAppData,
  saveAppData,
  type StorageLike,
} from './data.ts'
import type { InventoryItem } from './types.ts'

function createStorage(initial: Record<string, string> = {}): StorageLike & {
  values: Map<string, string>
} {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

function item(id: string): InventoryItem {
  return {
    id,
    name: id,
    category: '',
    location: 'Kitchen',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  }
}

test('first use stores a validated starter document', () => {
  const storage = createStorage()
  const result = loadAppData(storage)

  assert.equal(result.source, 'seed')
  assert.ok(result.data)
  assert.ok(storage.values.has(STORAGE_KEY))
})

test('legacy keys migrate into one document without being removed', () => {
  const storage = createStorage({
    pantry_items: JSON.stringify([item('legacy')]),
    shopping_list: JSON.stringify(['legacy']),
    walkthrough_count: '4',
    last_walkthrough_at: '1234',
  })

  const result = loadAppData(storage)

  assert.deepEqual(result, {
    source: 'legacy',
    data: {
      version: 1,
      items: [item('legacy')],
      shoppingList: ['legacy'],
      walkthroughCount: 4,
      lastWalkthroughAt: 1234,
    },
  })
  assert.ok(storage.values.has('pantry_items'))
  assert.ok(storage.values.has(STORAGE_KEY))
})

test('invalid current storage is reported and never overwritten', () => {
  const invalid = '{"version":99}'
  const storage = createStorage({ [STORAGE_KEY]: invalid })

  const result = loadAppData(storage)

  assert.equal(result.source, 'recovery')
  assert.equal(result.data, null)
  assert.equal(storage.values.get(STORAGE_KEY), invalid)
})

test('invalid optional legacy metadata falls back without blocking items', () => {
  const storage = createStorage({
    pantry_items: JSON.stringify([item('legacy')]),
    shopping_list: '{bad json',
    walkthrough_count: '"not a number"',
    last_walkthrough_at: '-1',
  })

  const result = loadAppData(storage)

  assert.equal(result.source, 'legacy')
  assert.deepEqual(result.data, {
    version: 1,
    items: [item('legacy')],
    shoppingList: [],
    walkthroughCount: 0,
    lastWalkthroughAt: 0,
  })
})

test('storage write failures are surfaced without replacing the old value', () => {
  const original = JSON.stringify(createDefaultData())
  const storage: StorageLike = {
    getItem: () => original,
    setItem: () => {
      throw new Error('quota exceeded')
    },
  }

  assert.throws(
    () => saveAppData(storage, createDefaultData()),
    (error: unknown) =>
      error instanceof DataPersistenceError &&
      /quota exceeded/.test(error.message),
  )
  assert.equal(storage.getItem(STORAGE_KEY), original)
})

test('storage read failures start with in-memory data and a warning', () => {
  const storage: StorageLike = {
    getItem: () => {
      throw new Error('access denied')
    },
    setItem: () => {
      throw new Error('access denied')
    },
  }

  const result = loadAppData(storage)

  assert.equal(result.source, 'seed')
  assert.ok(result.data)
  assert.match(result.warning ?? '', /access denied/)
})

test('inventory mutations maintain shopping-list references', () => {
  let data = createDefaultData()
  data = addItem(data, item('new'))
  data = {
    ...data,
    shoppingList: ['new'],
  }
  data = deleteItem(data, 'new')

  assert.equal(data.items.some((candidate) => candidate.id === 'new'), false)
  assert.deepEqual(data.shoppingList, [])
})

test('walkthrough completion updates list, counts, and timestamps atomically', () => {
  const storage = createStorage()
  let data = {
    ...createDefaultData(),
    items: [item('checked')],
  }
  data = completeWalkthrough(
    data,
    {
      finalShoppingList: ['checked'],
      needCountMods: { checked: 1 },
      skipCountMods: {},
      checkedItemIds: ['checked'],
    },
    5000,
  )
  saveAppData(storage, data)

  assert.deepEqual(data, {
    version: 1,
    items: [
      {
        ...item('checked'),
        needCount: 1,
        lastCheckedAt: 5000,
      },
    ],
    shoppingList: ['checked'],
    walkthroughCount: 1,
    lastWalkthroughAt: 5000,
  })
  assert.equal(
    JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}').walkthroughCount,
    1,
  )
})
