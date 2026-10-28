/**
 * Dock badge mirroring the sidebar's unread-completion dots.
 *
 * The Host's Session status projection (`uiSession.sessionStatus`) already
 * owns the fact "this conversation ended and the reader has not looked at
 * it": a running→idle transition of a non-main session marks it
 * `completionUnread`, opening the session clears it, a deletion prunes it,
 * and the sidebar paints the green dot from the same bit. The badge is
 * therefore a pure projection — count the visible rows carrying that bit and
 * paint the number on the tile.
 *
 * Painting goes through the Host, not the page: Electron's renderer does not
 * implement the Badging API, so `navigator.setAppBadge` resolved to nothing and
 * the icon stayed bare while the sidebar showed dots. The count is POSTed to
 * this plugin's own Host route instead, where the main process owns
 * `app.dock.setBadge`. A plain browser (the web UI installed as an app) still
 * gets the Badging API when it has one.
 *
 * Counting the dots instead of accumulating transitions keeps the tile
 * honest: it equals what the sidebar shows, it falls as conversations are
 * read, and it never needs its own persistence — a reload recomputes the
 * same set the sidebar repaints.
 *
 * One case the Host's projection cannot see: a turn that finishes while the
 * window is in the background. `completionUnread` is set only when the
 * finishing session is *not* the one in the main column — switching to another
 * app leaves the running session on screen, so the Host never marks it and the
 * icon stayed bare exactly when a reminder was most useful. This module
 * therefore overlays its own attention mark: a session observed running→idle
 * while the page did not have focus counts too, and returning to the window
 * clears those marks (the reader is looking at that conversation again).
 */
import type { Context } from '@deepseek-ai/cordis'
import { BADGE_ROUTE } from '../badge-route.ts'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'

/** localStorage key of the pre-v2 accumulating badge; cleared once on mount. */
export const LEGACY_STORAGE_KEY = 'dsh-enhance.turn-badge.v1'

/** The Badging API face; both methods are absent on plain browsers. */
export interface BadgeLike {
  set(contents?: number): Promise<void>
  clear(): Promise<void>
}

/** The list-row fields this module reads, kept structural for testability. */
export interface BadgeSessionRow {
  blank?: boolean
  origin?: string
}

/** The Session status fields this module reads. */
export interface BadgeStatus {
  completionUnread?: boolean
}

/** The status snapshot face: a Map, or the structural get-only shape. */
export type BadgeStatusSnapshot =
  | ReadonlyMap<string, BadgeStatus>
  | { get(id: string): BadgeStatus | undefined }

/** The status store this module subscribes to. */
export interface BadgeStatusStore {
  getSnapshot(): BadgeStatusSnapshot
  subscribe(listener: () => void): () => void
}

/** Focus facts this module reads, kept structural for testability. */
export interface AttentionSource {
  /** Whether the page currently has the reader's attention. */
  focused(): boolean
  /** Subscribe to focus entering or leaving; returns the disposer. */
  subscribe(listener: () => void): () => void
}

/** Seam for the host surfaces this module touches. */
export interface TurnBadgeDeps {
  /** Window attention; defaults to `document.hasFocus()` and its focus events. */
  attention?: AttentionSource
  /** The Badging API; defaults to `navigator.setAppBadge` when present. */
  badge?: BadgeLike
  /** Override the Session status store, mainly for tests. */
  statusSource?: BadgeStatusStore
  /**
   * Deliver the count to the Host that paints the native tile.
   *
   * Defaults to a same-origin POST to this plugin's Host route: the desktop
   * shell forwards that path to the Host, which owns the Dock badge. Overridden
   * in tests, where there is no Host.
   */
  paintHost?: (count: number) => void
}

/**
 * Report one count to the Host's badge route.
 *
 * Fire-and-forget by design: a failed badge is cosmetic, and the sidebar dots
 * remain the source of truth the reader can still act on.
 * @param count - unread completions; 0 clears the tile.
 */
function postBadgeCount(count: number): void {
  if (typeof fetch !== 'function' || typeof document === 'undefined') return
  const base = document.baseURI
  if (typeof base !== 'string' || base === '') return
  let url: string
  try {
    url = new URL(BADGE_ROUTE, base).href
  } catch {
    return
  }
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ count }),
    }).catch(() => {})
  } catch {
    // A shell that refuses the request leaves the badge off; the sidebar dots
    // still carry the information.
  }
}

/**
 * Ids of visible (non-blank, non-subagent) sessions whose completion is
 * unread. Statuses of rows the list no longer carries are skipped: a deleted
 * conversation shows no dot in the sidebar either.
 * @param byId - the list snapshot's rows by id.
 * @param status - the Session status snapshot.
 * @param attention - sessions that finished while the window was in the
 *   background; the Host's projection does not mark those.
 * @returns the ids to count on the tile, in list order.
 */
