/** Guards on the per-surface split: only one branch may mount per process. */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentSurface,
  detectSurface,
  featuresFor,
  resetSurfaceForTests,
  stylePluginId,
  type Surface,
} from '../src/client/surface.ts'
import { DS_BOT_SHEETS, SHEETS, sheetsFor } from '../src/client/styles.ts'
import { BADGE_ROUTE, badgeRouteFor } from '../src/badge-route.ts'
import { storageKeyFor as sidebarKeyFor } from '../src/client/sidebar-width.ts'
import { storageKeyFor as geometryKeyFor } from '../src/client/window-geometry.ts'
import { badgePolicyFor, completionUnreadIds } from '../src/client/badge-policy.ts'
import { DSH_SELECTORS, DS_BOT_SELECTORS, selectorsFor } from '../src/client/selectors.ts'
import { css as dsBotMarkdownAnchors } from '../src/client/surfaces/ds-bot/markdown-anchors.ts'
import { css as dsBotChrome } from '../src/client/surfaces/ds-bot/chrome.ts'
import { DETAILS_MIN, LEFT_MIN } from '../src/client/surfaces/ds-bot/panel-widths.ts'

beforeEach(() => resetSurfaceForTests())

describe('surface detection', () => {
  it('recognises the ds-bot bundle by service name', () => {
    expect(detectSurface({ serviceNames: ['@deepseek-ai/dsh-base', 'ds-bot'] })).toBe('ds-bot')
  })

  it('does not match a longer unrelated token', () => {
    expect(detectSurface({ serviceNames: ['ds-bot-extra'] })).toBe('dsh')
  })

  it('falls back to the DS Bot left column', () => {
    const root = { querySelector: (selector: string) => (selector === '.bt-leftcol' ? {} : null) }
    expect(detectSurface({ root })).toBe('ds-bot')
  })

  it('defaults to DSH', () => {
    expect(detectSurface({})).toBe('dsh')
  })

  it('reads the DS Bot id out of the boot entry array', () => {
    const prior = (globalThis as { __DSH_BOOT__?: unknown }).__DSH_BOOT__
    ;(globalThis as { __DSH_BOOT__?: unknown }).__DSH_BOOT__ = {
      entries: [{ id: 'ds-bot', moduleName: '@deepseek-ai/dsh-web-app' }],
    }
    try {
      expect(currentSurface()).toBe('ds-bot')
    } finally {
      ;(globalThis as { __DSH_BOOT__?: unknown }).__DSH_BOOT__ = prior
      resetSurfaceForTests()
    }
  })

  it('decides once and can be reset for tests', () => {
    expect(currentSurface({ serviceNames: ['ds-bot'] })).toBe('ds-bot')
    expect(currentSurface({ serviceNames: [] })).toBe('ds-bot')
    resetSurfaceForTests()
    expect(currentSurface({ serviceNames: [] })).toBe('dsh')
  })
})

describe('feature switches', () => {
  it('turns the DSH chrome off on DS Bot', () => {
    const f = featuresFor('ds-bot')
    expect([f.sidebarFloor, f.sidebarTopRow, f.sectionStats, f.whale, f.windowGeometry])
      .toEqual([false, false, false, false, false])
  })

  it('keeps every shared feature on in both apps', () => {
    for (const surface of ['dsh', 'ds-bot'] as Surface[]) {
      const f = featuresFor(surface)
      expect([f.annotations, f.sideChat, f.fileMenu, f.markdown, f.documentPreview, f.badge])
        .toEqual([true, true, true, true, true, true])
    }
  })

  it('gives each surface its own style identity', () => {
    expect(stylePluginId('dsh')).toBe('dsh-enhance')
    expect(stylePluginId('ds-bot')).toBe('ds-bot-enhance')
  })
})

