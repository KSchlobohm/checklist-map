import QRCode from 'qrcode'
import { registerSW } from 'virtual:pwa-register'
import {
  STORAGE_KEY,
  THEME_KEY,
  addItem,
  completeWalkthrough,
  createDefaultData,
  deleteItem,
  loadAppData,
  replaceBackup,
  saveAppData,
  toggleShoppingItem,
  updateItem,
  validateAppData,
} from './data.ts'
import {
  encodeBackup,
  prepareImport,
} from './domain/backup.ts'
import {
  applyWalkthroughHistory,
  buildWalkthroughQueue,
  buildWalkthroughResult,
} from './domain/walkthrough.ts'
import type {
  AppData,
  HistoryEntry,
  InventoryItem,
  Theme,
  ViewName,
  Vote,
} from './types.ts'
import './style.css'

const root = requireRoot()

const loadResult = loadAppData(localStorage)
let data = loadResult.data
let recoveryError =
  loadResult.source === 'recovery' ? loadResult.error : null
const loadedTheme = loadTheme()
let persistenceMessage =
  loadResult.source === 'recovery'
    ? loadedTheme.warning
    : (loadResult.warning ?? loadedTheme.warning)
let view = getInitialView()
let theme = loadedTheme.theme
let manageMode: { type: 'add' } | { type: 'edit'; itemId: string } | null =
  null
let walkthrough:
  | {
      queue: InventoryItem[]
      index: number
      history: HistoryEntry[]
      completed: boolean
    }
  | undefined
let exportText = ''
let importMessage = ''
let updateAvailable = false
let renderId = 0

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateAvailable = true
    render()
  },
  onRegisterError(error) {
    console.error('Service worker registration failed.', error)
  },
})

document.documentElement.dataset.theme = theme
window.addEventListener('storage', synchronizeStoredData)
render()

function render(): void {
  const currentRenderId = ++renderId
  root.replaceChildren()

  if (!data) {
    root.append(renderRecovery())
    return
  }

  const app = element('div', 'app')
  if (view !== 'walkthrough' && view !== 'home') {
    app.append(renderTopBar())
  }

  const main = element('main', 'app-main')
  switch (view) {
    case 'home':
      main.append(renderHome())
      break
    case 'walkthrough':
      main.append(renderWalkthrough())
      break
    case 'list':
      main.append(renderShoppingList())
      break
    case 'manage':
      main.append(renderManageItems())
      break
    case 'importExport':
      main.append(renderDataView(currentRenderId))
      break
  }
  app.append(main)

  if (view !== 'walkthrough') {
    app.append(renderNavigation())
  }
  if (updateAvailable) {
    app.append(renderUpdatePrompt())
  }
  if (persistenceMessage) {
    app.append(renderPersistenceWarning())
  }
  root.append(app)
}

function renderRecovery(): HTMLElement {
  const container = element('main', 'recovery-screen')
  container.append(
    element('h1', undefined, 'Checklist Map'),
    element('h2', undefined, 'Saved data needs attention'),
    element(
      'p',
      'text-muted',
      recoveryError ??
        'The saved inventory could not be read. It has not been changed.',
    ),
  )
  const restore = actionButton(
    'Restore starter data',
    'btn-danger',
    () => {
      if (
        !window.confirm(
          'Replace the unreadable saved data with the starter inventory?',
        )
      ) {
        return
      }
      const restored = createDefaultData()
      try {
        saveAppData(localStorage, restored)
      } catch (error) {
        recoveryError =
          error instanceof Error ? error.message : 'Data could not be saved.'
        render()
        return
      }
      data = restored
      recoveryError = null
      render()
    },
  )
  container.append(restore)
  return container
}

function renderTopBar(): HTMLElement {
  const header = element('header', 'app-topbar')
  const titles: Partial<Record<ViewName, string>> = {
    list: 'Shopping List',
    manage: 'Inventory Items',
    importExport: 'Import / Export',
  }
  header.append(
    element('span', 'app-topbar-title', titles[view] ?? ''),
  )
  if (view === 'list' && requireData().shoppingList.length > 0) {
    header.append(
      element('span', 'badge', String(requireData().shoppingList.length)),
    )
  }
  header.append(renderThemeButton())
  return header
}

