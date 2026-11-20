// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { installTurnBadge } from '../src/client/turn-badge.ts'
import { currentSurface, featuresFor, resetSurfaceForTests } from '../src/client/surface.ts'

afterEach(() => {
  resetSurfaceForTests()
  vi.unstubAllGlobals()
})

it('leaves the DS Bot badge untouched even when the installer is called directly', () => {
  currentSurface({ serviceNames: ['ds-bot'] })
  expect(featuresFor('ds-bot').badge).toBe(false)
  const bridge = vi.fn()
  const paintHost = vi.fn()
  const badge = { set: vi.fn(), clear: vi.fn() }
  const subscribe = vi.fn()
  vi.stubGlobal('dsBotApp', { setBadge: bridge })
  vi.stubGlobal('fetch', vi.fn())
  const ctx = { sessions: { list: { subscribe } } } as unknown as Context
  const statusSource = { getSnapshot: () => new Map(), subscribe }
  const dispose = installTurnBadge(ctx, { paintHost, badge, statusSource })
  dispose()
  expect(bridge).not.toHaveBeenCalled()
  expect(paintHost).not.toHaveBeenCalled()
  expect(badge.set).not.toHaveBeenCalled()
  expect(badge.clear).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
  expect(subscribe).not.toHaveBeenCalled()
})
