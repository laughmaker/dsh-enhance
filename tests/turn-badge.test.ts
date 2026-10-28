/**
 * Unit tests for the unread-session Dock badge module.
 *
 * Run with the DSH checkout's vitest binary:
 *   node_modules/.bin/vitest run tests
 */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import {
  installTurnBadge, unreadVisibleIds,
  type AttentionSource, type BadgeLike, type BadgeSessionRow, type BadgeStatus, type BadgeStatusStore,
} from '../src/client/turn-badge.ts'

const row = (over: Partial<BadgeSessionRow> = {}): BadgeSessionRow => ({ ...over })

describe('unreadVisibleIds', () => {
  it('counts visible rows whose completion is unread', () => {
    const byId = { a: row(), b: row() }
    const status = new Map<string, BadgeStatus>([['a', { completionUnread: true }]])
    expect(unreadVisibleIds(byId, status)).toEqual(['a'])
  })
  it('excludes blank placeholders and subagent children', () => {
    const byId = { a: row({ blank: true }), kid: row({ origin: 'subagent' }) }
    const status = new Map<string, BadgeStatus>([
      ['a', { completionUnread: true }],
      ['kid', { completionUnread: true }],
    ])
    expect(unreadVisibleIds(byId, status)).toEqual([])
  })
  it('ignores statuses the list no longer carries', () => {
    const status = new Map<string, BadgeStatus>([['gone', { completionUnread: true }]])
    expect(unreadVisibleIds({}, status)).toEqual([])
  })
})

interface Harness {
  setRows(rows: Record<string, BadgeSessionRow>): void
  emitList(): void
  setStatus(id: string, unread: boolean): void
  emitStatus(): void
  setBadge: ReturnType<typeof vi.fn>
  clearBadge: ReturnType<typeof vi.fn>
  paintHost: ReturnType<typeof vi.fn>
  setFocused: (focused: boolean) => void
  dispose: () => void
}

function mount(initial: Record<string, BadgeSessionRow>, initialStatus = new Map<string, BadgeStatus>()): Harness {
  let rows = initial
  let status = initialStatus
  const listListeners = new Set<() => void>()
  const statusListeners = new Set<() => void>()
  const statusStore: BadgeStatusStore = {
    getSnapshot: () => status,
    subscribe: (listener) => {
      statusListeners.add(listener)
      return () => void statusListeners.delete(listener)
    },
  }
  const ctx = {
    sessions: {
      list: {
        getSnapshot: () => ({ byId: rows }),
        subscribe: (listener: () => void) => {
          listListeners.add(listener)
          return () => void listListeners.delete(listener)
        },
      },
    },
  } as unknown as Context
  const setBadge = vi.fn().mockResolvedValue(undefined)
  const clearBadge = vi.fn().mockResolvedValue(undefined)
  const paintHost = vi.fn()
  const focusListeners = new Set<() => void>()
  let focused = true
  const attention: AttentionSource = {
    focused: () => focused,
    subscribe: (listener) => {
      focusListeners.add(listener)
      return () => void focusListeners.delete(listener)
    },
  }
  const badge: BadgeLike = { set: setBadge, clear: clearBadge }
  const dispose = installTurnBadge(ctx, { badge, statusSource: statusStore, paintHost, attention })
  return {
    setRows: (next) => {
      rows = next
    },
    emitList: () => listListeners.forEach((listener) => listener()),
    setStatus: (id, unread) => {
      status = new Map(status).set(id, { completionUnread: unread })
    },
    emitStatus: () => statusListeners.forEach((listener) => listener()),
    setBadge,
    clearBadge,
    paintHost,
    setFocused: (next) => {
      focused = next
      focusListeners.forEach((listener) => listener())
    },
    dispose,
  }
}