function renderThemeButton(): HTMLButtonElement {
  return actionButton(
    theme === 'dark' ? '☀️' : '🌙',
    'theme-toggle',
    toggleTheme,
    'Toggle theme',
  )
}

function renderHome(): HTMLElement {
  const current = requireData()
  const wrapper = element('div')
  const hero = element('div', 'home-hero')
  const heroRow = element('div', 'hero-row')
  const copy = element('div')
  copy.append(
    element('h1', undefined, 'Checklist Map'),
    element('p', undefined, 'Walk your home. Build your list.'),
    element(
      'p',
      'hero-last-walked',
      `Last walked: ${formatLastWalkthrough(current.lastWalkthroughAt)}`,
    ),
  )
  heroRow.append(copy, renderThemeButton())
  hero.append(heroRow)
  wrapper.append(hero)

  const content = element('div', 'view-content')
  content.append(
    actionButton('Start Walkthrough', 'btn-start', () =>
      navigate('walkthrough'),
    ),
  )

  const neededItems = current.items.filter((item) =>
    current.shoppingList.includes(item.id),
  )
  if (current.items.length === 0) {
    content.append(
      renderEmpty(
        '📦',
        'No items yet. Go to Items to add things you want to track.',
      ),
    )
  } else if (neededItems.length === 0) {
    content.append(
      renderEmpty(
        '✅',
        'Shopping list is empty. Start a walkthrough to check what you need.',
      ),
    )
  } else {
    const section = element('div')
    section.append(
      element(
        'div',
        'section-title',
        `Shopping List (${neededItems.length} item${neededItems.length === 1 ? '' : 's'})`,
      ),
    )
    const list = element('ul', 'item-list')
    for (const item of neededItems.slice(0, 5)) {
      const row = element('li', 'item-row')
      row.append(
        element('span', 'need-dot', '●'),
        element('span', 'item-name', item.name),
        element('span', 'item-location-tag', item.location),
      )
      list.append(row)
    }
    section.append(list)
    if (neededItems.length > 5) {
      section.append(
        element(
          'p',
          'text-muted text-center',
          `+${neededItems.length - 5} more`,
        ),
      )
    }
    section.append(
      actionButton('View Full List →', 'btn-outline', () => navigate('list')),
    )
    content.append(section)
  }
  wrapper.append(content)
  return wrapper
}

function renderWalkthrough(): HTMLElement {
  const currentData = requireData()
  if (!walkthrough) {
    walkthrough = {
      queue: buildWalkthroughQueue(
        currentData.items,
        currentData.walkthroughCount,
      ),
      index: 0,
      history: [],
      completed: false,
    }
  }

  const state = walkthrough
  const currentList = applyWalkthroughHistory(
    currentData.shoppingList,
    state.history,
  )
  const container = element('div', 'walkthrough-container')

  if (state.queue.length === 0) {
    const empty = renderEmpty(
      '📋',
      'No items are due for this walkthrough.',
    )
    empty.append(
      actionButton('Done', 'btn-primary', () =>
        finishWalkthrough(
          buildWalkthroughResult([], currentData.shoppingList),
        ),
      ),
    )
    container.append(empty)
    return container
  }

  if (state.completed) {
    return renderWalkthroughCompletion(container, currentList)
  }

  const currentItem = state.queue[state.index]
  if (!currentItem) {
    throw new Error('The walkthrough item is missing.')
  }
  const progress = element('div', 'progress-bar-container')
  progress.append(
    element(
      'div',
      'progress-label',
      `${state.index + 1} / ${state.queue.length}`,
    ),
  )
  const track = element('div', 'progress-track')
  const fill = element('div', 'progress-fill')
  fill.style.width = `${(state.index / state.queue.length) * 100}%`
  track.append(fill)
  progress.append(track)

  const card = element('div', 'item-card')
  card.append(
    element('div', 'item-location-label', currentItem.location),
    element('div', 'item-name-large', currentItem.name),
  )
  if (currentItem.category) {
    card.append(
      element('div', 'item-category-label', currentItem.category),
    )
  }

  const actions = element('div', 'walkthrough-actions')
  actions.append(
    actionButton('End Walkthrough', 'btn-end', () =>
      finishWalkthrough(
        buildWalkthroughResult(state.history, currentList),
      ),
    ),
  )
  const navigation = element('div', 'nav-buttons')
  const back = actionButton('← Back', 'btn-nav', undoWalkthrough)
  back.disabled = state.history.length === 0
  navigation.append(
    back,
    actionButton('Skip →', 'btn-nav btn-skip', () => castVote('skip')),
  )
  const votes = element('div', 'vote-buttons')
  votes.append(
    actionButton('✓ Have It', 'btn-have', () => castVote('have')),
    actionButton('🛒 Need It', 'btn-need', () => castVote('need')),
  )
  actions.append(navigation, votes)
  container.append(progress, card, actions)
  return container
}

