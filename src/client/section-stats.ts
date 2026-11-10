/**
 * Replace the sidebar's "Workspaces" heading with icon counts.
 *
 * The heading names a section the tree below it already makes obvious, so the
 * space is better spent on counts. Two pairs share the slot and only one shows:
 *
 *   idle    sessions total, workspace total
 *   active  sessions running now, sessions finished but not yet looked at
 *
 * The second pair wins whenever either of its numbers is above zero, because a
 * running or unread conversation is the thing the reader came to the sidebar to
 * find. Both pairs are always in the DOM; the stylesheet picks which one is
 * visible, so a repaint never has to rebuild the row.
 *
 * The host owns the heading text and re-renders it, so this module never edits
 * that node. It appends its own row as the heading's sibling and the stylesheet
 * hides the text. Removing the row on dispose puts the heading back exactly as
 * the host rendered it.
 */
import type { Context } from '@deepseek-ai/cordis'

/** Marks the injected row, for the stylesheet and the disposer. */
export const STATS_ATTRIBUTE = 'data-dsh-enhance-stats'

/** The row fields this module counts. */
export interface StatsSessionRow {
  blank?: boolean
  origin?: string
  running?: boolean
}

/** The status fields this module reads. */
export interface StatsStatus {
  completionUnread?: boolean
}

/** A status snapshot: a Map, or anything with the same get. */
export type StatsStatusSnapshot =
  | ReadonlyMap<string, StatsStatus>
  | { get(id: string): StatsStatus | undefined }

/** The four numbers the row can show. */
export interface SectionCounts {
  /** Sessions that are neither blank placeholders nor subagent children. */
  sessions: number
  /** Workspaces in the list. */
  workspaces: number
  /** Sessions currently running. */
  running: number
  /** Sessions whose completion the reader has not looked at. */
  unread: number
}

/** The two faces the row reads, kept structural so tests need no host. */
export interface SectionStatsSources {
  sessions(): { byId: Readonly<Record<string, StatsSessionRow>> }
  subscribeSessions(listener: () => void): () => void
  status(): StatsStatusSnapshot
  subscribeStatus(listener: () => void): () => void
  workspaces(): { length: number }
  subscribeWorkspaces(listener: () => void): () => void
}

/**
 * Count what the row displays.
 *
 * Blank rows and subagent children are excluded from every session count: the
 * sidebar shows neither as a conversation of its own, so counting them would
 * disagree with the tree under the heading.
 * @param byId - the session list snapshot.
 * @param status - the session status snapshot.
 * @param workspaces - number of workspaces in the list.
 * @returns the four counts.
 */
export function sectionCounts(
  byId: Readonly<Record<string, StatsSessionRow>>,
  status: StatsStatusSnapshot,
  workspaces: number,
): SectionCounts {
  let sessions = 0
  let running = 0
  let unread = 0
  for (const [id, row] of Object.entries(byId)) {
    if (row.blank === true || row.origin === 'subagent') continue
    sessions += 1
    if (row.running === true) running += 1
    if (status.get(id)?.completionUnread === true) unread += 1
  }
  return { sessions, workspaces, running, unread }
}

/** One icon plus its number. The icon is a lucide glyph in a 24px box. */
interface StatItem {
  /** Which count fills the number. */
  count: keyof SectionCounts
  /** Hover text, with the number filled in. */
  tip: (count: number) => string
  /** Inner SVG markup: the lucide glyph named in the comment above it. */
  icon: string
}

/**
 * The idle pair: how many conversations exist, and how many workspaces hold them.
 *
 * `message-circle-more` stands for a conversation, which is what a session is
 * here. `folder` stands for a workspace, the group the tree splits sessions into.
 */
const IDLE_ITEMS: readonly StatItem[] = [
  {
    count: 'sessions',
    tip: (count) => `${count} sessions`,
    icon: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>',
  },
  {
    count: 'workspaces',
    tip: (count) => `${count} workspaces`,
    icon: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  },
]

/**
 * The active pair: conversations running right now, and ones that finished
 * without being looked at.
 *
 * `directions-run` is the running mark: a figure mid-stride, which reads as
 * running where a standing figure does not. `bell-dot` is the unread mark, a
 * bell with a dot, the same idea as the green dot on a finished session.
 */
const ACTIVE_ITEMS: readonly StatItem[] = [
  {
    count: 'running',
    tip: (count) => `${count} running`,
    icon: '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2z"/>',
  },
  {
    count: 'unread',
    tip: (count) => `${count} unread`,
    icon: '<path d="M19.4 14.9C20.2 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 .7 0 1.3.1 1.9.3"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><circle cx="18" cy="8" r="3"/>',
  },
]

/** One count: the icon, then the number. The hover text starts empty and is filled with the number. */
function item(entry: StatItem): string {
  return `<span class="dsh-enhance-stat" data-count="${entry.count}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true">${entry.icon}</svg>`
    + `<span class="dsh-enhance-stat__value"></span>`
    + `</span>`
}

