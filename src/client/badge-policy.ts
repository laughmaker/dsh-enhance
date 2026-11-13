/**
 * How a surface turns session status into a Dock count.
 *
 * The painting mechanism is shared. The count is not: each surface picks its
 * own policy. DSH counts the sidebar's unread-completion dots. DS Bot draws its
 * own sidebar, one row per bot, with a `bt-unread` dot on each row that has
 * something unread, so its count is the number of those rendered rows. Counting
 * the rows instead of the session list excludes history and subagent sessions
 * for free, because the sidebar never renders them.
 */

/** The list-row fields the DSH projection reads. */
export interface PolicySessionRow {
  blank?: boolean
  origin?: string
}

/** The status bit the DSH projection reads. */
export interface PolicyStatus {
  completionUnread?: boolean
}

/** A read-only status lookup: a Map or the host's get-only snapshot. */
export interface StatusView {
  get(id: string): PolicyStatus | undefined
}

/** The dots DS Bot renders on its left column. */
export const DS_BOT_UNREAD_DOT = '.bt-leftcol .bt-row .bt-unread'

/** The row a dot belongs to; one row may carry several marks. */
const DS_BOT_ROW = '.bt-row'

/** The little of an element that counting needs; a test can pass a stand-in. */
export interface RowElement {
  closest?(selector: string): RowElement | null
  getAttribute?(name: string): string | null
  getClientRects?(): ArrayLike<unknown>
}

/** The little of a document that counting needs. */
export interface RowDom {
  querySelectorAll(selector: string): ArrayLike<RowElement>
}

/** One surface's counting rule. */
export interface BadgePolicy {
  /** Stable id, so a log can say which rule painted the tile. */
  readonly id: string
  /** True while the rule is a stand-in for one the user has not specified. */
  readonly pending: boolean
  /** Why the rule is pending, empty when the surface's rule is settled. */
  readonly note: string
  /**
   * Ids to count, in list order. DS Bot ignores the arguments and reads the
   * sidebar it already renders.
   * @param byId - list rows by id.
   * @param status - session status by id.
   * @param attention - sessions that finished while the window was unfocused.
   */
  select(
    byId: Readonly<Record<string, PolicySessionRow>>,
    status: StatusView,
    attention?: ReadonlySet<string>,
  ): string[]
}

/**
 * Visible rows whose completion is unread, plus the attention overlay.
 *
 * Blank placeholders and subagent children are skipped. Statuses whose row is
 * gone are skipped too.
 * @param byId - list rows by id.
 * @param status - session status by id.
 * @param attention - extra ids that finished in the background.
 * @returns the ids, in list order.
 */
export function completionUnreadIds(
  byId: Readonly<Record<string, PolicySessionRow>>,
  status: StatusView,
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
 * The rows DS Bot renders with an unread dot.
 *
 * One row is one bot, so the number of rows is the number the sidebar shows.
 * Several marks on one row count once; a mark that is not laid out (a hidden
 * section, a collapsed group) is skipped.
 * @param root - the document, or a stand-in in tests. Defaults to `document`.
 * @returns one entry per unread row, capped at the Host's own badge ceiling.
 */
export function unreadSidebarRows(root?: RowDom | null): RowElement[] {
  const scope = root ?? defaultRoot()
  if (scope === undefined || scope === null) return []
  const rows = new Set<RowElement>()
  for (const dot of Array.from(scope.querySelectorAll(DS_BOT_UNREAD_DOT))) {
    if (!isLaidOut(dot)) continue
    const row = dot.closest?.(DS_BOT_ROW) ?? dot
    rows.add(row)
    if (rows.size >= 999) break
  }
  return [...rows]
}

/**
 * Whether an element occupies space on the page.
 *
 * A stand-in without layout methods counts as shown, so a test can model only
 * the structure it cares about.
 * @param element - the candidate.
 * @returns false only when the element reports that it has no boxes.
 */
function isLaidOut(element: RowElement): boolean {
  if (typeof element.getClientRects !== 'function') return true
  try {
    return element.getClientRects().length > 0
  } catch {
    return true
  }
}

/**
 * The page's document, when there is one.
 * @returns the document as a counting root, or undefined outside a DOM.
 */
function defaultRoot(): RowDom | undefined {
  if (typeof document === 'undefined') return undefined
  return document as unknown as RowDom
}

/**
 * A stable key for one row, so `select` can return ids rather than elements.
 * @param row - the row element.
 * @param index - its position, used when the row carries no id.
 * @returns the row's bot or room id, else its index.
 */
function rowKey(row: RowElement, index: number): string {
  const id = row.getAttribute?.('data-bot-id') ?? row.getAttribute?.('data-room-id')
  return id === null || id === undefined || id === '' ? `row-${index}` : id
}

/**
 * The counting rule for one surface.
 *
 * DS Bot counts the unread rows its own left column renders, which is exactly
 * the number of green dots the reader sees. An empty sidebar therefore clears
 * the tile, and an unrendered history session can never inflate it.
 * @param surface - the decided surface.
 * @param options - `root` overrides the document in tests.
 * @returns the policy `installTurnBadge` calls.
 */
export function badgePolicyFor(
  surface: 'dsh' | 'ds-bot',
  options: { root?: RowDom | null } = {},
): BadgePolicy {
  if (surface === 'ds-bot') {
    return {
      id: 'ds-bot-sidebar-unread-rows',
      pending: false,
      note: 'One count per unread row in the DS Bot left column: the same rows that carry a green dot.',
      select: () => unreadSidebarRows(options.root).map(rowKey),
    }
  }
  return {
    id: 'dsh-completion-unread',
    pending: false,
    note: '',
    select: completionUnreadIds,
  }
}