function renderWalkthroughCompletion(
  container: HTMLElement,
  currentList: string[],
): HTMLElement {
  const currentData = requireData()
  const needed = currentData.items.filter((item) =>
    currentList.includes(item.id),
  )
  const grouped = groupByLocation(needed, 'Other')
  const completion = element('div', 'completion-screen')
  completion.append(
    element('div', 'completion-icon', '✅'),
    element('div', 'completion-title', 'All Done!'),
    element(
      'p',
      'text-muted',
      `${needed.length} item${needed.length === 1 ? '' : 's'} on your list`,
    ),
  )

  if (needed.length === 0) {
    completion.append(
      element(
        'p',
        'text-muted',
        "Nothing needed — you're all stocked up!",
      ),
    )
  } else {
    const list = element('div', 'completion-list')
    for (const [location, items] of Object.entries(grouped)) {
      list.append(element('div', 'section-title', location))
      for (const item of items) {
        const row = element('div', 'item-row')
        row.append(
          element('span', 'need-dot', '●'),
          element('span', 'item-name', item.name),
        )
        list.append(row)
      }
    }
    completion.append(list)
  }

  const actions = element('div', 'completion-actions')
  if (needed.length > 0) {
    actions.append(
      actionButton('📋 Copy List as Text', 'btn-secondary', () => {
        void navigator.clipboard?.writeText(formatTextList(grouped))
      }),
    )
  }
  actions.append(
    actionButton('Save & Done', 'btn-have', () => {
      const state = requireWalkthrough()
      finishWalkthrough(
        buildWalkthroughResult(state.history, currentList),
      )
    }),
  )
  const back = actionButton('← Back', 'btn-nav', undoWalkthrough)
  back.disabled = requireWalkthrough().history.length === 0
  actions.append(back)
  completion.append(actions)
  container.append(completion)
  return container
}

function renderShoppingList(): HTMLElement {
  const current = requireData()
  const content = element('div', 'view-content')
  const needed = current.items.filter((item) =>
    current.shoppingList.includes(item.id),
  )
  if (needed.length === 0) {
    content.append(renderEmpty('🛒', 'Your shopping list is empty.'))
    return content
  }

  const grouped = groupByLocation(needed, 'Other')
  const actions = element('div', 'list-actions')
  actions.append(
    actionButton('📋 Copy as Text', 'btn-secondary btn-sm', () => {
      void navigator.clipboard?.writeText(formatTextList(grouped))
    }),
    actionButton('Clear All', 'btn-danger btn-sm', () => {
      updateData({ ...requireData(), shoppingList: [] })
    }),
  )
  content.append(actions)

  for (const [location, items] of Object.entries(grouped)) {
    content.append(element('div', 'section-title', location))
    const list = element('ul', 'item-list')
    for (const item of items) {
      const row = element('li', 'item-row')
      row.append(
        actionButton(
          '○',
          'check-btn',
          () => updateData(toggleShoppingItem(requireData(), item.id)),
          'Mark purchased',
        ),
        element('span', 'item-name', item.name),
      )
      if (item.category) {
        row.append(element('span', 'item-category-tag', item.category))
      }
      list.append(row)
    }
    content.append(list)
  }
  return content
}