describe('style sets', () => {
  it('keeps the eight DSH sheets untouched', () => {
    expect(SHEETS).toHaveLength(8)
    expect(sheetsFor('dsh')).toBe(SHEETS)
  })

  it('mounts no DSH chrome sheet on DS Bot', () => {
    const names = DS_BOT_SHEETS.map(([name]) => name)
    for (const chrome of ['sidebar-density.css', 'sidebar-layout.css', 'running-spinner.css', 'rightbar-handle.css']) {
      expect(names).not.toContain(chrome)
    }
    expect(names).toContain('chat-markdown.css')
    expect(names).toContain('toolbar.css')
    expect(names).toContain('ds-bot-chrome.css')
    expect(names).toContain('ds-bot-markdown-anchors.css')
  })

  it('outranks the DS Bot bubble rules with a higher-specificity anchor', () => {
    expect(dsBotMarkdownAnchors).toContain('[data-slot="conversation.chat.node"] .bt-bubble [class*="_markdown"]')
    expect(dsBotMarkdownAnchors).toContain('font-size: 13px !important')
    expect(dsBotMarkdownAnchors).toContain('margin: 0 0 1em !important')
  })

  it('ships the DS Bot chrome rules with the requested hidden sidebar toggles', () => {
    expect(dsBotChrome).toContain('.bt-drawer-top')
    expect(dsBotChrome).toContain('position: absolute !important')
    expect(dsBotChrome).toContain('top: 20px !important')
    expect(dsBotChrome).toContain('right: 20px !important')
    expect(dsBotChrome).toContain('.bt-side-top .bt-brand')
    expect(dsBotChrome).toContain('min-width: 220px !important')
    expect(dsBotChrome).toContain('border-top-right-radius: 0 !important')
    expect(dsBotChrome).toContain('.bt-title-toggle,\n.bt-side-collapse,')
  })

  it('styles the sidebar actions like the other tool buttons', () => {
    expect(dsBotChrome).toContain('.bt-side-top .bt-round')
    expect(dsBotChrome).toContain('background: transparent !important')
    expect(dsBotChrome).toContain('.bt-side-top .bt-round:hover')
    expect(dsBotChrome).toContain('var(--bt-hover) !important')
  })

  it('relaxes the DS Bot column ranges on that surface only', () => {
    expect(LEFT_MIN).toBe(220)
    expect(DETAILS_MIN).toBe(260)
    expect(featuresFor('ds-bot').panelWidths).toBe(true)
    expect(featuresFor('dsh').panelWidths).toBe(false)
  })

  it('keeps host horizontal layout and removes the desktop inner corner and fade', () => {
    expect(dsBotChrome).toContain('html[data-windows-titlebar] div[class*="_centerCol"]')
    expect(dsBotChrome).toContain('border-top-left-radius: 0 !important')
    expect(dsBotChrome).toContain('content: none !important')
    expect(dsBotChrome).not.toContain('body:has(.bt-panel)')
    expect(dsBotChrome).not.toContain('var(--bt-panel-w, 320px)')
  })
})

describe('badge routes and policies', () => {
  it('separates the two routes', () => {
    expect(BADGE_ROUTE).toBe('/dsh-enhance/badge')
    expect(badgeRouteFor('dsh')).toBe('/dsh-enhance/badge')
    expect(badgeRouteFor('ds-bot')).toBe('/ds-bot-enhance/badge')
  })

  it('marks the DS Bot count rule as pending', () => {
    expect(badgePolicyFor('ds-bot').pending).toBe(true)
    expect(badgePolicyFor('dsh').pending).toBe(false)
  })

  it('counts visible unread rows and skips placeholders and subagents', () => {
    const byId = { a: {}, b: { blank: true }, c: { origin: 'subagent' } }
    const status = new Map([
      ['a', { completionUnread: true }],
      ['b', { completionUnread: true }],
      ['c', { completionUnread: true }],
    ])
    expect(completionUnreadIds(byId, status)).toEqual(['a'])
  })
})

describe('namespaces', () => {
  it('separates storage keys', () => {
    expect(sidebarKeyFor('ds-bot')).toBe('ds-bot-enhance.sidebar-width.v1')
    expect(geometryKeyFor('ds-bot')).toBe('ds-bot-enhance.window-geometry.v1')
    expect(sidebarKeyFor('dsh')).not.toBe(sidebarKeyFor('ds-bot'))
    expect(geometryKeyFor('dsh')).not.toBe(geometryKeyFor('ds-bot'))
  })

  it('keeps a distinct selector map per surface', () => {
    expect(selectorsFor('dsh')).toBe(DSH_SELECTORS)
    expect(selectorsFor('ds-bot')).toBe(DS_BOT_SELECTORS)
    expect(DS_BOT_SELECTORS.markdownBody).not.toBe(DSH_SELECTORS.markdownBody)
  })
})
