/**
 * DS Bot loads earlier messages from a button the host renders above the
 * transcript, and only when that button is clicked. This module clicks it for
 * the reader once they scroll back up to the top, and shows a light loading
 * indicator while the older page is on its way.
 *
 * The reading position is this module's own work. The host does hold a row in
 * place when an older page lands, but on this path it does not hold the
 * reader's row:
 *
 *  - the row the host holds is the first row of the list — the one it marks
 *    with `data-chat-paging-anchor` — and not the row the reader is looking
 *    at;
 *  - the host stops preserving as soon as it samples the reader moving, and
 *    the reader has just moved: they wheeled up to the top to ask for the
 *    page;
 *  - while the page is on its way the host is still reading, and it leaves
 *    the reading position alone until the read is over.
 *
 * Measured on the running app, the reader's row moved down by the whole
 * height of the older page (about 3000 pixels) when the host's own button
 * was clicked — with this module idle, and with this module's own click.
 *
 * So the module keeps its own bearing on the reader's row, and gives the
 * growth of the content back to the scroller:
 *
 *  - the bearing: the row the reader is reading, found by the key the host
 *    gives it, and that row's place in the scrolled content;
 *  - the place does not move when the reader scrolls — scrolling moves the
 *    row in the viewport and the scroller's offset by the same amount — and
 *    it moves by exactly what is added above the row, which is the height
 *    of the older page;
 *  - so every step the place takes is put back into the scroller: the row
 *    the reader was reading stays exactly where it was, and the reader's
 *    own scrolling is left alone.
 *
 * The browser has an anchoring of its own, and it would add the same step to
 * the scroller. While the page is on its way that one is switched off, so
 * that the correction is made once and not twice.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { LOCALE_NS } from '../../locales.ts'
import { stylePluginId } from '../../surface.ts'

/** How close to the top of the list the reader has to come, in pixels. */
export const TOP_THRESHOLD = 160

/** The indicator stays up for at least this long, so a quick load still reads as one. */
export const MIN_VISIBLE_MS = 480

/**
 * A wheel or a key counts as the same gesture for this long.
 *
 * One sweep of the wheel therefore asks for one page: the history cannot be
 * pulled in a single scroll, and the reader has to let go and start again.
 */
const GESTURE_WINDOW_MS = 250

/** The load is given this long before the reader is handed the button back. */
const SETTLE_LIMIT_MS = 8000

/** The host shows its own loading state; without it the click did not take. */
const LOAD_GIVE_UP_MS = 1500

/** The scroller the host renders the transcript in. */
const SCROLLER = '[data-conversation-scroll]'

/** The element the transcript is laid out in. */
const COLUMN = '[data-chat-flow]'

/** The slot the host renders the transcript rows into. */
const FLOW_SLOT = '[data-slot="conversation.chat.flow"]'

/** The rows the host gives a key of its own; those are the rows to bear on. */
const ANCHOR_ROWS = '[data-chat-anchor-key]:not(:empty):not([hidden]):not([hidden] *)'

/** The host's session-title header, which the indicator has to stay clear of. */
const HEADER = 'header[class*="_header"]:has(.bt-head)'

/** The least correction worth writing, in pixels. */
const WRITE_EPS = 0.5

/**
 * The row the reader is reading, and the key to find it again.
 *
 * The key is the one the host gives the row, and it stays with the row when
 * an older page is spliced in above: the host reuses the row's element, so
 * the key leads back to the same message.
 */
interface Bearing {
  /** The key the host gives the row. */
  key: string
  /** The row's place in the scrolled content, in pixels. */
  place: number
}

/** Stamped on the host's "load earlier" row while a load is running. */
export const LOADING_ATTR = 'data-dsh-enhance-older-loading'

/** The plugin's own indicator, painted over the host's button. */
export const SPINNER_CLASS = 'dsh-enhance-older-spinner'

/**
 * The row the reader is reading, and where it sits in the content.
 *
 * The reader's row is the first row of the list that reaches into the
 * visible part of the scroller. The rows the host holds the list by are not
 * used: the host keeps the first row of the list in place when a page lands,
 * and the reader is somewhere else.
 *
 * The place is measured in the scrolled content, not in the viewport: the
 * row's distance from the top of the scroller's content box, plus the
 * scroller's own offset. Scrolling by so much moves the row up by so much in
 * the viewport and the offset up by so much, and the two cancel; adding
 * content above the row pushes the place down by the height of that content.
 * @param scrollerEl - the scroller the transcript lives in.
 * @returns the bearing, or undefined when there is no row to hold on to.
 */