function renderManageItems(): HTMLElement {
  const current = requireData()
  const content = element('div', 'view-content')
  if (!manageMode) {
    content.append(
      actionButton('+ Add Item', 'btn-primary btn-full', () => {
        manageMode = { type: 'add' }
        render()
      }),
    )
  }

  if (manageMode?.type === 'add') {
    content.append(
      renderItemForm(
        blankItem(),
        'Add Item',
        (item) => {
          if (updateData(addItem(requireData(), item), false)) {
            manageMode = null
            render()
          }
        },
        closeItemForm,
      ),
    )
  }

  if (current.items.length === 0) {
    content.append(
      renderEmpty('📦', 'No items yet. Add something to get started.'),
    )
    return content
  }

  const grouped = groupByLocation(current.items, 'No Location')
  for (const [location, items] of Object.entries(grouped).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    content.append(element('div', 'section-title', location))
    const list = element('ul', 'item-list')
    for (const item of [...items].sort(
      (left, right) =>
        right.priority - left.priority || left.name.localeCompare(right.name),
    )) {
      const listItem = element('li')
      if (manageMode?.type === 'edit' && manageMode.itemId === item.id) {
        listItem.append(
          renderItemForm(
            item,
            'Save',
            (updated) => {
              if (updateData(updateItem(requireData(), updated), false)) {
                manageMode = null
                render()
              }
            },
            closeItemForm,
          ),
        )
      } else {
        listItem.append(renderInventoryRow(item))
      }
      list.append(listItem)
    }
    content.append(list)
  }
  return content
}

function renderInventoryRow(item: InventoryItem): HTMLElement {
  const row = element('div', 'item-row')
  const content = element('div', 'item-row-content')
  content.append(element('span', 'item-name', item.name))
  const metadata = element('div', 'item-meta')
  if (item.category) {
    metadata.append(element('span', 'item-category-tag', item.category))
  }
  metadata.append(element('span', 'priority-tag', `P${item.priority}`))
  if (item.checkEvery > 1) {
    metadata.append(element('span', 'freq-tag', `÷${item.checkEvery}`))
  }
  content.append(metadata)

  const actions = element('div', 'item-row-actions')
  actions.append(
    actionButton(
      '✏️',
      'btn-icon',
      () => {
        manageMode = { type: 'edit', itemId: item.id }
        render()
      },
      'Edit',
    ),
    actionButton(
      '🗑️',
      'btn-icon',
      () => {
        if (window.confirm(`Delete "${item.name}"?`)) {
          updateData(deleteItem(requireData(), item.id))
        }
      },
      'Delete',
    ),
  )
  row.append(content, actions)
  return row
}

function renderItemForm(
  initial: InventoryItem,
  submitLabel: string,
  onSave: (item: InventoryItem) => void,
  onCancel: () => void,
): HTMLElement {
  let priority = initial.priority
  const form = element('div', 'item-form')
  const name = textInput('Item name *', initial.name)
  const location = textInput(
    'Location (e.g. Pantry)',
    initial.location,
  )
  const category = textInput(
    'Category (e.g. Snacks)',
    initial.category,
  )

  const nameRow = element('div', 'form-row')
  nameRow.append(name)
  const detailsRow = element('div', 'form-row')
  detailsRow.append(location, category)
  const optionsRow = element('div', 'form-row form-row-inline')
  optionsRow.append(element('span', 'form-label', 'Priority'))
  const priorities = element('div', 'priority-buttons')
  const priorityButtons: HTMLButtonElement[] = []
  for (const value of [1, 2, 3, 4, 5]) {
    const priorityButton = actionButton(
      String(value),
      `priority-btn${priority === value ? ' active' : ''}`,
      () => {
        priority = value
        for (const candidate of priorityButtons) {
          candidate.classList.toggle(
            'active',
            candidate.textContent === String(value),
          )
        }
      },
    )
    priorityButton.type = 'button'
    priorityButtons.push(priorityButton)
    priorities.append(priorityButton)
  }
  optionsRow.append(priorities, element('span', 'form-label', 'Check every'))
  const frequency = document.createElement('select')
  frequency.className = 'form-select'
  for (const value of [1, 2, 3, 4, 6, 8]) {
    const option = document.createElement('option')
    option.value = String(value)
    option.textContent = value === 1 ? 'Every time' : `Every ${value}×`
    option.selected = initial.checkEvery === value
    frequency.append(option)
  }
  optionsRow.append(frequency)

  const save = actionButton(submitLabel, 'btn-primary', () => {
    const trimmedName = name.value.trim()
    if (!trimmedName) return
    onSave({
      ...initial,
      name: trimmedName,
      location: location.value.trim(),
      category: category.value.trim(),
      priority,
      checkEvery: Number(frequency.value),
    })
  })
  save.disabled = name.value.trim() === ''
  name.addEventListener('input', () => {
    save.disabled = name.value.trim() === ''
  })
  const formActions = element('div', 'form-row form-row-actions')
  formActions.append(
    save,
    actionButton('Cancel', 'btn-secondary', onCancel),
  )
  form.append(nameRow, detailsRow, optionsRow, formActions)
  return form
}

