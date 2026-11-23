const LIST = '.bt-leftcol > .bt-side > .bt-list'
const MOTION = '(prefers-reduced-motion: no-preference) and (any-pointer: fine)'
const EDGE_GESTURE_GAP = 140
const SCROLL_CONFIRM_WINDOW = 300
const BOUNCE_DISTANCE = 9
const BOUNCE_DURATION = 150
const GROUP = '.bt-sec, .bt-sec-body, .bt-sec-body-in, .bt-sec-ungrouped'

function visibleContent(list: HTMLElement, direction: number, height: number, end: number) {
  const viewport = list.getBoundingClientRect()
  const towardTop = direction < 0
  const targets: { element: Element; distance: number }[] = []

  // Start at the reached edge so large rosters only visit one screen of rows.
  const collect = (parent: Element) => {
    let child = towardTop ? parent.firstElementChild : parent.lastElementChild
    while (child) {
      const bounds = child.getBoundingClientRect()
      if (towardTop ? bounds.top >= viewport.bottom : bounds.bottom <= viewport.top) break
      if (bounds.height > 0 && bounds.bottom > viewport.top && bounds.top < viewport.bottom) {
        if (bounds.height > height && child.matches(GROUP)) {
          collect(child)
        } else {
          // A downward transform can extend the scroll range on short lists.
          const space = viewport.top + height + end - bounds.bottom
          const distance = towardTop ? Math.min(BOUNCE_DISTANCE, Math.floor(space)) : -BOUNCE_DISTANCE
          if (!towardTop || distance > 0) targets.push({ element: child, distance })
        }
      }
      child = towardTop ? child.nextElementSibling : child.previousElementSibling
    }
  }
  collect(list)
  return targets
}

interface WheelGesture {
  list: HTMLElement
  direction: number
  lastWheel: number
  feedbackShown: boolean
}

/** Leave the list's scroll offset and hit regions to the browser. */
export function installSidebarBounce(root: Document): () => void {
  const win = root.defaultView as (Window & typeof globalThis) | null
  // DS Bot's Electron window uses the default scrollBounce: false. In a
  // standalone browser its own overscroll applies without a plugin animation.
  if (!win?.matchMedia || !/\bElectron\//.test(win.navigator.userAgent)
    || typeof win.Element.prototype.animate !== 'function') return () => {}
  const motion = win.matchMedia(MOTION)
  const animations = new Set<Animation>()
  let gesture: WheelGesture | undefined
  let frame = 0

  const inspectEdge = () => {
    frame = 0
    if (!gesture || gesture.feedbackShown || !motion.matches) return
    const { list, direction, lastWheel } = gesture
    if (win.performance.now() - lastWheel > SCROLL_CONFIRM_WINDOW || !list.isConnected
      || list.closest('.bt-leftcol[data-leaving]') || root.documentElement.hasAttribute('data-ds-enhance-resizing')) return
    const height = list.clientHeight
    const end = list.scrollHeight - height
    const offset = list.scrollTop
    if (end <= 1 || (direction < 0 ? offset > 1 : offset < end - 1)) return

    gesture.feedbackShown = true
    // Let the active bounce finish through a reversal. Never restart it mid-flight.
    if (animations.size) return
    for (const { element, distance } of visibleContent(list, direction, height, end)) {
      const animation = element.animate([
        { translate: '0 0', easing: 'ease-out' },
        { translate: `0 ${distance}px`, offset: 0.24, easing: 'ease-out' },
        { translate: '0 0' },
      ], BOUNCE_DURATION)
      animations.add(animation)
      animation.onfinish = animation.oncancel = () => { animations.delete(animation) }
    }
  }
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(inspectEdge)
  }
  const reset = () => {
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    gesture = undefined
    for (const animation of animations.values()) animation.cancel()
    animations.clear()
  }

  const onWheel = (event: WheelEvent) => {
    if (!motion.matches || event.defaultPrevented || event.ctrlKey || event.shiftKey || event.buttons) return
    if (!Number.isFinite(event.deltaY) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const target = event.target
    if (!(target instanceof win.Element)) return
    const list = target.closest<HTMLElement>(LIST)
    if (!list) return
    const direction = Math.sign(event.deltaY)
    const now = win.performance.now()
    if (!gesture || gesture.list !== list || gesture.direction !== direction || now - gesture.lastWheel >= EDGE_GESTURE_GAP) {
      gesture = { list, direction, lastWheel: now, feedbackShown: false }
    } else {
      gesture.lastWheel = now
    }
    if (!gesture.feedbackShown) schedule()
  }

  const onScroll = (event: Event) => {
    if (gesture && event.target === gesture.list && !gesture.feedbackShown
      && win.performance.now() - gesture.lastWheel <= SCROLL_CONFIRM_WINDOW) schedule()
  }
  root.addEventListener('wheel', onWheel, { passive: true })
  root.addEventListener('scroll', onScroll, { capture: true, passive: true })
  motion.addEventListener('change', reset)
  return () => {
    root.removeEventListener('wheel', onWheel)
    root.removeEventListener('scroll', onScroll, true)
    motion.removeEventListener('change', reset)
    reset()
  }
}