describe('installTurnBadge', () => {
  it('paints the unread-dot count on mount', () => {
    const h = mount(
      { a: row(), b: row(), c: row() },
      new Map([['a', { completionUnread: true }], ['b', { completionUnread: true }]]),
    )
    expect(h.setBadge).toHaveBeenCalledWith(2)
    expect(h.paintHost).toHaveBeenLastCalledWith(2)
    h.dispose()
  })

  it('rises when a completion goes unread', () => {
    const h = mount({ a: row() })
    h.setStatus('a', true)
    h.emitStatus()
    expect(h.setBadge).toHaveBeenLastCalledWith(1)
    h.dispose()
  })

  it('falls as conversations are read', () => {
    const h = mount({ a: row(), b: row() }, new Map([
      ['a', { completionUnread: true }],
      ['b', { completionUnread: true }],
    ]))
    h.setStatus('a', false)
    h.emitStatus()
    expect(h.setBadge).toHaveBeenLastCalledWith(1)
    h.dispose()
  })

  it('clears the tile when the last unread is read', () => {
    const h = mount({ a: row() }, new Map([['a', { completionUnread: true }]]))
    h.setStatus('a', false)
    h.emitStatus()
    expect(h.clearBadge).toHaveBeenCalled()
    h.dispose()
  })

  it('recounts when the list changes without a status event', () => {
    const h = mount({ a: row(), b: row() }, new Map([
      ['a', { completionUnread: true }],
      ['b', { completionUnread: true }],
    ]))
    h.setRows({ a: row() })
    h.emitList()
    expect(h.setBadge).toHaveBeenLastCalledWith(1)
    h.dispose()
  })

  it('does not repaint the same count', () => {
    const h = mount({ a: row() }, new Map([['a', { completionUnread: true }]]))
    h.emitStatus()
    h.emitList()
    expect(h.setBadge).toHaveBeenCalledTimes(1)
    h.dispose()
  })

  it('counts a completion that landed while the window was in the background', () => {
    // The Host marks a finish unread only when its session is NOT the one on
    // screen, so a turn finishing behind another app needs this module's own mark.
    const h = mount({ a: row({ running: true }) as BadgeSessionRow })
    expect(h.paintHost).toHaveBeenLastCalledWith(0)
    h.setFocused(false)
    h.setRows({ a: row({ running: false }) as BadgeSessionRow })
    h.emitList()
    expect(h.paintHost).toHaveBeenLastCalledWith(1)
    expect(h.setBadge).toHaveBeenLastCalledWith(1)
    h.dispose()
  })

  it('drops the background mark when the reader returns to the window', () => {
    const h = mount({ a: row({ running: true }) as BadgeSessionRow })
    h.setFocused(false)
    h.setRows({ a: row({ running: false }) as BadgeSessionRow })
    h.emitList()
    expect(h.paintHost).toHaveBeenLastCalledWith(1)
    h.setFocused(true)
    expect(h.paintHost).toHaveBeenLastCalledWith(0)
    h.dispose()
  })

  it('does not count a completion that finished in front of the reader', () => {
    const h = mount({ a: row({ running: true }) as BadgeSessionRow })
    h.setRows({ a: row({ running: false }) as BadgeSessionRow })
    h.emitList()
    expect(h.paintHost).toHaveBeenLastCalledWith(0)
    h.dispose()
  })

  it('reports to the Host even when the page has no Badging API', () => {
    let rows = { a: row() }
    let status = new Map<string, BadgeStatus>([['a', { completionUnread: true }]])
    const statusListeners = new Set<() => void>()
    const ctx = {
      sessions: { list: { getSnapshot: () => ({ byId: rows }), subscribe: () => () => {} } },
    } as unknown as Context
    const paintHost = vi.fn()
    const statusStore: BadgeStatusStore = {
      getSnapshot: () => status,
      subscribe: (listener) => {
        statusListeners.add(listener)
        return () => void statusListeners.delete(listener)
      },
    }
    // Electron's renderer has no Badging API; the Host route is the only path.
    const dispose = installTurnBadge(ctx, { badge: undefined, statusSource: statusStore, paintHost })
    expect(paintHost).toHaveBeenLastCalledWith(1)
    status = new Map([['a', { completionUnread: false }]])
    statusListeners.forEach((listener) => listener())
    expect(paintHost).toHaveBeenLastCalledWith(0)
    rows = {}
    dispose()
  })

  it('no-ops without a Badging API and never subscribes', () => {
    let subscribed = false
    const ctx = {
      sessions: {
        list: {
          getSnapshot: () => ({ byId: {} }),
          subscribe: () => {
            subscribed = true
            return () => {}
          },
        },
      },
    } as unknown as Context
    const dispose = installTurnBadge(ctx, { badge: undefined as unknown as BadgeLike })
    expect(subscribed).toBe(false)
    expect(() => dispose()).not.toThrow()
  })

  it('no-ops when the host exposes no session status store', () => {
    const ctx = {
      sessions: { list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} } },
    } as unknown as Context
    const dispose = installTurnBadge(ctx, {
      badge: { set: vi.fn(), clear: vi.fn() } as unknown as BadgeLike,
      statusSource: undefined as unknown as BadgeStatusStore,
    })
    expect(() => dispose()).not.toThrow()
  })
})