function renderDataView(currentRenderId: number): HTMLElement {
  const current = requireData()
  const content = element('div', 'view-content')
  const shareUrl = new URL(window.location.href)
  shareUrl.hash = ''
  shareUrl.search = ''
  shareUrl.searchParams.set('view', 'importExport')

  const phone = element('div', 'ie-section')
  phone.append(
    element('h3', 'ie-title', 'Open on Phone'),
    element(
      'p',
      'text-muted',
      'Scan this QR code to open this Data page on your phone.',
    ),
  )
  const share = element('div', 'qr-share')
  const link = document.createElement('a')
  link.className = 'qr-link'
  link.href = shareUrl.toString()
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = shareUrl.toString()
  share.append(link)
  phone.append(share)
  void QRCode.toDataURL(shareUrl.toString(), { width: 220, margin: 1 })
    .then((dataUrl) => {
      if (renderId !== currentRenderId || view !== 'importExport') return
      const image = document.createElement('img')
      image.className = 'qr-image'
      image.src = dataUrl
      image.alt = `QR code for ${shareUrl.toString()}`
      share.prepend(image)
    })
    .catch(() => {
      if (renderId !== currentRenderId || view !== 'importExport') return
      phone.append(
        element(
          'p',
          'import-message',
          'Unable to generate QR code for the configured URL.',
        ),
      )
    })

  const exportSection = element('div', 'ie-section')
  exportSection.append(
    element('h3', 'ie-title', 'Export'),
    element(
      'p',
      'text-muted',
      'Back up your items or share with another device.',
    ),
    actionButton('Generate Export', 'btn-primary', () => {
      exportText = encodeBackup({
        version: 1,
        items: current.items,
        shoppingList: current.shoppingList,
      })
      render()
    }),
  )
  if (exportText) {
    const output = document.createElement('textarea')
    output.className = 'textarea-code'
    output.readOnly = true
    output.rows = 4
    output.value = exportText
    exportSection.append(
      output,
      actionButton('📋 Copy to Clipboard', 'btn-secondary', (event) => {
        void navigator.clipboard?.writeText(exportText)
        const target = event.currentTarget
        if (target instanceof HTMLButtonElement) {
          target.textContent = '✅ Copied!'
          window.setTimeout(() => {
            target.textContent = '📋 Copy to Clipboard'
          }, 2000)
        }
      }),
    )
  }

  const importSection = element('div', 'ie-section')
  importSection.append(
    element('h3', 'ie-title', 'Import'),
    element(
      'p',
      'text-muted',
      'Paste exported data from another device below.',
    ),
  )
  const input = document.createElement('textarea')
  input.className = 'textarea-code'
  input.placeholder = 'Paste export data here…'
  input.rows = 4
  const actions = element('div', 'import-actions')
  const replace = actionButton('Replace All', 'btn-primary', () =>
    importData(input.value, false),
  )
  const merge = actionButton('Merge Items', 'btn-secondary', () =>
    importData(input.value, true),
  )
  replace.disabled = true
  merge.disabled = true
  input.addEventListener('input', () => {
    importMessage = ''
    const disabled = input.value.trim() === ''
    replace.disabled = disabled
    merge.disabled = disabled
  })
  actions.append(replace, merge)
  importSection.append(input, actions)
  if (importMessage) {
    importSection.append(element('p', 'import-message', importMessage))
  }

  content.append(
    phone,
    element('div', 'ie-divider'),
    exportSection,
    element('div', 'ie-divider'),
    importSection,
  )
  return content
}

