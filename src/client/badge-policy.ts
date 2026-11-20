/** The DSH session list fields used by the Dock badge. */
export interface PolicySessionRow {
  blank?: boolean
  origin?: string
}

export interface PolicyStatus {
  completionUnread?: boolean
}

/** A read-only status lookup: a Map or the host's get-only snapshot. */
export interface StatusView {
  get(id: string): PolicyStatus | undefined
}

/** Return unread completions and background finishes for existing DSH sessions. */
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
