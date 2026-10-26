/**
 * A sidebar drag floor 50px below the app's own.
 *
 * The app clamps the sidebar to `SIDEBAR_MIN = 264` inside the layout package: a
 * module constant, unreachable from a stylesheet or a plugin's services, and the
 * reason the local installer used to string-replace it in a build artifact.
 *
 * Rather than rewriting the app's rendered value on every frame — two writers of
 * one property oscillate — this module takes over the gesture itself. On
 * `pointerdown` at the resize handle it stops the event before React's handler
 * sees it, so the app never starts its own drag, and it writes the width while it
 * owns the gesture. One writer, one width, no fighting.
 *
 * Three places paint the same number and all three are written here: the shell's
 * grid track, the sidebar content's inline width, and the handle's `left`. Only
 * elements that actually mirror the column width are rewritten — an element
 * carrying some other fixed px width (a row's timestamp column, an icon box)
 * must not be stamped with the sidebar width, or the row's inner layout breaks
 * into a dead strip.
 */

/** This plugin's floor: 50px below the app's own 264px minimum. */
const RELAXED_FLOOR = 214

/** The app's ceiling, kept so the gesture cannot exceed the layout's design. */
const CEILING = 420

/** Attribute marking the shell frame this module is driving. */
const FRAME_ATTRIBUTE = 'data-dsh-enhance-frame'

/**
 * Install the relaxed drag floor.
 * @param root - document the plugin is mounted in.
 * @returns disposer that stops intercepting and restores the app's own value.
 */