function renderNavigation(): HTMLElement {
  const navigation = element('nav', 'bottom-nav')
  const items: Array<{
    target: Exclude<ViewName, 'walkthrough'>
    icon: string
    label: string
  }> = [
    { target: 'home', icon: '🏠', label: 'Home' },
    { target: 'list', icon: '🛒', label: 'List' },
    { target: 'manage', icon: '📝', label: 'Items' },
    { target: 'importExport', icon: '📤', label: 'Data' },
  ]

  for (const item of items) {
    const button = actionButton(
      '',
      `nav-item${view === item.target ? ' active' : ''}`,
      () => navigate(item.target),
    )
    const iconWrapper = element('span', 'nav-icon-wrap')
    iconWrapper.append(element('span', 'nav-icon', item.icon))
    button.append(iconWrapper, element('span', undefined, item.label))
    navigation.append(button)
  }
  return navigation
}

function renderUpdatePrompt(): HTMLElement {
  const prompt = element('aside', 'update-prompt')
  prompt.setAttribute('role', 'status')
  prompt.append(
    element('span', undefined, 'A new version is ready.'),
    actionButton('Update now', 'btn-primary', () => {
      void updateServiceWorker(true)
    }),
    actionButton(
      'Later',
      'btn-secondary',
      () => {
        updateAvailable = false
        render()
      },
    ),
  )
  return prompt
}

function renderPersistenceWarning(): HTMLElement {
  const warning = element('aside', 'persistence-warning')
  warning.setAttribute('role', 'alert')
  warning.append(
    element('span', undefined, persistenceMessage ?? ''),
    actionButton('Dismiss', 'btn-secondary', () => {
      persistenceMessage = null
      render()
    }),
  )
  return warning
}

function navigate(nextView: ViewName): void {
  if (view === 'importExport' && nextView !== 'importExport') {
    exportText = ''
  }
  view = nextView
  manageMode = null
  importMessage = ''
  if (nextView === 'walkthrough') {
    const current = requireData()
    walkthrough = {
      queue: buildWalkthroughQueue(
        current.items,
        current.walkthroughCount,
      ),
      index: 0,
      history: [],
      completed: false,
    }
  } else {
    walkthrough = undefined
  }
  render()
}

function castVote(vote: Vote): void {
  const state = requireWalkthrough()
  const item = state.queue[state.index]
  if (!item) return
  state.history = [...state.history, { item, vote }]
  if (state.index + 1 >= state.queue.length) {
    state.completed = true
  } else {
    state.index += 1
  }
  render()
}

function undoWalkthrough(): void {
  const state = requireWalkthrough()
  if (state.history.length === 0) return
  state.completed = false
  state.history = state.history.slice(0, -1)
  state.index = Math.max(0, state.index - 1)
  render()
}

function finishWalkthrough(
  result: ReturnType<typeof buildWalkthroughResult>,
): void {
  if (updateData(completeWalkthrough(requireData(), result), false)) {
    navigate('list')
  }
}

function importData(value: string, merge: boolean): void {
  const current = requireData()
  const prepared = prepareImport(
    value,
    current.items,
    current.shoppingList,
    merge,
  )
  if (!prepared) {
    importMessage = '❌ Invalid data. Check your paste and try again.'
    render()
    return
  }

  if (!updateData(replaceBackup(current, prepared.data), false)) {
    return
  }
  if (merge) {
    const count = prepared.importedItemCount
    importMessage = `✅ Merged ${count} new item${count === 1 ? '' : 's'}.`
  } else {
    const count = prepared.importedItemCount
    importMessage = `✅ Replaced all data (${count} item${count === 1 ? '' : 's'}).`
  }
  render()
}