function bearingOf(scrollerEl: HTMLElement): Bearing | undefined {
  const list = scrollerEl.querySelector(FLOW_SLOT)
  if (!list) return undefined
  const contentTop = scrollerEl.getBoundingClientRect().top + scrollerEl.clientTop
  const viewportTop = contentTop + 6
  for (const row of Array.from(list.querySelectorAll<HTMLElement>(ANCHOR_ROWS))) {
    const key = row.getAttribute('data-chat-anchor-key')
    if (!key) continue
    const rect = row.getBoundingClientRect()
    if (rect.height <= 0) continue
    if (rect.bottom <= viewportTop) continue
    return { key, place: rect.top - contentTop + scrollerEl.scrollTop }
  }
  return undefined
}

/**
 * The row with the given key, when the host still has it.
 * @param scrollerEl - the scroller the transcript lives in.
 * @param key - the key the host gave the row.
 * @returns the row, or undefined when the host has dropped it.
 */
function rowByKey(scrollerEl: HTMLElement, key: string): HTMLElement | undefined {
  const list = scrollerEl.querySelector(FLOW_SLOT)
  if (!list) return undefined
  for (const row of Array.from(list.querySelectorAll<HTMLElement>(ANCHOR_ROWS))) {
    if (row.getAttribute('data-chat-anchor-key') === key) return row
  }
  return undefined
}

/**
 * The place of a row in the scrolled content.
 * @param scrollerEl - the scroller the transcript lives in.
 * @param row - the row to measure.
 * @returns the place, in pixels.
 */
function placeOf(scrollerEl: HTMLElement, row: HTMLElement): number {
  const contentTop = scrollerEl.getBoundingClientRect().top + scrollerEl.clientTop
  return row.getBoundingClientRect().top - contentTop + scrollerEl.scrollTop
}

/**
 * Mount the auto-loader on this surface.
 * @param ctx - client root, used to follow the open conversation.
 * @param root - the document the transcript lives in.
 * @param t - the dictionary for the loading copy.
 * @returns a cleanup function.
 */
