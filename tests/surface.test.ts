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
import { badgePolicyFor, completionUnreadIds, unreadSidebarRows } from '../src/client/badge-policy.ts'
import { DSH_SELECTORS, DS_BOT_SELECTORS, selectorsFor } from '../src/client/selectors.ts'
import { css as dsBotMarkdownAnchors } from '../src/client/surfaces/ds-bot/markdown-anchors.ts'
import { css as dsBotChrome } from '../src/client/surfaces/ds-bot/chrome.ts'
import { DETAILS_MIN, LEFT_MIN } from '../src/client/surfaces/ds-bot/panel-widths.ts'
import {
  BACKDROP_VAR,
  BACKDROP_VALUE,
  FILTER_ID,
  FILTER_VAR,
  FILTER_VALUE,
  GLASS_DISTORTION,
  GLASS_SOFTEN,
  MODE_ATTR,
  installLiquidGlass,
} from '../src/client/surfaces/ds-bot/liquid-glass.ts'

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
    expect(dsBotChrome).toContain('top: 12px !important')
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
    expect(dsBotChrome).toContain('color-mix(in srgb, var(--bt-hover) 60%, transparent) !important')
  })

  it('draws the rail + button as the same disc as the account and plugins buttons', () => {
    expect(dsBotChrome).toContain('.bt-leftcol-foot-rail .bt-round')
    expect(dsBotChrome).toContain('width: 36px !important')
    expect(dsBotChrome).toContain('height: 36px !important')
    expect(dsBotChrome).toContain('border-radius: 50% !important')
    expect(dsBotChrome).toContain('box-shadow: inset 0 0 0 1px rgba(242, 242, 242, .08) !important')
    expect(dsBotChrome).toContain('.bt-leftcol-foot-rail .bt-round:hover')
  })

  it('builds the pill as one clipped capsule of stacked glass layers', () => {
    // Reference layering: the pill itself is transparent, ::before refracts the
    // backdrop, ::after tints it and draws the lip.
    expect(dsBotChrome).toContain('header[class*="_header"]:has(.bt-head) .bt-pill {')
    expect(dsBotChrome).toContain('background: transparent !important')
    expect(dsBotChrome).toContain('overflow: hidden !important')
    expect(dsBotChrome).toContain('backdrop-filter: none !important')
    // The refraction lives on the effect layer, with a frosted fallback for
    // shells that cannot run the filter. The reference softens with blur(3px)
    // and bends on the same element.
    expect(dsBotChrome).toContain('backdrop-filter: var(--dsh-lg-backdrop, blur(3px)) !important')
    // The bend rides the plain filter property; Chromium drops a url() from
    // backdrop-filter, which is why the previous round stayed flat.
    expect(dsBotChrome).toContain('filter: var(--dsh-lg-filter, none) !important')
    expect(dsBotChrome).not.toContain('backdrop-filter: var(--dsh-lg-backdrop, url(')
    expect(dsBotChrome).toContain('.bt-pill::before')
    expect(dsBotChrome).toContain('isolation: isolate !important')
    // The lip is the reference's pair of inset shines, not a single top line.
    expect(dsBotChrome).toContain('.bt-pill::after')
    expect(dsBotChrome).toContain('background: var(--dsh-lg-tint) !important')
    expect(dsBotChrome).toContain('inset .5px .5px .75px 0 rgba(255, 255, 255, .45)')
    expect(dsBotChrome).toContain('inset -.5px -.5px .75px 0 rgba(255, 255, 255, .28)')
    // Every layer keeps the host's capsule radius, and the glass never eats a
    // click or shifts the pill geometry.
    expect(dsBotChrome).toContain('border-radius: inherit !important')
    expect(dsBotChrome).toContain('pointer-events: none !important')
    expect(dsBotChrome).toContain('height: 50px !important')
    expect(dsBotChrome).toContain('padding: 12.5px 18.5px 12.5px 12.5px !important')
    expect(dsBotChrome).toContain('border-radius: 9999px !important')
    // Theme corner-shape can make even a huge radius a squircle. Own all three
    // silhouettes so desktop theme overrides cannot square off the end caps.
    expect(dsBotChrome.match(/corner-shape: round !important/g)).toHaveLength(3)
    // The reference has no border: the outline is the shine layer alone. A
    // hairline border is what made the pill read as a rounded rectangle.
    expect(dsBotChrome).toContain('border: none !important')
    expect(dsBotChrome).not.toContain('border: 1px solid')
    expect(dsBotChrome).not.toContain('border-color: rgba(255, 255, 255, .16) !important')
    expect(dsBotChrome).not.toContain('0 0 0 .5px rgba(20, 20, 20, .10)')
    // The rejected v1 look leaned on a heavy blur and a heavy drop shadow.
    expect(dsBotChrome).not.toContain('blur(24px) saturate(200%)')
    expect(dsBotChrome).not.toContain('0 10px 30px -8px rgba(0, 0, 0, .35)')
    // And the round before it covered the backdrop with a near-solid fill.
    expect(dsBotChrome).not.toContain('var(--bt-glass-bg) 58%, transparent')
    expect(dsBotChrome).not.toContain('mix-blend-mode: screen')
  })

  it('keeps the tint see-through, lighter on dark, and lifts it on hover', () => {
    // The reference's flat white film is 25%; dark swaps it for a lighter one
    // so the pill does not turn into a grey card.
    expect(dsBotChrome).toContain('--dsh-lg-tint: rgba(255, 255, 255, .25)')
    expect(dsBotChrome).toContain('--dsh-lg-tint: rgba(255, 255, 255, .08)')
    expect(dsBotChrome).toContain('--dsh-lg-tint: rgba(255, 255, 255, .32)')
    expect(dsBotChrome).toContain('--dsh-lg-tint: rgba(255, 255, 255, .12)')
  })

  it('turns edge refraction on for the DS Bot pill only', () => {
    expect(featuresFor('ds-bot').liquidGlass).toBe(true)
    expect(featuresFor('dsh').liquidGlass).toBe(false)
    expect(FILTER_ID).toBe('dsh-lg-pill')
    expect(BACKDROP_VAR).toBe('--dsh-lg-backdrop')
    expect(MODE_ATTR).toBe('data-dsh-lg')
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

  it('settles both count rules', () => {
    expect(badgePolicyFor('ds-bot').pending).toBe(false)
    expect(badgePolicyFor('dsh').pending).toBe(false)
    expect(badgePolicyFor('ds-bot').note).toContain('green dot')
  })

  it('counts the DS Bot rows that carry an unread dot', () => {
    const root = fakeSidebar([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(unreadSidebarRows(root)).toHaveLength(3)
    expect(badgePolicyFor('ds-bot', { root }).select({}, statusOf({}))).toEqual(['a', 'b', 'c'])
  })

  it('counts one row once even when it carries two marks', () => {
    const row = fakeRow('a')
    const root = fakeSidebar([{ id: 'a', row }, { id: 'a', row }])
    expect(unreadSidebarRows(root)).toHaveLength(1)
  })

  it('counts nothing when no row is marked or none is laid out', () => {
    expect(unreadSidebarRows(fakeSidebar([]))).toEqual([])
    const hidden = fakeSidebar([{ id: 'a', laidOut: false }])
    expect(unreadSidebarRows(hidden)).toEqual([])
  })

  it('falls back to zero without a document', () => {
    expect(unreadSidebarRows(null)).toEqual([])
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

/** A sidebar row stand-in. */
function fakeRow(id: string) {
  return { getAttribute: (name: string) => (name === 'data-bot-id' ? id : null) }
}

/**
 * A sidebar stand-in: `dotCount` marks per entry, each attached to its row.
 * @param entries - one per dot; `row` repeats an existing row.
 */
function fakeSidebar(entries: Array<{ id: string, row?: ReturnType<typeof fakeRow>, laidOut?: boolean }>) {
  const dots = entries.map((entry) => ({
    closest: () => entry.row ?? fakeRow(entry.id),
    getClientRects: () => (entry.laidOut === false ? [] : [{}]),
  }))
  return { querySelectorAll: () => dots }
}

/** A status view over a plain record. */
function statusOf(record: Record<string, { completionUnread?: boolean }>) {
  return { get: (id: string) => record[id] }
}


describe('liquid glass refraction', () => {
  /** A fake element that records what the module builds. */
  function fakeNode() {
    const attributes = new Map<string, string>()
    const children: Array<ReturnType<typeof fakeNode>> = []
    return {
      style: { cssText: '' },
      attributes,
      children,
      setAttribute: (name: string, value: string) => { attributes.set(name, value) },
      setAttributeNS: (_ns: string, name: string, value: string) => { attributes.set(name, value) },
      append: (...nodes: Array<ReturnType<typeof fakeNode>>) => { children.push(...nodes) },
      appendChild: (node: ReturnType<typeof fakeNode>) => { children.push(node) },
      remove: () => {},
    }
  }

  function fakeRoot(supported = true) {
    const values = new Map<string, string>()
    const attributes = new Map<string, string>()
    const appended: Array<ReturnType<typeof fakeNode>> = []
    const created: Array<ReturnType<typeof fakeNode>> = []
    const root = {
      defaultView: { CSS: { supports: () => supported } },
      body: { appendChild: (node: ReturnType<typeof fakeNode>) => { appended.push(node) } },
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => { values.set(name, value) },
          getPropertyValue: (name: string) => values.get(name) ?? '',
          removeProperty: (name: string) => { values.delete(name) },
        },
        setAttribute: (name: string, value: string) => { attributes.set(name, value) },
        removeAttribute: (name: string) => { attributes.delete(name) },
      },
      getElementById: () => null,
      querySelector: () => null,
      createElementNS: (_ns: string, tag: string) => {
        const node = fakeNode()
        node.attributes.set('tag', tag)
        created.push(node)
        return node
      },
    } as unknown as Document
    return { root, values, attributes, appended, created }
  }

  it('builds the reference turbulence chain that bends the backdrop', () => {
    const { root, created, appended } = fakeRoot()
    installLiquidGlass(root)
    expect(appended).toHaveLength(1)
    const [svg] = appended
    expect(svg.attributes.get('data-plugin')).toBe('ds-bot-enhance-liquid-glass')
    const [filter] = svg.children
    expect(filter.attributes.get('id')).toBe(FILTER_ID)
    // The region follows the element's box, as in the reference.
    expect(filter.attributes.get('filterUnits')).toBe('objectBoundingBox')
    expect(filter.attributes.get('x')).toBe('0%')
    expect(filter.attributes.get('width')).toBe('100%')

    // The chain, in the reference's order:
    // turbulence -> componentTransfer -> gaussianBlur -> specularLighting
    // -> composite -> displacementMap.
    const kinds = filter.children.map((n) => n.attributes.get('tag'))
    expect(kinds).toEqual([
      'feTurbulence',
      'feComponentTransfer',
      'feGaussianBlur',
      'feSpecularLighting',
      'feComposite',
      'feDisplacementMap',
    ])

    const turbulence = filter.children[0]
    expect(turbulence.attributes.get('type')).toBe('fractalNoise')
    expect(turbulence.attributes.get('baseFrequency')).toBe('0.001 0.005')
    expect(turbulence.attributes.get('numOctaves')).toBe('1')
    expect(turbulence.attributes.get('seed')).toBe('17')
    expect(turbulence.attributes.get('result')).toBe('turbulence')

    const transfer = filter.children[1]
    expect(transfer.attributes.get('in')).toBe('turbulence')
    expect(transfer.attributes.get('result')).toBe('mapped')
    const funcs = transfer.children.map((n) => n.attributes.get('tag'))
    expect(funcs).toEqual(['feFuncR', 'feFuncG', 'feFuncB'])
    expect(transfer.children[0].attributes.get('tag')).toBe('feFuncR')
    expect(transfer.children[0].attributes.get('exponent')).toBe('10')
    expect(transfer.children[0].attributes.get('offset')).toBe('0.5')
    expect(transfer.children[1].attributes.get('amplitude')).toBe('0')
    expect(transfer.children[2].attributes.get('offset')).toBe('0.5')

    const blur = filter.children[2]
    expect(blur.attributes.get('in')).toBe('turbulence')
    expect(blur.attributes.get('stdDeviation')).toBe('3')
    expect(blur.attributes.get('result')).toBe('softMap')

    const specular = filter.children[3]
    expect(specular.attributes.get('in')).toBe('softMap')
    expect(specular.attributes.get('surfaceScale')).toBe('5')
    expect(specular.attributes.get('specularConstant')).toBe('1')
    expect(specular.attributes.get('specularExponent')).toBe('100')
    expect(specular.attributes.get('lighting-color')).toBe('white')
    expect(specular.children[0].attributes.get('tag')).toBe('fePointLight')

    const composite = filter.children[4]
    expect(composite.attributes.get('operator')).toBe('arithmetic')
    expect(composite.attributes.get('k2')).toBe('1')
    expect(composite.attributes.get('k3')).toBe('1')
    expect(composite.attributes.get('result')).toBe('litImage')

    const bend = filter.children[5]
    expect(bend.attributes.get('in')).toBe('SourceGraphic')
    expect(bend.attributes.get('in2')).toBe('softMap')
    // Preserve the reference's visible distortion rather than weakening it.
    expect(bend.attributes.get('scale')).toBe('200')
    expect(bend.attributes.get('xChannelSelector')).toBe('R')
    expect(bend.attributes.get('yChannelSelector')).toBe('G')

    // svg + filter + the six primitives and their children is the whole build.
    expect(created.length).toBeGreaterThanOrEqual(11)
  })

  it('keeps the reference softening pass and distortion numbers', () => {
    // Keep the reference's blur and displacement together, unchanged.
    expect(GLASS_SOFTEN.blur).toBe(3)
    expect(BACKDROP_VALUE).toBe('blur(3px)')
    expect(GLASS_DISTORTION.baseFrequencyX).toBe(0.001)
    expect(GLASS_DISTORTION.baseFrequencyY).toBe(0.005)
    expect(GLASS_DISTORTION.numOctaves).toBe(1)
    expect(GLASS_DISTORTION.seed).toBe(17)
    expect(GLASS_DISTORTION.stdDeviation).toBe(3)
    expect(GLASS_DISTORTION.scale).toBe(200)
  })

  it('publishes the filter as CSS variables and takes them back on dispose', () => {
    const { root, values, attributes } = fakeRoot()
    const dispose = installLiquidGlass(root)
    // The softening pass carries no url(): Chromium ignores a backdrop-filter
    // that references an SVG filter, which is why the earlier round was flat.
    expect(values.get(BACKDROP_VAR)).toBe(BACKDROP_VALUE)
    expect(values.get(BACKDROP_VAR)).not.toContain('url(')
    expect(values.get(BACKDROP_VAR)).toContain('blur(3px)')
    // The displacement is published separately, on the filter property.
    expect(values.get(FILTER_VAR)).toBe(FILTER_VALUE)
    expect(values.get(FILTER_VAR)).toContain(`url(#${FILTER_ID})`)
    expect(attributes.get(MODE_ATTR)).toBe('refract')
    dispose()
    expect(values.has(BACKDROP_VAR)).toBe(false)
    expect(values.has(FILTER_VAR)).toBe(false)
    expect(attributes.has(MODE_ATTR)).toBe(false)
  })

  it('replaces its own node instead of stacking a second one', () => {
    const { root, appended } = fakeRoot()
    let removed = 0
    const existing = { remove: () => { removed += 1 } }
    ;(root as unknown as { getElementById: () => typeof existing }).getElementById = () => existing
    installLiquidGlass(root)
    expect(removed).toBe(1)
    expect(appended).toHaveLength(1)
  })

  it('stays inert where the shell cannot refract', () => {
    const root = { defaultView: {}, body: {}, documentElement: {} } as unknown as Document
    const dispose = installLiquidGlass(root)
    expect(typeof dispose).toBe('function')
    expect(() => dispose()).not.toThrow()
  })
})