function updateData(nextData: AppData, shouldRender = true): boolean {
  try {
    saveAppData(localStorage, nextData)
  } catch (error) {
    persistenceMessage =
      error instanceof Error ? error.message : 'Changes could not be saved.'
    render()
    return false
  }
  data = nextData
  exportText = ''
  persistenceMessage = null
  if (shouldRender) render()
  return true
}

function toggleTheme(): void {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_KEY, nextTheme)
  } catch (error) {
    persistenceMessage =
      error instanceof Error
        ? `Theme preference could not be saved: ${error.message}`
        : 'Theme preference could not be saved.'
    render()
    return
  }
  theme = nextTheme
  document.documentElement.dataset.theme = theme
  render()
}

function synchronizeStoredData(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY || event.newValue === null) return
  try {
    data = validateAppData(JSON.parse(event.newValue) as unknown)
    if (view === 'walkthrough') {
      view = 'home'
      persistenceMessage =
        'Data changed in another tab. The active walkthrough was closed.'
    } else {
      persistenceMessage = null
    }
    walkthrough = undefined
    manageMode = null
    exportText = ''
  } catch (error) {
    persistenceMessage =
      error instanceof Error
        ? `Another tab saved unreadable data: ${error.message}`
        : 'Another tab saved unreadable data.'
  }
  render()
}

function loadTheme(): { theme: Theme; warning: string | null } {
  try {
    return {
      theme: localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',
      warning: null,
    }
  } catch (error) {
    return {
      theme: 'dark',
      warning:
        error instanceof Error
          ? `Theme preference is unavailable: ${error.message}`
          : 'Theme preference is unavailable.',
    }
  }
}

function closeItemForm(): void {
  manageMode = null
  render()
}

function requireData(): AppData {
  if (!data) throw new Error('Application data is unavailable.')
  return data
}

function requireWalkthrough(): NonNullable<typeof walkthrough> {
  if (!walkthrough) throw new Error('A walkthrough is not active.')
  return walkthrough
}

function getInitialView(): ViewName {
  const selected = new URLSearchParams(window.location.search).get('view')
  if (
    selected === 'list' ||
    selected === 'manage' ||
    selected === 'importExport'
  ) {
    return selected
  }
  return 'home'
}

function formatLastWalkthrough(timestamp: number): string {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: days > 365 ? 'numeric' : undefined,
  })
}

function blankItem(): InventoryItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    category: '',
    location: '',
    priority: 3,
    needCount: 0,
    skipCount: 0,
    checkEvery: 1,
    lastCheckedAt: 0,
  }
}

function groupByLocation(
  items: InventoryItem[],
  fallback: string,
): Record<string, InventoryItem[]> {
  return items.reduce<Record<string, InventoryItem[]>>((groups, item) => {
    const location = item.location || fallback
    ;(groups[location] ??= []).push(item)
    return groups
  }, {})
}

function formatTextList(
  groups: Record<string, InventoryItem[]>,
): string {
  return Object.entries(groups)
    .map(
      ([location, items]) =>
        `${location}:\n${items.map((item) => `  - ${item.name}`).join('\n')}`,
    )
    .join('\n\n')
}

function renderEmpty(icon: string, message: string): HTMLElement {
  const empty = element('div', 'empty-state')
  empty.append(
    element('div', 'empty-icon', icon),
    element('p', undefined, message),
  )
  return empty
}

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tagName)
  if (className) result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

function actionButton(
  text: string,
  className: string,
  onClick: (event: MouseEvent) => void,
  ariaLabel?: string,
): HTMLButtonElement {
  const result = document.createElement('button')
  result.type = 'button'
  result.className = className
  result.textContent = text
  if (ariaLabel) result.setAttribute('aria-label', ariaLabel)
  result.addEventListener('click', onClick)
  return result
}

function textInput(
  placeholder: string,
  value: string,
): HTMLInputElement {
  const input = document.createElement('input')
  input.className = 'form-input'
  input.placeholder = placeholder
  input.value = value
  return input
}

function requireRoot(): HTMLDivElement {
  const result = document.querySelector<HTMLDivElement>('#app')
  if (!result) throw new Error('The application root was not found.')
  return result
}