export function installAutoLoadEarlier(ctx: Context, root: Document, t: TranslateNS<typeof LOCALE_NS>): () => void {
  const win = root.defaultView as (Window & typeof globalThis) | null
  if (!win) return () => {}
  let phase: 'idle' | 'loading' = 'idle'
  /** Counts the reader's gestures; a new one is a new chance to ask. */
  let gestureSeq = 0
  /** The gesture that asked for the last page. */
  let lastTriggerGesture = -1
  /** When the reader's current gesture stops counting as live. */
  let gestureUntil = 0
  let lastScrollTop = 0
  let sawDisabled = false
  let buttonBack = false
  let changed = false
  let lastChangeAt = 0
  let startedAt = 0
  let deadline = 0
  let frame = 0
  let lastHeight = -1
  let lastRows = -1
  let indicator: HTMLElement | undefined
  /** The row the reader is reading, and where it sits in the content. */
  let bearing: Bearing | undefined
  /** The sheet that takes the browser's own anchoring out of the way. */
  let anchorOff: HTMLStyleElement | undefined
  /**
   * The offset this module last wrote, so that its own scroll is not read as
   * the reader's gesture.
   */
  let ownWriteTop: number | undefined
  let disposed = false
  let session = sessionKeyOf(ctx)

  const scroller = () => root.querySelector<HTMLElement>(SCROLLER)
  const column = () => root.querySelector<HTMLElement>(COLUMN)

  /**
   * The host's row that holds the "load earlier" button.
   *
   * The row is a child of the transcript column that carries a button and not
   * the transcript itself. Once the history is exhausted the host drops the
   * row, and the first child of the column is the transcript from then on.
   * @returns the row, or undefined when there is nothing left to load.
   */
  const loadRow = (): HTMLElement | undefined => {
    const col = column()
    if (!col) return undefined
    for (const child of Array.from(col.children)) {
      if (!(child instanceof win.HTMLElement)) continue
      if (child.matches(FLOW_SLOT)) continue
      if (child.querySelector(FLOW_SLOT) !== null) continue
      if (child.querySelector('button') === null) continue
      return child
    }
    return undefined
  }

  /**
   * The host's "load earlier" button, or undefined when there is nothing left
   * to load. A missing button is the end of the conversation's past, not a
   * failure.
   */
  const loadButton = (): HTMLButtonElement | undefined => {
    const button = loadRow()?.querySelector('button')
    return button instanceof win.HTMLButtonElement ? button : undefined
  }

  /** How many rows the host has in the list. */
  const rowCount = (): number => column()?.querySelector(FLOW_SLOT)?.children.length ?? 0

  /**
   * Take the browser's own anchoring out of the way while the page lands.
   *
   * The browser keeps a row in place when content is added above it, and it
   * does so by moving the scroller's offset by the same amount. That is the
   * same correction this module makes, and the two together would move the
   * reader's row twice as far as it should go.
   *
   * The rule is set on the scroller and on everything in it, because the
   * browser picks the anchor among the descendants of the scroller.
   */
  const disableAnchoring = (): void => {
    if (anchorOff?.isConnected) return
    anchorOff?.remove()
    const style = root.createElement('style')
    const pluginId = stylePluginId('ds-bot')
    style.dataset.plugin = pluginId
    style.dataset.pluginCss = `${pluginId}/ds-bot-older-anchoring`
    style.textContent = `${SCROLLER}, ${SCROLLER} * { overflow-anchor: none !important; }`
    const host = root.head ?? root.documentElement
    host.appendChild(style)
    anchorOff = style
  }

  /** Give the browser's own anchoring back. */
  const enableAnchoring = (): void => {
    anchorOff?.remove()
    anchorOff = undefined
  }

  /**
   * Put the growth of the content back into the scroller.
   *
   * The reader's row keeps its place in the content while the older page is
   * spliced in above it, and that place moves by exactly what was added. The
   * scroller is moved by the same amount, and the row stays in the viewport
   * where the reader left it.
   *
   * The reader's own scrolling does not move the place — the row's distance
   * in the viewport and the scroller's offset change by the same amount — so
   * it is left alone.
   * @param scrollerEl - the scroller the transcript lives in.
   */
  const correct = (scrollerEl: HTMLElement): void => {
    if (!bearing) return
    const row = rowByKey(scrollerEl, bearing.key)
    if (!row) {
      // The host has dropped the row; there is nothing to keep in place.
      bearing = undefined
      return
    }
    const place = placeOf(scrollerEl, row)
    const step = place - bearing.place
    if (Math.abs(step) <= WRITE_EPS) return
    scrollerEl.scrollTop += step
    // The place is read back rather than assumed: the scroller may not have
    // taken the whole step, and a place that is off by a little is a drift
    // that grows with every page.
    bearing.place = placeOf(scrollerEl, row)
    ownWriteTop = scrollerEl.scrollTop
  }
  /**
   * Note that the reader is doing something.
   *
   * Input that follows a pause is a new gesture, and a new gesture is what
   * allows another page to be asked for.
   */
  const markGesture = (): void => {
    const now = win.performance.now()
    if (now > gestureUntil) gestureSeq += 1
    gestureUntil = now + GESTURE_WINDOW_MS
  }

  /**
   * Put the indicator where the host's button is.
   *
   * The indicator is pinned to the viewport, not to the content: the older
   * page is spliced in above the reader, and an indicator that travelled with
   * the content would be off screen before the load was over. Its spot is the
   * load row's place in the content, which is where the host's own button
   * sits while the list is at the top.
   *
   * The host's session-title pill hangs over the top of the list, right where
   * the load row is when the list is at the top, so the indicator is kept
   * clear of it and of the edge of the list.
   * @param scrollerEl - the scroller the transcript lives in.
   */
  const placeIndicator = (scrollerEl: HTMLElement): void => {
    if (!indicator) return
    const col = column()
    const row = loadRow()
    if (!col || !row) return
    const colRect = col.getBoundingClientRect()
    const scrollerRect = scrollerEl.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const half = (indicator.offsetHeight || 26) / 2
    // The middle of the load row, where the host's own button sits.
    let centre = rowRect.top + rowRect.height / 2
    const floor = scrollerRect.top + 8 + half
    if (centre < floor) centre = floor
    const header = root.querySelector(HEADER)
    if (header instanceof win.HTMLElement) {
      const clear = header.getBoundingClientRect().bottom + 4 + half
      if (centre < clear) centre = clear
    }
    indicator.style.setProperty('--dsh-enhance-older-y', `${Math.round(centre)}px`)
    indicator.style.setProperty('--dsh-enhance-older-x', `${Math.round(colRect.left + colRect.width / 2)}px`)
  }

  /** Show the indicator over the host's button. */
  const showIndicator = (scrollerEl: HTMLElement): void => {
    if (!column()) return
    loadRow()?.setAttribute(LOADING_ATTR, '')
    if (!indicator) {
      indicator = root.createElement('div')
      indicator.className = SPINNER_CLASS
      const ring = root.createElement('span')
      ring.className = 'dsh-enhance-older-ring'
      ring.setAttribute('aria-hidden', 'true')
      const label = root.createElement('span')
      label.className = 'dsh-enhance-older-label'
      indicator.append(ring, label)
    }
    const label = indicator.querySelector('.dsh-enhance-older-label')
    if (label !== null) label.textContent = t('autoLoad.loading')
    // The indicator lives on the body: a fixed box inside the transcript
    // would be placed against the nearest transformed ancestor, and the
    // transcript's own chrome has one.
    if (!indicator.isConnected) (root.body ?? root.documentElement).appendChild(indicator)
    placeIndicator(scrollerEl)
  }

  /**
   * Take the indicator away and give the host's button back.
   *
   * The host may have rebuilt its load row while the load was on its way, so
   * the mark is taken off the row that is there now.
   */
  const hideIndicator = (): void => {
    indicator?.remove()
    loadRow()?.removeAttribute(LOADING_ATTR)
  }

  /** End the load and let the reader have the button back. */
  const finish = (): void => {
    phase = 'idle'
    if (frame !== 0) {
      win.cancelAnimationFrame(frame)
      frame = 0
    }
    // The last correction, in case the page landed between two frames.
    const scrollerEl = scroller()
    if (scrollerEl) {
      correct(scrollerEl)
      lastScrollTop = scrollerEl.scrollTop
    }
    enableAnchoring()
    bearing = undefined
    ownWriteTop = undefined
    hideIndicator()
  }

  /**
   * Ask the host for the previous page.
   *
   * The host's own button is clicked, so the host does everything it does for
   * a reader who clicks it by hand: it retains the row it marks for paging,
   * pauses following the tail, and puts that row back where it was once the
   * older page has landed.
   *
   * The row the reader is reading is marked down before the click, and the
   * browser's own anchoring is switched off, so that this module's correction
   * is the only one made.
   */
  const trigger = (): void => {
    if (phase === 'loading') return
    const scrollerEl = scroller()
    if (!scrollerEl) return
    const button = loadButton()
    if (!button || button.disabled) return
    const held = bearingOf(scrollerEl)
    if (!held) {
      // There is no row to hold the reader's place by. A load that moves the
      // reader away from what they were reading is worse than no load at all.
      return
    }
    phase = 'loading'
    lastTriggerGesture = gestureSeq
    sawDisabled = false
    buttonBack = false
    changed = false
    lastChangeAt = 0
    startedAt = win.performance.now()
    deadline = startedAt + SETTLE_LIMIT_MS
    lastHeight = scrollerEl.scrollHeight
    lastRows = rowCount()
    bearing = held
    disableAnchoring()
    showIndicator(scrollerEl)
    button.click()
    frame = win.requestAnimationFrame(tick)
  }

  /**
   * Whether the reader's movement may ask for a page.
   *
   * Three things have to hold: no load is on its way, this gesture has not
   * already asked for one, and the list is at the top.
   */
  const mayTrigger = (): boolean => {
    if (phase === 'loading') return false
    if (gestureSeq === lastTriggerGesture) return false
    const scrollerEl = scroller()
    if (!scrollerEl) return false
    return scrollerEl.scrollTop <= TOP_THRESHOLD
  }

  /** Follow the load until the transcript settles. */
  const tick = (): void => {
    frame = 0
    if (disposed || phase !== 'loading') return
    const scrollerEl = scroller()
    if (!scrollerEl) {
      finish()
      return
    }
    if (syncSession()) {
      reset()
      return
    }
    const now = win.performance.now()
    const visibleFor = now - startedAt
    const button = loadButton()
    if (button?.disabled === true) {
      sawDisabled = true
    } else if (sawDisabled) {
      // The host has given the button back: its attempt is over.
      buttonBack = true
    }
    if (scrollerEl.scrollHeight !== lastHeight || rowCount() !== lastRows) {
      changed = true
      lastChangeAt = now
      lastHeight = scrollerEl.scrollHeight
      lastRows = rowCount()
    }
    // The content may have grown above the reader's row since the last frame;
    // the growth is given back to the scroller, so the row stays in the
    // viewport where the reader left it.
    correct(scrollerEl)
    // The host may rebuild its load row while the page is on its way; the
    // mark on it has to be put back, or the button shows through the
    // indicator again.
    loadRow()?.setAttribute(LOADING_ATTR, '')
    placeIndicator(scrollerEl)
    if (changed && now - lastChangeAt >= MIN_VISIBLE_MS) {
      // The transcript has settled: the older page is in.
      finish()
      return
    }
    if (buttonBack && !changed) {
      // The host tried and the transcript did not grow: the reader keeps the
      // button and can ask again.
      finish()
      return
    }
    if (!sawDisabled && !changed && visibleFor > LOAD_GIVE_UP_MS) {
      // The host never showed a loading state and nothing arrived: the click
      // did not take.
      finish()
      return
    }
    if (now > deadline) {
      finish()
      return
    }
    frame = win.requestAnimationFrame(tick)
  }

  /** The reader scrolled: their gesture is the only thing that may trigger a load. */
  const onScroll = (): void => {
    const scrollerEl = scroller()
    if (!scrollerEl) return
    const top = scrollerEl.scrollTop
    if (syncSession()) {
      // A different conversation is open: the old position means nothing.
      reset()
      lastScrollTop = top
      return
    }
    const moved = top - lastScrollTop
    lastScrollTop = top
    // A scroll this module wrote itself is not the reader's gesture: it must
    // not ask for a page, and it must not be counted as one. The mark is
    // taken by the first scroll that follows, whether it is the module's own
    // or the reader's.
    const echo = ownWriteTop !== undefined && Math.abs(top - ownWriteTop) <= WRITE_EPS
    if (ownWriteTop !== undefined) ownWriteTop = undefined
    if (phase === 'loading') {
      // While the older page is on its way, the reader's own scrolling is
      // theirs: the place in the content does not move with it, so the
      // correction leaves it alone.
      return
    }
    if (echo) return
    if (moved >= -0.5) return
    if (!mayTrigger()) return
    trigger()
  }

  /**
   * The reader wheeled up over the transcript.
   *
   * The wheel is a gesture of its own, so it may ask for a page on its own.
   * The reader who is already at the top and wheels up again does not move
   * the list at all, and no scroll follows to ask for the page; without this
   * the reader would have to scroll down and back up to get their history.
   */
  const onWheel = (event: Event): void => {
    const scrollerEl = scroller()
    if (!scrollerEl) return
    const node = event.target
    if (!(node instanceof win.Node)) return
    if (!scrollerEl.contains(node)) return
    if (!((event as WheelEvent).deltaY < 0)) return
    markGesture()
    if (!mayTrigger()) return
    trigger()
  }

  /** The reader grabbed the scrollbar: a drag is a gesture of its own. */
  const onPointerDown = (event: Event): void => {
    const scrollerEl = scroller()
    if (!scrollerEl) return
    const node = event.target
    if (!(node instanceof win.Node)) return
    if (!scrollerEl.contains(node)) return
    gestureSeq += 1
    gestureUntil = win.performance.now() + GESTURE_WINDOW_MS
  }

  const onKeyDown = (event: Event): void => {
    const key = (event as KeyboardEvent).key
    if (!['ArrowUp', 'PageUp', 'Home'].includes(key)) return
    markGesture()
    if (!mayTrigger()) return
    trigger()
  }

  /** A different conversation is open: drop the pending load. */
  const reset = (): void => {
    finish()
    gestureSeq += 1
    lastTriggerGesture = -1
    lastScrollTop = scroller()?.scrollTop ?? 0
  }

  /**
   * Read the open conversation and record it.
   *
   * The binding may not be readable when the plugin mounts and becomes
   * readable a moment later; that first answer is adopted, not treated as a
   * change, or the very first load would be cancelled as a session switch.
   * @returns true only when a known conversation was replaced by another.
   */
  function syncSession(): boolean {
    const key = sessionKeyOf(ctx)
    if (key === undefined) return false
    if (session === undefined) {
      session = key
      return false
    }
    if (key === session) return false
    session = key
    return true
  }

  const stopSession = subscribeSession(ctx, () => { if (syncSession()) reset() })
  root.addEventListener('scroll', onScroll, { capture: true, passive: true })
  root.addEventListener('wheel', onWheel, { passive: true })
  root.addEventListener('pointerdown', onPointerDown, { passive: true })
  root.addEventListener('keydown', onKeyDown)
  lastScrollTop = scroller()?.scrollTop ?? 0

  return () => {
    disposed = true
    finish()
    stopSession()
    root.removeEventListener('scroll', onScroll, { capture: true })
    root.removeEventListener('wheel', onWheel)
    root.removeEventListener('pointerdown', onPointerDown)
    root.removeEventListener('keydown', onKeyDown)
  }
}

