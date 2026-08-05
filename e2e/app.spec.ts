import { expect, Locator, Page, test } from '@playwright/test';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  location: string;
  priority: number;
  needCount: number;
  skipCount: number;
  checkEvery: number;
  lastCheckedAt: number;
}

const fixtureItem: InventoryItem = {
  id: 'fixture-item',
  name: 'Fixture Item',
  category: 'Supplies',
  location: 'Kitchen',
  priority: 4,
  needCount: 0,
  skipCount: 0,
  checkEvery: 1,
  lastCheckedAt: 0,
};

async function seedInventory(
  page: Page,
  items: InventoryItem[] = [fixtureItem],
  shoppingList: string[] = []
): Promise<void> {
  await page.addInitScript(
    ({ seededItems, seededShoppingList }) => {
      if (localStorage.getItem('pantry_items') === null) {
        localStorage.setItem('pantry_items', JSON.stringify(seededItems));
        localStorage.setItem('shopping_list', JSON.stringify(seededShoppingList));
        localStorage.setItem('walkthrough_count', '0');
        localStorage.setItem('last_walkthrough_at', '0');
      }
    },
    { seededItems: items, seededShoppingList: shoppingList }
  );
}

function navButton(page: Page, label: string): Locator {
  return page
    .getByRole('navigation')
    .getByRole('button', { name: new RegExp(`${label}$`) });
}

test('adds, edits, deletes, and persists inventory items', async ({ page }) => {
  await seedInventory(page);
  await page.goto('./');
  await navButton(page, 'Items').click();

  await page.getByRole('button', { name: /Add Item/ }).click();
  await page.getByPlaceholder('Item name *').fill('Paper Towels');
  await page.getByPlaceholder('Location (e.g. Pantry)').fill('Basement');
  await page.getByPlaceholder('Category (e.g. Snacks)').fill('Household');
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByText('Paper Towels')).toBeVisible();

  await page.reload();
  await navButton(page, 'Items').click();
  let row = page.getByRole('listitem').filter({ hasText: 'Paper Towels' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByPlaceholder('Item name *').fill('Paper Towels XL');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Paper Towels XL')).toBeVisible();

  row = page.getByRole('listitem').filter({ hasText: 'Paper Towels XL' });
  page.once('dialog', dialog => dialog.accept());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Paper Towels XL')).toHaveCount(0);

  await page.reload();
  await navButton(page, 'Items').click();
  await expect(page.getByText('Paper Towels XL')).toHaveCount(0);
});

test('completes a walkthrough and persists its shopping-list result', async ({ page }) => {
  await seedInventory(page);
  await page.goto('./');

  await page.getByRole('button', { name: 'Start Walkthrough' }).click();
  await expect(page.getByText('Fixture Item')).toBeVisible();
  await page.getByRole('button', { name: /Need It/ }).click();
  await expect(page.getByText('All Done!')).toBeVisible();
  await page.getByRole('button', { name: 'Save & Done' }).click();
  await expect(page.getByText('Fixture Item')).toBeVisible();

  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('checklist-map:data:v1') ?? '{}')
  );
  expect(persisted.shoppingList).toEqual(['fixture-item']);
  expect(persisted.walkthroughCount).toBe(1);
  expect(persisted.lastWalkthroughAt).toBeGreaterThan(0);
  expect(persisted.items[0]).toMatchObject({
    id: 'fixture-item',
    needCount: 1,
  });

  await page.reload();
  await navButton(page, 'List').click();
  await expect(page.getByText('Fixture Item')).toBeVisible();
});

test('rejects malformed backups and restores exported data', async ({ page }) => {
  await seedInventory(page);
  await page.goto('./?view=importExport');

  await page.getByRole('button', { name: 'Generate Export' }).click();
  const exported = await page.locator('textarea[readonly]').inputValue();
  expect(exported).not.toBe('');

  const importBox = page.locator('textarea:not([readonly])');
  await importBox.fill('not a backup');
  await page.getByRole('button', { name: 'Replace All' }).click();
  await expect(page.getByText(/Invalid data/)).toBeVisible();

  await navButton(page, 'Items').click();
  await page.getByRole('button', { name: /Add Item/ }).click();
  await page.getByPlaceholder('Item name *').fill('Temporary Item');
  await page.getByPlaceholder('Location (e.g. Pantry)').fill('Garage');
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByText('Temporary Item')).toBeVisible();

  await navButton(page, 'Data').click();
  await expect(page.locator('textarea[readonly]')).toHaveCount(0);
  await page.locator('textarea:not([readonly])').fill(exported);
  await page.getByRole('button', { name: 'Replace All' }).click();
  await expect(page.getByText('✅ Replaced all data (1 item).')).toBeVisible();

  await navButton(page, 'Items').click();
  await expect(page.getByText('Fixture Item')).toBeVisible();
  await expect(page.getByText('Temporary Item')).toHaveCount(0);
});

test('preserves deep links, QR targets, and theme preference', async ({ page }) => {
  await seedInventory(page);
  await page.goto('./?view=importExport');

  await expect(page.getByText('Import / Export')).toBeVisible();
  const qrTarget = page.getByRole('link', { name: /view=importExport/ });
  await expect(qrTarget).toHaveAttribute(
    'href',
    'http://127.0.0.1:3000/checklist-map/?view=importExport'
  );

  await navButton(page, 'Items').click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('Import / Export')).toBeVisible();
});

test('migrates legacy browser keys into the versioned document', async ({ page }) => {
  await seedInventory(page, [fixtureItem], ['fixture-item']);
  await page.goto('./');

  const stored = await page.evaluate(() => ({
    document: JSON.parse(
      localStorage.getItem('checklist-map:data:v1') ?? '{}'
    ),
    legacyItems: localStorage.getItem('pantry_items'),
  }));

  expect(stored.document).toMatchObject({
    version: 1,
    items: [fixtureItem],
    shoppingList: ['fixture-item'],
    walkthroughCount: 0,
    lastWalkthroughAt: 0,
  });
  expect(stored.legacyItems).not.toBeNull();
});

test('closes an active walkthrough when another tab replaces data', async ({
  page,
  context,
}) => {
  await seedInventory(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Start Walkthrough' }).click();
  await expect(page.getByText('Fixture Item')).toBeVisible();

  const otherPage = await context.newPage();
  await otherPage.goto('./');
  await otherPage.evaluate(() => {
    localStorage.setItem(
      'checklist-map:data:v1',
      JSON.stringify({
        version: 1,
        items: [],
        shoppingList: [],
        walkthroughCount: 0,
        lastWalkthroughAt: 0,
      })
    );
  });

  await expect(page.getByRole('heading', { name: 'Checklist Map' })).toBeVisible();
  await expect(
    page.getByRole('alert').getByText(/active walkthrough was closed/)
  ).toBeVisible();
});