/** Hover text for one count, looked up by the key the row stores on each item. */
const TIPS: Readonly<Record<keyof SectionCounts, (count: number) => string>> = Object.fromEntries(
  [...IDLE_ITEMS, ...ACTIVE_ITEMS].map((entry) => [entry.count, entry.tip]),
) as Record<keyof SectionCounts, (count: number) => string>

/** The row: the idle pair and the active pair, one of them hidden by CSS. */
function rowMarkup(): string {
  return `<span class="dsh-enhance-stats__group" data-group="idle">${IDLE_ITEMS.map(item).join('')}</span>`
    + `<span class="dsh-enhance-stats__group" data-group="active">${ACTIVE_ITEMS.map(item).join('')}</span>`
}

/**
 * Write the four numbers into a row already in the document.
 *
 * Only a number that changed is touched, so a list update that moves nothing
 * this row cares about costs no layout.
 * @param row - the injected row.
 * @param counts - the numbers to show.
 * @param previous - the numbers currently shown, mutated to match.
 */
export function paintCounts(row: HTMLElement, counts: SectionCounts, previous: Partial<SectionCounts>): void {
  const active = counts.running > 0 || counts.unread > 0
  if (row.dataset.active !== String(active)) row.dataset.active = String(active)
  for (const key of ['sessions', 'workspaces', 'running', 'unread'] as const) {
    if (previous[key] === counts[key]) continue
    previous[key] = counts[key]
    const value = row.querySelector<HTMLElement>(`[data-count="${key}"] .dsh-enhance-stat__value`)
    if (value !== null) value.textContent = String(counts[key])
    // The tip carries the number too, so it is rewritten with the value.
    const stat = row.querySelector<HTMLElement>(`[data-count="${key}"]`)
    if (stat !== null) stat.title = TIPS[key](counts[key])
  }
}

/**
 * Install the counts in place of the section heading.
 * @param ctx - client root carrying the session list, its status and the workspaces.
 * @param root - document the plugin is mounted in.
 * @param sources - override the host stores, mainly for tests.
 * @returns disposer that removes the row.
 */
export function installSectionStats(ctx: Context, root: Document, sources?: SectionStatsSources): () => void {
  const from = sources ?? sourcesFrom(ctx)
  if (from === undefined) return () => {}

  let frame = 0
  let row: HTMLElement | null = null
  const shown: Partial<SectionCounts> = {}

  /** The heading the host renders, re-queried because a re-render replaces it. */
  const heading = (): HTMLElement | null => {
    for (const column of root.querySelectorAll<HTMLElement>('[class*="sidebarCol"]')) {
      const label = column.querySelector<HTMLElement>('[class*="sectionLabel"]')
      if (label !== null) return label
    }
    return null
  }

  /** Build the row once and keep it next to the heading. */
  const place = (): void => {
    const label = heading()
    if (label === null || label.parentElement === null) return
    if (row === null || !row.isConnected) {
      row = root.createElement('span')
      row.setAttribute(STATS_ATTRIBUTE, '')
      row.className = 'dsh-enhance-stats'
      row.innerHTML = rowMarkup()
      for (const key of Object.keys(shown)) delete shown[key as keyof SectionCounts]
    }
    if (row.previousElementSibling !== label) label.after(row)
  }

  /** Recompute and paint. Cheap enough to run on every list change. */
  const paint = (): void => {
    place()
    if (row === null) return
    paintCounts(row, sectionCounts(from.sessions().byId, from.status(), from.workspaces().length), shown)
  }

  const schedule = (): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      paint()
    })
  }

  // The heading node is replaced whenever the host re-renders that row, which
  // also happens while the reader types into the sidebar search. Watching the
  // column catches the replacement; the stores catch the numbers.
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

  watch()
  paint()
  const stopSessions = from.subscribeSessions(paint)
  const stopStatus = from.subscribeStatus(paint)
  const stopWorkspaces = from.subscribeWorkspaces(paint)
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
    stopSessions()
    stopStatus()
    stopWorkspaces()
    row?.remove()
    row = null
  }
}

/** The host stores behind the structural face, or undefined when one is missing. */
function sourcesFrom(ctx: Context): SectionStatsSources | undefined {
  const services = ctx as unknown as {
    sessions?: { list?: Store<{ byId: Readonly<Record<string, StatsSessionRow>> }> }
    uiSession?: { sessionStatus?: Store<StatsStatusSnapshot> }
    workspaces?: { list?: Store<{ items: readonly unknown[] }> }
  }
  const sessions = services.sessions?.list
  const status = services.uiSession?.sessionStatus
  const workspaces = services.workspaces?.list
  if (sessions === undefined || status === undefined || workspaces === undefined) return undefined
  return {
    sessions: () => sessions.getSnapshot(),
    subscribeSessions: (listener) => sessions.subscribe(listener),
    status: () => status.getSnapshot(),
    subscribeStatus: (listener) => status.subscribe(listener),
    workspaces: () => ({ length: workspaces.getSnapshot().items.length }),
    subscribeWorkspaces: (listener) => workspaces.subscribe(listener),
  }
}

/** The slice of a host store this module uses. */
interface Store<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}
