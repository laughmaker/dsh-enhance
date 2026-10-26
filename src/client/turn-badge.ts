/**
 * Dock badge mirroring the sidebar's unread-completion dots.
 *
 * The Host's Session status projection (`uiSession.sessionStatus`) already
 * owns the fact "this conversation ended and the reader has not looked at
 * it": a running→idle transition of a non-main session marks it
 * `completionUnread`, opening the session clears it, a deletion prunes it,
 * and the sidebar paints the green dot from the same bit. The badge is
 * therefore a pure projection — count the visible rows carrying that bit and
 * paint the number on the macOS Dock tile through the standard Badging API
 * (`navigator.setAppBadge`), which the Host exposes to plugins nowhere else.
 *
 * Counting the dots instead of accumulating transitions keeps the tile
 * honest: it equals what the sidebar shows, it falls as conversations are
 * read, and it never needs its own persistence — a reload recomputes the
 * same set the sidebar repaints.
 */
import type { Context } from '@deepseek-ai/cordis'
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

/** Seam for the host surfaces this module touches. */
export interface TurnBadgeDeps {
  /** The Badging API; defaults to `navigator.setAppBadge` when present. */
  badge?: BadgeLike
  /** Override the Session status store, mainly for tests. */
  statusSource?: BadgeStatusStore
}

/**
 * Ids of visible (non-blank, non-subagent) sessions whose completion is
 * unread. Statuses of rows the list no longer carries are skipped: a deleted
 * conversation shows no dot in the sidebar either.
 * @param byId - the list snapshot's rows by id.
 * @param status - the Session status snapshot.
 * @returns the ids to count on the tile, in list order.
 */
export function unreadVisibleIds(
  byId: Readonly<Record<string, BadgeSessionRow>>,
  status: BadgeStatusSnapshot,
): string[] {
  const unread: string[] = []
  for (const [id, row] of Object.entries(byId)) {
    if (row.blank === true || row.origin === 'subagent') continue
    if (status.get(id)?.completionUnread === true) unread.push(id)
  }
  return unread
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
  if (badge === undefined) return () => {}
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

  const paint = (): void => {
    const count = unreadVisibleIds(
      ctx.sessions.list.getSnapshot().byId as Readonly<Record<string, BadgeSessionRow>>,
      statusStore.getSnapshot(),
    ).length
    if (painted === count) return
    painted = count
    void (count > 0 ? badge.set(count) : badge.clear()).catch(() => {})
  }

  const stopStatus = statusStore.subscribe(paint)
  const stopList = ctx.sessions.list.subscribe(paint)
  paint()

  return () => {
    stopStatus()
    stopList()
  }
}
