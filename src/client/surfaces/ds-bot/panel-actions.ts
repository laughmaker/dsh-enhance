const botSelector = '.bt-panel:not([data-leaving]) > .bt-ptabs > .bt-ptabs-in > button.bt-ptab-bot:has(.bt-mark)'

const installations = new WeakMap<Document, { users: number, dispose: () => void }>()

export function installPanelActions(doc: Document): () => void {
  const entry = installations.get(doc) ?? { users: 0, dispose: mountPanelActions(doc) }
  installations.set(doc, entry)
  entry.users++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--entry.users === 0) {
      installations.delete(doc)
      entry.dispose()
    }
  }
}

/** Keep React's buttons in their original tree so settings, sharing and More
 * always run in the current DetailsDrawer, including its nested PanelMenu. */
function mountPanelActions(doc: Document): () => void {
  const win = doc.defaultView!
  if (!win.HTMLElement.prototype.showPopover) return () => {}
  let bot: HTMLButtonElement | null = null
  let panel: HTMLElement | null = null
  let popup: HTMLElement | null = null
  let pending: { name: string, last: boolean } | null = null
  let timeout = 0
  const arrow = doc.createElement('button')
  arrow.type = 'button'
  arrow.className = 'ds-panel-actions'
  arrow.setAttribute('aria-haspopup', 'dialog')
  arrow.setAttribute('aria-expanded', 'false')

  function close(focus = false) {
    win.clearTimeout(timeout)
    pending = null
    if (popup) {
      popup.querySelector<HTMLButtonElement>('[data-info-row="more"] button[aria-expanded="true"]')?.click()
      popup.hidePopover()
      popup.removeAttribute('popover')
      popup.removeAttribute('role')
      popup.removeAttribute('aria-label')
      popup.style.removeProperty('--ds-actions-x')
      popup.style.removeProperty('--ds-actions-y')
      popup = null
    }
    arrow.setAttribute('aria-expanded', 'false')
    if (focus && arrow.isConnected) arrow.focus()
  }

  function sync() {
    const next = doc.querySelector<HTMLButtonElement>(botSelector)
    if (bot !== next) {
      close()
      arrow.remove()
      bot = next
      panel = bot?.closest('.bt-panel') ?? null
    }
    if (!bot || !panel) return
    if (bot.nextElementSibling !== arrow) bot.after(arrow)
    const label = `${bot.title} ${doc.documentElement.lang.startsWith('zh') ? '操作' : 'actions'}`
    if (arrow.title !== label) {
      arrow.title = label
      arrow.setAttribute('aria-label', label)
    }
    if (!pending) return
    const row = panel.querySelector<HTMLElement>(':scope > .bt-panel-view > .bt-drawer-top')
    if (bot.title !== pending.name || (popup && row !== popup)) return close()
    if (popup || !row || bot.getAttribute('aria-selected') !== 'true') return
    const name = panel.querySelector(':scope > .bt-panel-view > .bt-drawer-id > .bt-drawer-name')
    if (name?.textContent !== pending.name) return close()
    win.clearTimeout(timeout)
    popup = row
    row.setAttribute('popover', 'manual')
    row.setAttribute('role', 'dialog')
    row.setAttribute('aria-label', label)
    const anchor = arrow.getBoundingClientRect()
    row.style.setProperty('--ds-actions-x', `${Math.max(4, Math.min(anchor.left, win.innerWidth - 196))}px`)
    row.style.setProperty('--ds-actions-y', `${anchor.bottom + 4}px`)
    row.showPopover()
    arrow.setAttribute('aria-expanded', 'true')
    const items = row.querySelectorAll('button')
    items[pending.last ? items.length - 1 : 0]?.focus()
  }

  function open(last = false) {
    if (!bot) return
    close()
    pending = { name: bot.title, last }
    timeout = win.setTimeout(() => close(), 1000)
    if (bot.getAttribute('aria-selected') !== 'true') bot.click()
    else panel?.querySelector<HTMLButtonElement>(':scope > .bt-panel-view > .bt-subhead > button:first-child')?.click()
    sync()
  }
  arrow.onclick = () => pending ? close(true) : open()
  arrow.onkeydown = e => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return
    e.preventDefault()
    open(e.key === 'ArrowUp')
  }
  function onPointer(e: PointerEvent) {
    if (pending && !arrow.contains(e.target as Node) && !popup?.contains(e.target as Node)) close()
  }
  function onClick(e: MouseEvent) {
    const action = (e.target as Element).closest('button')
    if (popup && action && popup.contains(action) && !action.hasAttribute('aria-haspopup')) close(action.parentElement === popup && !action.hasAttribute('data-info-row'))
  }
  function onKey(e: KeyboardEvent) {
    if (!popup || popup.querySelector('[aria-expanded="true"]')) return
    if (e.key === 'Tab') { close(true); return }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
    const buttons = Array.from(popup.querySelectorAll('button'))
    const i = buttons.indexOf(doc.activeElement as HTMLButtonElement)
    e.preventDefault()
    buttons[e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + buttons.length + (e.key === 'ArrowDown' ? 1 : -1)) % buttons.length]?.focus()
  }
  const observer = new win.MutationObserver(sync)
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title', 'aria-selected', 'data-leaving'] })
  const events = new win.AbortController()
  const options = { signal: events.signal }
  doc.addEventListener('pointerdown', onPointer, options)
  doc.addEventListener('click', onClick, options)
  doc.addEventListener('keydown', onKey, { ...options, capture: true })
  win.addEventListener('resize', () => close(), options)
  sync()
  return () => { observer.disconnect(); events.abort(); close(); arrow.remove() }
}
