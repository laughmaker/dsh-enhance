/** DS Bot's private columns have no public resize API. Own expanded gestures
 * before React sees them, and keep their painted boundaries together. Host
 * rail/hidden modes and browser-panel gestures retain their original behavior.
 */
export const LEFT_MIN = 220
export const DETAILS_MIN = 260
const LEFT_MAX = 420
const DETAILS_MAX = 520
const CHAT_MIN = 420
const RAIL_SNAP = 176
const LEFT_KEY = 'ds-bot-enhance.sidebar-width.v1'
const RIGHT_KEY = 'ds-bot-enhance.details-width.v1'

type Side = 'left' | 'right'
type SavedStyle = { value: string, priority: string }

export function installPanelWidths(root: Document): () => void {
  const win = root.defaultView!
  const preferred: Partial<Record<Side, number>> = {}
  const owned: Record<Side, Map<HTMLElement, Map<string, SavedStyle>>> = { left: new Map(), right: new Map() }
  let drag: { side: Side, grip: HTMLElement, id: number, x: number, width: number, previous?: number } | undefined
  let nativeDrag = false
  let replaying = false
  let frame = 0
  let disposed = false
  const key = (side: Side) => side === 'left' ? LEFT_KEY : RIGHT_KEY
  const minimum = (side: Side) => side === 'left' ? LEFT_MIN : DETAILS_MIN
  const maximum = (side: Side) => side === 'left' ? LEFT_MAX : DETAILS_MAX
  for (const side of ['left', 'right'] as const) {
    try {
      const raw = win.localStorage.getItem(key(side))
      const n = raw === null ? NaN : Number(raw)
      if (Number.isFinite(n) && n >= minimum(side) && n <= maximum(side)) preferred[side] = Math.round(n)
    } catch { /* storage can be unavailable */ }
  }
  const save = (side: Side) => {
    try {
      const width = preferred[side]
      if (width === undefined) win.localStorage.removeItem(key(side))
      else win.localStorage.setItem(key(side), String(width))
    } catch { /* geometry still works without persistence */ }
  }
  const put = (side: Side, element: HTMLElement, property: string, value: string) => {
    let properties = owned[side].get(element)
    if (!properties) { properties = new Map(); owned[side].set(element, properties) }
    if (!properties.has(property)) properties.set(property, {
      value: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property),
    })
    if (element.style.getPropertyValue(property) !== value || element.style.getPropertyPriority(property) !== 'important') {
      element.style.setProperty(property, value, 'important')
    }
  }
  const clear = (side: Side) => {
    for (const [element, properties] of owned[side]) {
      for (const [property, original] of properties) {
        if (original.value) element.style.setProperty(property, original.value, original.priority)
        else element.style.removeProperty(property)
      }
    }
    owned[side].clear()
  }
  const leftColumn = () => root.querySelector<HTMLElement>('.bt-leftcol')
  const detailPanel = () => root.querySelector<HTMLElement>('.bt-panel[data-view="details"]:not([data-leaving])')
  const centers = () => [...root.querySelectorAll<HTMLElement>('[class*="_centerCol"]')]
  const shellWidth = () => root.querySelector<HTMLElement>('[class*="_sidebarCol"]')?.getBoundingClientRect().width ?? 0
  const bound = (side: Side, value: number) => {
    const left = leftColumn()
    const occupied = left?.dataset.left === 'open' ? left.getBoundingClientRect().width : left?.dataset.left === 'rail' ? 88 : 0
    const available = side === 'right' ? win.innerWidth - occupied - CHAT_MIN : win.innerWidth - CHAT_MIN
    return Math.round(Math.max(minimum(side), Math.min(value, maximum(side), Math.max(minimum(side), available))))
  }
  const paint = () => {
    if (disposed || nativeDrag) return
    const left = leftColumn()
    const mode = left?.dataset.left
    if (left && preferred.left !== undefined && (mode === 'open' || mode === 'drawer')) {
      const width = bound('left', preferred.left)
      put('left', left, 'width', `${width}px`)
      put('left', left, '--bt-lc-w', `${width}px`)
      const occupied = mode === 'open' ? width : 88
      if (mode === 'open') for (const center of centers()) put('left', center, 'margin-left', `${Math.max(0, occupied - shellWidth())}px`)
      for (const pane of root.querySelectorAll<HTMLElement>('.bt-pane')) put('left', pane, 'left', `${occupied}px`)
    } else clear('left')
    const panel = detailPanel()
    if (panel && preferred.right !== undefined) {
      const width = bound('right', preferred.right)
      put('right', panel, 'width', `${width}px`)
      put('right', panel, '--bt-panel-w', `${width}px`)
      if (!panel.hasAttribute('data-overlay')) for (const center of centers()) put('right', center, 'margin-right', `${width}px`)
      else for (const center of centers()) {
        const properties = owned.right.get(center)
        if (properties) {
          for (const [property, original] of properties) {
            if (original.value) center.style.setProperty(property, original.value, original.priority)
            else center.style.removeProperty(property)
          }
          owned.right.delete(center)
        }
      }
    } else clear('right')
    for (const side of ['left', 'right'] as const) for (const element of owned[side].keys()) {
      if (!element.isConnected) owned[side].delete(element)
    }
    observer.takeRecords()
  }
  const schedule = () => {
    if (disposed || frame) return
    frame = win.requestAnimationFrame(() => { frame = 0; paint() })
  }
  const observer = new MutationObserver(schedule)
  const finish = (commit: boolean) => {
    const active = drag
    if (!active) { nativeDrag = false; schedule(); return }
    drag = undefined
    if (!commit) preferred[active.side] = active.previous
    else save(active.side)
    if (active.grip.hasPointerCapture?.(active.id)) active.grip.releasePointerCapture(active.id)
    root.documentElement.removeAttribute('data-ds-enhance-resizing')
    if (preferred[active.side] === undefined) clear(active.side)
    paint()
  }
  const onDown = (event: PointerEvent) => {
    if (replaying || event.button !== 0 || !(event.target instanceof Element)) return
    const grip = event.target.closest<HTMLElement>('.bt-leftcol-grip, .bt-panel-grip')
    if (!grip) return
    const side: Side = grip.classList.contains('bt-leftcol-grip') ? 'left' : 'right'
    const element = side === 'left' ? grip.closest<HTMLElement>('.bt-leftcol') : grip.closest<HTMLElement>('.bt-panel')
    if (!element) return
    if (side === 'left' && !['open', 'drawer'].includes(element.dataset.left ?? '') || side === 'right' && element.dataset.view !== 'details') {
      nativeDrag = true
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    drag = { side, grip, id: event.pointerId, x: event.clientX, width: element.getBoundingClientRect().width, previous: preferred[side] }
    root.documentElement.setAttribute('data-ds-enhance-resizing', '')
    grip.setPointerCapture?.(event.pointerId)
  }
  const track = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    const active = drag
    // Hand an explicit fold back to the host so its rail state and keyboard
    // toggle preference stay authoritative. A following rail drag is native.
    if (active.side === 'left' && event.clientX < RAIL_SNAP) {
      finish(false)
      nativeDrag = true
      clear('left')
      replaying = true
      try {
        active.grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }))
        active.grip.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 1, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }))
      } finally { replaying = false }
      return
    }
    preferred[active.side] = bound(active.side, active.width + (event.clientX - active.x) * (active.side === 'left' ? 1 : -1))
    paint()
  }
  const onMove = (event: PointerEvent) => {
    if (!drag) return
    if (event.buttons === 0) { finish(true); return }
    event.stopImmediatePropagation()
    track(event)
  }
  const onUp = (event: PointerEvent) => {
    if (drag) { event.stopImmediatePropagation(); track(event); finish(true) }
    else if (nativeDrag) {
      // Host gestures may restore the rail to an expanded column. Remember
      // that new width rather than resurrecting an older narrow preference.
      nativeDrag = false
      const left = leftColumn()
      if (left && left.dataset.left === 'open' && event.target instanceof Element && event.target.closest('.bt-leftcol-grip')) {
        preferred.left = bound('left', left.getBoundingClientRect().width)
        save('left')
      }
      schedule()
    }
  }
  const onCancel = () => { finish(false) }
  const style = root.createElement('style')
  style.dataset.plugin = 'ds-bot-enhance-widths'
  style.textContent = '[data-ds-enhance-resizing] :is(.bt-leftcol,.bt-panel,[class*="_centerCol"]){transition:none!important}[data-ds-enhance-resizing] *{cursor:col-resize!important;user-select:none!important}'
  root.head.appendChild(style)
  root.addEventListener('pointerdown', onDown, true)
  root.addEventListener('pointermove', onMove, true)
  root.addEventListener('pointerup', onUp, true)
  root.addEventListener('pointercancel', onCancel, true)
  win.addEventListener('blur', onCancel)
  win.addEventListener('resize', schedule)
  observer.observe(root.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-left', 'data-view', 'data-overlay', 'data-leaving'] })
  paint()
  return () => {
    disposed = true
    finish(false)
    observer.disconnect()
    win.cancelAnimationFrame(frame)
    root.removeEventListener('pointerdown', onDown, true)
    root.removeEventListener('pointermove', onMove, true)
    root.removeEventListener('pointerup', onUp, true)
    root.removeEventListener('pointercancel', onCancel, true)
    win.removeEventListener('blur', onCancel)
    win.removeEventListener('resize', schedule)
    clear('left'); clear('right'); style.remove()
  }
}