/** The binding the host keeps the open conversation in. */
interface SessionBinding {
  getSnapshot?: () => unknown
  value?: unknown
  subscribe?: (listener: () => void) => () => void
}

/**
 * The host's binding for the conversation in the main column.
 * @param ctx - client root.
 * @returns the binding, when the host exposes one.
 */
function bindingOf(ctx: Context): SessionBinding | undefined {
  const ui = (ctx as unknown as {
    uiSession?: { current?: SessionBinding, adapter?: { current?: SessionBinding } }
  }).uiSession
  return ui?.adapter?.current ?? ui?.current
}

/**
 * The conversation the main column is showing.
 * @param ctx - client root.
 * @returns the session id, or undefined when the host does not say.
 */
function sessionKeyOf(ctx: Context): string | undefined {
  const binding = bindingOf(ctx)
  if (!binding) return undefined
  try {
    const snapshot = binding.getSnapshot?.() ?? binding.value
    const current = snapshot as { key?: unknown, props?: { sessionId?: unknown } } | undefined
    const key = current?.key ?? current?.props?.sessionId
    return typeof key === 'string' ? key : undefined
  } catch {
    return undefined
  }
}

/**
 * Follow the conversation the main column is showing.
 * @param ctx - client root.
 * @param listener - called when the conversation changes.
 * @returns a cleanup function.
 */
