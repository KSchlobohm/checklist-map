import {
  applyWalkthroughHistory,
  buildWalkthroughQueue,
  buildWalkthroughResult,
} from './walkthrough';
import { HistoryEntry, InventoryItem } from '../types';

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
  };
}

describe('buildWalkthroughQueue', () => {
  it('includes only due items and treats invalid frequencies as every walkthrough', () => {
    const items = [
      item({ id: 'always', checkEvery: 1 }),
      item({ id: 'every-two', checkEvery: 2 }),
      item({ id: 'invalid', checkEvery: 0 }),
    ];

    expect(buildWalkthroughQueue(items, 1).map(candidate => candidate.id)).toEqual([
      'always',
      'invalid',
    ]);
    expect(buildWalkthroughQueue(items, 2).map(candidate => candidate.id)).toEqual([
      'always',
      'every-two',
      'invalid',
    ]);
  });

  it('sorts by location, then priority, then prior need count', () => {
    const items = [
      item({ id: 'basement-low', location: 'Basement', priority: 2, needCount: 10 }),
      item({ id: 'kitchen', location: 'Kitchen', priority: 5 }),
      item({ id: 'basement-needed', location: 'Basement', priority: 5, needCount: 4 }),
      item({ id: 'basement-less-needed', location: 'Basement', priority: 5, needCount: 1 }),
    ];

    expect(buildWalkthroughQueue(items, 0).map(candidate => candidate.id)).toEqual([
      'basement-needed',
      'basement-less-needed',
      'basement-low',
      'kitchen',
    ]);
  });
});

describe('applyWalkthroughHistory', () => {
  it('adds needed items once, removes available items, and leaves skipped items unchanged', () => {
    const needed = item({ id: 'needed' });
    const available = item({ id: 'available' });
    const skipped = item({ id: 'skipped' });
    const history: HistoryEntry[] = [
      { item: needed, vote: 'need' },
      { item: needed, vote: 'need' },
      { item: available, vote: 'have' },
      { item: skipped, vote: 'skip' },
    ];

    expect(applyWalkthroughHistory(['available', 'skipped'], history)).toEqual([
      'skipped',
      'needed',
    ]);
  });

  it('supports undo by recalculating from a shortened history', () => {
    const first = item({ id: 'first' });
    const second = item({ id: 'second' });
    const history: HistoryEntry[] = [
      { item: first, vote: 'need' },
      { item: second, vote: 'need' },
    ];

    expect(applyWalkthroughHistory([], history.slice(0, -1))).toEqual(['first']);
  });
});

describe('buildWalkthroughResult', () => {
  it('records checked items and aggregates need and skip counters', () => {
    const first = item({ id: 'first' });
    const second = item({ id: 'second' });
    const history: HistoryEntry[] = [
      { item: first, vote: 'need' },
      { item: second, vote: 'skip' },
      { item: first, vote: 'need' },
    ];

    expect(buildWalkthroughResult(history, ['first'])).toEqual({
      finalShoppingList: ['first'],
      needCountMods: { first: 2 },
      skipCountMods: { second: 1 },
      checkedItemIds: ['first', 'second', 'first'],
    });
  });
});