export function installSidebarFloor(root: Document): () => void {
  /** Shell grid frame, once located. */
  let frame: HTMLElement | null = null
  /** The width the plugin last painted, when it is below the app's floor. */
  let held: number | undefined
  /** Elements whose inline width this module overwrote, with their originals. */
  const restored = new Map<HTMLElement, string>()
  let dragStart: { x: number; width: number } | null = null
  let applying = false

  /** Find the shell frame: the grid whose first child is the sidebar column. */
  const findFrame = (): HTMLElement | null => {
    for (const element of root.querySelectorAll<HTMLElement>('div[style*="grid-template-columns"]')) {
      if (!/^\s*\d+(?:\.\d+)?px\s+minmax\(/.test(element.style.gridTemplateColumns)) continue
      if (element.firstElementChild?.className.includes('sidebarCol') === true) return element
    }
    return null
  }

  /** The sidebar width the grid currently paints. */
  const painted = (): number => {
    const match = /^\s*(\d+(?:\.\d+)?)px/.exec(frame?.style.gridTemplateColumns ?? '')
    return match === null ? 0 : Number(match[1])
  }

  /**
   * Elements inside the column that mirror the sidebar width.
   *
   * Only a child whose inline width equals the width the app just painted on
   * the track (or the width this module last painted) counts as a mirror.
   * Foreign fixed widths — a co-installed plugin's panel, an icon box — must
   * never be stamped, or their internal layout breaks into a dead strip.
   * @param mirrors - widths to accept as "the column's own value".
   * @returns the mirror elements, in document order.
   */
  const widthCarriers = (mirrors: readonly number[]): HTMLElement[] => {
    const column = frame?.firstElementChild
    if (column === null || column === undefined) return []
    const carriers: HTMLElement[] = []
    const qualifies = (element: HTMLElement): boolean => {
      const match = /^(\d+(?:\.\d+)?)px$/.exec(element.style.width)
      if (match === null) return false
      const width = Number(match[1])
      return mirrors.some((mirror) => Math.abs(width - mirror) <= 1)
    }
    const visit = (element: Element, depth: number): void => {
      if (depth > 3) return
      for (const child of element.children) {
        if (!(child instanceof HTMLElement)) continue
        if (qualifies(child)) carriers.push(child)
        visit(child, depth + 1)
      }
    }
    visit(column, 0)
    return carriers
  }

  /** Paint one width into the grid, the content boxes, and the handle. */
  const apply = (width: number): void => {
    const target = frame
    if (target === null) return
    applying = true
    try {
      const rounded = Math.round(width)
      // Accept as mirrors both the width the app just painted on the track and
      // the held one: an element React re-rendered to the app's value needs
      // restamping, and one already at the held value survives a no-op pass.
      const mirrors = [painted(), rounded]
      target.style.gridTemplateColumns = target.style.gridTemplateColumns
        .replace(/^\s*\d+(?:\.\d+)?px/, `${rounded}px`)
      const carriers = new Set(widthCarriers(mirrors))
      // An element this module already owns stays owned: React may repaint it
      // to a value that matches neither the track nor the held width, and
      // leaving one stale mirror behind splits the column from its content.
      for (const element of restored.keys()) if (element.isConnected) carriers.add(element)
      for (const carrier of carriers) {
        if (!restored.has(carrier)) restored.set(carrier, carrier.style.width)
        carrier.style.width = `${rounded}px`
      }
      const handle = root.querySelector<HTMLElement>('[data-side="sidebar"]')
      if (handle !== null) handle.style.left = `${rounded}px`
    } finally {
      applying = false
      frameObserver.takeRecords()
    }
  }

  /** Put every inline width back the way the app had it. */
  const restore = (): void => {
    for (const [element, value] of restored) element.style.width = value
    restored.clear()
    held = undefined
  }

  /**
   * Keep the plugin's width while the app still reports its own floor.
   *
   * The app repaints the grid whenever unrelated layout state changes, and it
   * re-renders the content element's width (React re-mounts it on right-panel
   * transitions) without touching the grid string at all. Watching both: a
   * drifted track is re-held (or adopted on a collapse), and a drifted mirror
   * is re-stamped even when the track still reads the held width — the one
   * content-only repaint is exactly what used to leave a dead strip.
   */
  const reconcile = (): void => {
    if (applying) return
    frame ??= findFrame()
    if (frame === null) return
    if (held === undefined) return
    for (const element of [...restored.keys()]) if (!element.isConnected) restored.delete(element)
    const drifted = restored.size === 0
      ? false
      : [...restored.keys()].some((element) => element.style.width !== `${Math.round(held!)}px`)
    if (Math.abs(painted() - held) > 0.5) {
      adoptAppWidth()
      if (held === undefined) return
      apply(held)
      return
    }
    if (drifted) apply(held)
  }

  const frameObserver = new MutationObserver(() => { reconcile() })

  /** Attach to the shell frame, watching it for later app writes. */
  const attach = (): void => {
    const target = findFrame()
    if (target === null || target === frame) return
    frameObserver.disconnect()
    frame = target
    frame.setAttribute(FRAME_ATTRIBUTE, '')
    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style'] })
    // The sidebar root is a direct child of the column; a re-mount there is a
    // childList change, and React rewriting its inline width is a style
    // attribute change. Either repaints the content without touching the grid
    // string — the drift that used to leave a dead strip beside the rows.
    const column = frame.firstElementChild
    if (column !== null) frameObserver.observe(column, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
    if (held !== undefined) apply(held)
  }

  const onPointerDown = (event: PointerEvent): void => {
    const handle = event.target
    if (!(handle instanceof Element)) return
    if (handle.getAttribute('data-side') !== 'sidebar') return
    attach()
    if (frame === null) return
    // Take every drag on this handle. The gesture is cheap to own and the plugin
    // only *paints* a width below the app's floor; above it, it writes the app's own
    // value, which is exactly what the app would have done.
    event.stopPropagation()
    event.preventDefault()
    dragStart = { x: event.clientX, width: painted() }
    handle.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (dragStart === null) return
    if (event.buttons === 0) { endDrag(); return }
    event.stopPropagation()
    const wanted = dragStart.width + (event.clientX - dragStart.x)
    const next = Math.min(Math.max(wanted, RELAXED_FLOOR), CEILING)
    held = next
    apply(next)
  }

  const endDrag = (): void => {
    if (dragStart === null) return
    dragStart = null
  }

  /**
   * Drop the overrides when the app takes the column over on its own.
   *
   * A collapse (to the 56px rail) is the app's gesture, not this module's: the
   * plugin has no width to hold there, and repainting one would fight the rail.
   */
  const adoptAppWidth = (): void => {
    if (held === undefined) return
    const current = painted()
    if (current > 0 && current < RELAXED_FLOOR) restore()
  }

  attach()
  root.addEventListener('pointerdown', onPointerDown, true)
  root.addEventListener('pointermove', onPointerMove, true)
  root.addEventListener('pointerup', endDrag, true)
  root.addEventListener('pointercancel', endDrag, true)

  // The shell can be replaced when the view reloads; re-attach when it is.
  const reattach = new MutationObserver(() => { if (frame === null || !frame.isConnected) attach() })
  reattach.observe(root.documentElement, { childList: true, subtree: true })

  return () => {
    frameObserver.disconnect()
    reattach.disconnect()
    root.removeEventListener('pointerdown', onPointerDown, true)
    root.removeEventListener('pointermove', onPointerMove, true)
    root.removeEventListener('pointerup', endDrag, true)
    root.removeEventListener('pointercancel', endDrag, true)
    restore()
    frame?.removeAttribute(FRAME_ATTRIBUTE)
  }
}