function subscribeSession(ctx: Context, listener: () => void): () => void {
  const binding = bindingOf(ctx)
  try {
    const stop = binding?.subscribe?.(() => listener())
    if (typeof stop === 'function') return stop
  } catch {
    /* the host may not expose the binding yet */
  }
  return () => {}
}

/**
 * The indicator, and the rule that takes the host's button out of the picture
 * while it is up. The button keeps its place: the indicator is not in the
 * host's row, so nothing is pushed around by it, and the row keeps the height
 * it had, so the list does not jump when the indicator comes up.
 *
 * The browser's own anchoring is not in this sheet: it is switched off at
 * runtime, and only while the older page is on its way, by a style this
 * module injects and takes away again when the page has landed. A sheet that
 * is mounted for the whole session would switch the browser's anchoring off
 * for the whole session as well, and the host's own paging would lose it.
 */
export const css = `
[data-dsh-enhance-older-loading] button {
  visibility: hidden !important;
}
.dsh-enhance-older-spinner {
  position: fixed !important;
  top: var(--dsh-enhance-older-y, 0px) !important;
  left: var(--dsh-enhance-older-x, 0px) !important;
  transform: translate(-50%, -50%) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  box-sizing: border-box !important;
  height: 26px !important;
  padding: 0 11px !important;
  border-radius: 9999px !important;
  background: color-mix(in srgb, var(--bt-main, #fff) 82%, transparent) !important;
  border: 1px solid var(--bt-line, rgba(20, 20, 20, .08)) !important;
  box-shadow: 0 6px 18px -8px rgba(0, 0, 0, .28), 0 1px 3px rgba(0, 0, 0, .06) !important;
  -webkit-backdrop-filter: blur(16px) saturate(1.6) !important;
  backdrop-filter: blur(16px) saturate(1.6) !important;
  color: var(--bt-ink-2, rgba(20, 20, 20, .6)) !important;
  font-size: 12px !important;
  line-height: 1 !important;
  letter-spacing: .01em !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  user-select: none !important;
  z-index: 40 !important;
}
.dsh-enhance-older-ring {
  flex: none !important;
  width: 12px !important;
  height: 12px !important;
  border-radius: 50% !important;
  border: 1.5px solid color-mix(in srgb, currentColor 28%, transparent) !important;
  border-top-color: currentColor !important;
  animation: dsh-enhance-older-spin .8s linear infinite !important;
}
@keyframes dsh-enhance-older-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-enhance-older-ring {
    animation-duration: 2.6s !important;
  }
}
`