export function unreadVisibleIds(
  byId: Readonly<Record<string, BadgeSessionRow>>,
  status: BadgeStatusSnapshot,
  attention?: ReadonlySet<string>,
): string[] {
  const unread: string[] = []
  for (const [id, row] of Object.entries(byId)) {
    if (row.blank === true || row.origin === 'subagent') continue
    if (status.get(id)?.completionUnread === true || attention?.has(id) === true) unread.push(id)
  }
  return unread
}

/**
 * The page's own attention source: the window focus the browser reports, with
 * a hidden (minimised or fully occluded) document counting as unfocused.
 * @returns the source, or undefined outside a DOM.
 */
function documentAttention(): AttentionSource | undefined {
  if (typeof document === 'undefined' || typeof window === 'undefined') return undefined
  const focused = (): boolean =>
    document.hasFocus() && document.visibilityState !== 'hidden'
  return {
    focused,
    subscribe(listener) {
      window.addEventListener('focus', listener)
      window.addEventListener('blur', listener)
      document.addEventListener('visibilitychange', listener)
      return () => {
        window.removeEventListener('focus', listener)
        window.removeEventListener('blur', listener)
        document.removeEventListener('visibilitychange', listener)
      }
    },
  }
}

/**
 * Install the unread-session Dock badge.
 * @param ctx - client root context providing the sessions and uiSession services.
 * @param deps - seams, overridable in tests.
 * @returns disposer.
 */
export function installTurnBadge(ctx: Context, deps: TurnBadgeDeps = {}): () => void {
  const badgeNavigator = navigator as Navigator & Partial<BadgeLike>
  const badge = deps.badge
    ?? (typeof badgeNavigator.setAppBadge === 'function'
      ? {
        set: (contents?: number) => badgeNavigator.setAppBadge?.(contents) ?? Promise.resolve(),
        clear: () => badgeNavigator.clearAppBadge?.() ?? Promise.resolve(),
      }
      : undefined)
  const paintHost = deps.paintHost ?? postBadgeCount
  const attentionSource = deps.attention ?? documentAttention()
  const statusStore = deps.statusSource
    ?? (ctx as unknown as { uiSession?: { sessionStatus?: BadgeStatusStore } }).uiSession?.sessionStatus
  if (statusStore === undefined) return () => {}

  // Retire the v1 accumulating count so a stale number cannot haunt the
  // projection-based badge after an update.
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* nothing to retire when storage is blocked */
  }

  let painted: number | undefined
  /** Sessions that finished while the window was in the background. */
  const attention = new Set<string>()
  /** Last observed running flag per session, for detecting the finish edge. */
  let wasRunning = new Map<string, boolean>()

  /**
   * Record completions the Host's projection cannot see.
   *
   * The Host marks a finish unread only when that conversation is not the one
   * on screen; a turn that ends while the reader is in another app leaves the
   * running session on screen, so it is never marked. This watches the same
   * list for a running→idle edge while the page is unfocused.
   */
  const observeRunning = (byId: Readonly<Record<string, BadgeSessionRow & { running?: boolean }>>): void => {
    const next = new Map<string, boolean>()
    for (const [id, row] of Object.entries(byId)) {
      const running = row.running === true
      if (wasRunning.get(id) === true && !running && attentionSource?.focused() === false) attention.add(id)
      next.set(id, running)
    }
    wasRunning = next
    for (const id of [...attention]) if (!(id in byId)) attention.delete(id)
  }

  const paint = (): void => {
    const byId = ctx.sessions.list.getSnapshot().byId as Readonly<
      Record<string, BadgeSessionRow & { running?: boolean }>
    >
    observeRunning(byId)
    const count = unreadVisibleIds(byId, statusStore.getSnapshot(), attention).length
    if (painted === count) return
    painted = count
    // The Host owns the native tile; a browser with the Badging API paints its
    // own. Both are projections of the same count, so they cannot disagree.
    paintHost(count)
    if (badge !== undefined) void (count > 0 ? badge.set(count) : badge.clear()).catch(() => {})
  }

  const stopStatus = statusStore.subscribe(paint)
  const stopList = ctx.sessions.list.subscribe(paint)
  // Coming back to the window means the reader is looking at whatever finished
  // out there; the marks that exist only for that are done.
  const stopAttention = attentionSource?.subscribe(() => {
    if (attentionSource.focused()) attention.clear()
    paint()
  })
  paint()

  return () => {
    stopStatus()
    stopList()
    stopAttention?.()
  }
}
