import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyWalkthroughHistory,
  buildWalkthroughQueue,
  buildWalkthroughResult,
} from './walkthrough.ts'
import type { HistoryEntry, InventoryItem } from '../types.ts'

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'item',
    name: 'Item',
    category: '',
    location: 'Kitchen',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
    ...overrides,
  }
}

test('the walkthrough includes due items and normalizes invalid frequencies', () => {
  const items = [
    item({ id: 'always', checkEvery: 1 }),
    item({ id: 'every-two', checkEvery: 2 }),
    item({ id: 'invalid', checkEvery: 0 }),
  ]

  assert.deepEqual(
    buildWalkthroughQueue(items, 1).map((candidate) => candidate.id),
    ['always', 'invalid'],
  )
  assert.deepEqual(
    buildWalkthroughQueue(items, 2).map((candidate) => candidate.id),
    ['always', 'every-two', 'invalid'],
  )
})

test('the walkthrough sorts by location, priority, and prior need count', () => {
  const items = [
    item({
      id: 'basement-low',
      location: 'Basement',
      priority: 2,
      needCount: 10,
    }),
    item({ id: 'kitchen', location: 'Kitchen', priority: 5 }),
    item({
      id: 'basement-needed',
      location: 'Basement',
      priority: 5,
      needCount: 4,
    }),
    item({
      id: 'basement-less-needed',
      location: 'Basement',
      priority: 5,
      needCount: 1,
    }),
  ]

  assert.deepEqual(
    buildWalkthroughQueue(items, 0).map((candidate) => candidate.id),
    [
      'basement-needed',
      'basement-less-needed',
      'basement-low',
      'kitchen',
    ],
  )
})

test('votes add, remove, or retain shopping-list items', () => {
  const needed = item({ id: 'needed' })
  const available = item({ id: 'available' })
  const skipped = item({ id: 'skipped' })
  const history: HistoryEntry[] = [
    { item: needed, vote: 'need' },
    { item: needed, vote: 'need' },
    { item: available, vote: 'have' },
    { item: skipped, vote: 'skip' },
  ]

  assert.deepEqual(
    applyWalkthroughHistory(['available', 'skipped'], history),
    ['skipped', 'needed'],
  )
})

test('undo recalculates the list from shortened history', () => {
  const history: HistoryEntry[] = [
    { item: item({ id: 'first' }), vote: 'need' },
    { item: item({ id: 'second' }), vote: 'need' },
  ]

  assert.deepEqual(applyWalkthroughHistory([], history.slice(0, -1)), ['first'])
})

test('a result records checked items and aggregates counters', () => {
  const first = item({ id: 'first' })
  const second = item({ id: 'second' })
  const history: HistoryEntry[] = [
    { item: first, vote: 'need' },
    { item: second, vote: 'skip' },
    { item: first, vote: 'need' },
  ]

  assert.deepEqual(buildWalkthroughResult(history, ['first']), {
    finalShoppingList: ['first'],
    needCountMods: { first: 2 },
    skipCountMods: { second: 1 },
    checkedItemIds: ['first', 'second', 'first'],
  })
})
