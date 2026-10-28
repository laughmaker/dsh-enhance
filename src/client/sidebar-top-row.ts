/**
 * Put the sidebar's footer plugin icons into the top panel row.
 *
 * Plugins that add a sidebar entry choose a slot; two are in use in practice.
 * A *panel* (`panelList`, the nav the app renders) is already at the top. A
 * *footer action* (`sidebar.footer.action`, rendered inside `footArea`) lands
 * next to the account row at the bottom — which is why a newly installed plugin
 * shows up there and reads as a different kind of control from the icons above.
 *
 * CSS cannot merge the two: they are separate flex containers with separate
 * parents, and no amount of `order` moves a node into a sibling container. So
 * this module moves the footer's action container into the panel nav once the
 * shell exists, and the stylesheet dissolves it (`display: contents`) so its
 * buttons join the row the nav lays out. Five per line, wrapping beyond that:
 * the nav's own max-width does the counting (see sidebar-layout.css).
 *
 * The relocated element is the *container* the host owns, not the entries a
 * plugin renders. React updates those entries inside it and removes them from
 * it, and both keep working because their parent never changed; the container
 * itself is rendered unconditionally by the sidebar shell, so it is not a node
 * React re-parents. Verified on a live web instance: moving it, opening the
 * plugin's own panel (a fixed overlay), collapsing and expanding the sidebar
 * produced no console errors, no duplicated container, and no lost entry.
 *
 * If a future re-render does put the container back, the observer moves it
 * again on the next frame; the move is idempotent.
 */

/** Marks the relocated container, for both the stylesheet and the disposer. */
export const ENTRIES_ATTRIBUTE = 'data-dsh-enhance-entries'

/**
 * Install the relocation.
 * @param root - document the plugin is mounted in.
 * @returns disposer that puts the container back where the host rendered it.
 */
export function installSidebarTopRow(root: Document): () => void {
  /** Original parent and the sibling it sat before, for the disposer. */
  let home: Element | null = null
  let homeNext: Element | null = null
  let frame = 0

  /** The sidebar's panel nav and footer action container, re-queried each pass. */
  const locate = (): { nav: HTMLElement, actions: HTMLElement } | null => {
    for (const column of root.querySelectorAll<HTMLElement>('[class*="sidebarCol"]')) {
      const nav = column.querySelector<HTMLElement>('[class*="panelList"]')
      const actions = column.querySelector<HTMLElement>('[class*="footerActions"]')
      if (nav !== null && actions !== null) return { nav, actions }
    }
    return null
  }

  /** Move the footer's action container into the panel row, once. */
  const relocate = (): void => {
    const found = locate()
    if (found === null) return
    const { nav, actions } = found
    if (actions.parentElement === nav) return
    home = actions.parentElement
    homeNext = actions.nextElementSibling
    actions.setAttribute(ENTRIES_ATTRIBUTE, '')
    nav.append(actions)
  }

  const schedule = (): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      relocate()
    })
  }

  // Watch the shell, not the document: the transcript above the sidebar repaints
  // continuously while a turn streams, and none of those mutations matter here.
  // Re-attaching is cheap, so a replaced sidebar column is picked up as well.
  let observer: MutationObserver | null = null
  let observed: Element | null = null

  const watch = (): void => {
    const column = root.querySelector<HTMLElement>('[class*="sidebarCol"]')
    if (column === observed) return
    observer?.disconnect()
    observer = new MutationObserver(schedule)
    observed = column
    observer.observe(column ?? root.documentElement, { childList: true, subtree: true })
  }

  const start = (): void => {
    watch()
    relocate()
  }

  start()
  // The shell mounts after this plugin's effect runs, so retry when it appears.
  // This observer sees every streaming repaint of the transcript too, so it does
  // nothing while the column it already watches is still connected — the check
  // is a flag, not a query.
  const mountWatcher = new MutationObserver(() => {
    if (observed !== null && observed.isConnected) return
    watch()
    schedule()
  })
  mountWatcher.observe(root.documentElement, { childList: true, subtree: true })

  return () => {
    if (frame !== 0) cancelAnimationFrame(frame)
    observer?.disconnect()
    mountWatcher.disconnect()
    const moved = root.querySelector<HTMLElement>(`[${ENTRIES_ATTRIBUTE}]`)
    if (moved === null || home === null) return
    moved.removeAttribute(ENTRIES_ATTRIBUTE)
    if (homeNext !== null && homeNext.parentElement === home) home.insertBefore(moved, homeNext)
    else home.append(moved)
  }
}
