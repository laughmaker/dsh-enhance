/**
 * How a surface turns session status into a Dock count.
 *
 * The painting mechanism is shared. The count is not: each surface picks its
 * own policy. DSH counts the sidebar's unread-completion dots. DS Bot's
 * exclusion rules (which sessions to drop, whether to group by bot) are not
 * decided yet, so its policy is an explicit hook that still uses the same
 * projection and is marked pending. It does not invent a grouping.
 */

/** The list-row fields the policy reads. */
export interface PolicySessionRow {
  blank?: boolean
  origin?: string
}

/** The status bit the policy reads. */
export interface PolicyStatus {
  completionUnread?: boolean
}

/** A read-only status lookup: a Map or the host's get-only snapshot. */
export interface StatusView {
  get(id: string): PolicyStatus | undefined
}

/** One surface's counting rule. */
export interface BadgePolicy {
  /** Stable id, so a log can say which rule painted the tile. */
  readonly id: string
  /** True while the rule is a stand-in for one the user has not specified. */
  readonly pending: boolean
  /** Why the rule is pending, empty when it is the settled DSH projection. */
  readonly note: string
  /**
   * Ids to count, in list order.
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
 * The counting rule for one surface.
 *
 * DS Bot does not yet say which sessions to exclude or whether a bot's chats
 * count as one. Until that is specified, the hook keeps the DSH projection and
 * says so on `pending`.
 * @param surface - the decided surface.
 * @returns the policy `installTurnBadge` calls.
 */
export function badgePolicyFor(surface: 'dsh' | 'ds-bot'): BadgePolicy {
  if (surface === 'ds-bot') {
    return {
      id: 'ds-bot-completion-unread-pending',
      pending: true,
      note: 'Which DS Bot sessions to exclude, and whether to group by bot, is unspecified. Temporarily the same completionUnread projection as DSH.',
      select: completionUnreadIds,
    }
  }
  return {
    id: 'dsh-completion-unread',
    pending: false,
    note: '',
    select: completionUnreadIds,
  }
}
