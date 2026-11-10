/**
 * Unit tests for the section-heading counts.
 *
 * Run with this checkout's vitest binary:
 *   node_modules/.bin/vitest run tests/section-stats.test.ts
 */
import { describe, expect, it } from 'vitest'
import {
  paintCounts, sectionCounts,
  type SectionCounts, type StatsSessionRow, type StatsStatus,
} from '../src/client/section-stats.ts'

const row = (over: Partial<StatsSessionRow> = {}): StatsSessionRow => ({ ...over })

describe('sectionCounts', () => {
  it('counts sessions, the running ones and the unread ones', () => {
    const byId = { a: row({ running: true }), b: row(), c: row() }
    const status = new Map<string, StatsStatus>([['b', { completionUnread: true }]])
    expect(sectionCounts(byId, status, 2)).toEqual({
      sessions: 3, workspaces: 2, running: 1, unread: 1,
    })
  })

  it('excludes blank placeholders and subagent children from every count', () => {
    const byId = {
      blank: row({ blank: true, running: true }),
      kid: row({ origin: 'subagent', running: true }),
      real: row(),
    }
    const status = new Map<string, StatsStatus>([
      ['blank', { completionUnread: true }],
      ['kid', { completionUnread: true }],
    ])
    expect(sectionCounts(byId, status, 1)).toEqual({
      sessions: 1, workspaces: 1, running: 0, unread: 0,
    })
  })

  it('ignores a status the list no longer carries', () => {
    const status = new Map<string, StatsStatus>([['gone', { completionUnread: true }]])
    expect(sectionCounts({}, status, 0).unread).toBe(0)
  })
})

/**
 * The slice of a DOM node `paintCounts` touches, built from plain objects so the
 * test runs without a DOM.
 */
class FakeElement {
  dataset: Record<string, string> = {}
  textContent = ''
  className = ''
  title = ''
  /** Nodes in document order, keyed by the selector that finds them. */
  private readonly kids = new Map<string, FakeElement>()

  constructor(readonly selector: string) {}

  querySelector<T>(selector: string): T | null {
    const found = this.kids.get(selector)
    return (found as unknown as T) ?? null
  }

  /** Register a node under the exact selector paintCounts looks it up with. */
  add(selector: string): FakeElement {
    const kid = new FakeElement(selector)
    this.kids.set(selector, kid)
    return kid
  }
}

function mountRow(): FakeElement {
  const row = new FakeElement('[data-dsh-enhance-stats]')
  for (const count of ['sessions', 'workspaces', 'running', 'unread']) {
    row.add(`[data-count="${count}"] .dsh-enhance-stat__value`)
    // The item itself carries the hover tip, looked up without the value class.
    row.add(`[data-count="${count}"]`)
  }
  return row
}

const counts = (over: Partial<SectionCounts> = {}): SectionCounts => ({
  sessions: 4, workspaces: 2, running: 0, unread: 0, ...over,
})

describe('paintCounts', () => {
  it('shows the idle pair while nothing is running or unread', () => {
    const row = mountRow()
    paintCounts(row as unknown as HTMLElement, counts(), {})
    expect(row.dataset.active).toBe('false')
    expect(row.querySelector('[data-count="sessions"] .dsh-enhance-stat__value')?.textContent).toBe('4')
    expect(row.querySelector('[data-count="workspaces"] .dsh-enhance-stat__value')?.textContent).toBe('2')
    // The hover tip names the count and carries the same number.
    expect(row.querySelector<FakeElement>('[data-count="sessions"]')?.title).toBe('4 sessions')
    expect(row.querySelector<FakeElement>('[data-count="workspaces"]')?.title).toBe('2 workspaces')
  })

  it('switches to the active pair once a session is running or unread', () => {
    const row = mountRow()
    paintCounts(row as unknown as HTMLElement, counts({ running: 1, unread: 3 }), {})
    expect(row.dataset.active).toBe('true')
    expect(row.querySelector('[data-count="running"] .dsh-enhance-stat__value')?.textContent).toBe('1')
    expect(row.querySelector('[data-count="unread"] .dsh-enhance-stat__value')?.textContent).toBe('3')
    expect(row.querySelector<FakeElement>('[data-count="running"]')?.title).toBe('1 running')
    expect(row.querySelector<FakeElement>('[data-count="unread"]')?.title).toBe('3 unread')
  })

  it('skips a number that did not change and rewrites one that did', () => {
    const row = mountRow()
    const shown: Partial<SectionCounts> = {}
    paintCounts(row as unknown as HTMLElement, counts(), shown)
    const sessions = row.querySelector<FakeElement>('[data-count="sessions"] .dsh-enhance-stat__value')
    if (sessions === null) throw new Error('missing sessions value')
    let writes = 0
    // Every rewrite assigns textContent, so counting assignments counts writes.
    Object.defineProperty(sessions, 'textContent', {
      set() { writes += 1 },
      get() { return '4' },
    })
    paintCounts(row as unknown as HTMLElement, counts({ workspaces: 5 }), shown)
    // The sessions number did not change, so its node is not rewritten; the
    // workspace number did.
    expect(writes).toBe(0)
    expect(row.querySelector('[data-count="workspaces"] .dsh-enhance-stat__value')?.textContent).toBe('5')
  })
})
