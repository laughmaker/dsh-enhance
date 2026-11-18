/**
 * Guards on the auto-loader for DS Bot's earlier messages.
 *
 * The geometry cannot be measured in jsdom, so the module is driven through
 * a small transcript built by hand. The reading position is this module's own
 * work: these guards cover that this module asks for the page, shows the
 * indicator, and gives the growth of the older page back to the scroller, so
 * the row the reader was reading stays where it was.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LOADING_ATTR,
  SPINNER_CLASS,
  TOP_THRESHOLD,
  css,
  installAutoLoadEarlier,
} from '../src/client/surfaces/ds-bot/auto-load-earlier.ts'

/**
 * A small transcript that answers to the host's selectors.
 *
 * The rows are laid out the way the host lays them out: their place follows
 * the scroller's scroll, and a page spliced in above them moves them up.
 * The first row carries the host's paging mark, the way the host marks the
 * row it can hold the list by.
 */
interface Transcript {
  column: HTMLElement
  wrap: HTMLElement
  button: HTMLButtonElement
  slot: HTMLElement
  scroller: HTMLElement
  /** Push a block of content in above the rows, as the host does on load. */
  splice: (height: number) => void
  /** Where the first row sits in the viewport, right now. */
  firstRowTop: () => number
  /** Where the load row sits in the viewport, right now. */
  loadRowTop: () => number
}

function transcript(): Transcript {
  document.body.innerHTML = ''
  const scroller = document.createElement('div')
  scroller.setAttribute('data-conversation-scroll', '')
  const column = document.createElement('div')
  column.setAttribute('data-chat-flow', '')
  const wrap = document.createElement('div')
  const button = document.createElement('button')
  button.type = 'button'
  wrap.appendChild(button)
  const slot = document.createElement('div')
  slot.setAttribute('data-slot', 'conversation.chat.flow')
  const ROW_HEIGHT = 40
  const BASE = 100
  let spliced = 0
  const lines: HTMLElement[] = []
  for (let i = 0; i < 3; i += 1) {
    const line = document.createElement('div')
    line.setAttribute('data-chat-flow-key', `k${i}`)
    line.setAttribute('data-chat-anchor-key', `k${i}`)
    // The host marks the row it can hold the list by; the first such row is
    // the one it retains when an older page is asked for.
    if (i === 0) line.setAttribute('data-chat-paging-anchor', '')
    line.textContent = `line ${i}`
    line.getBoundingClientRect = () => {
      const top = BASE + Number(line.dataset.index ?? 0) * ROW_HEIGHT + spliced - scroller.scrollTop
      return { top, bottom: top + ROW_HEIGHT, height: ROW_HEIGHT } as DOMRect
    }
    line.dataset.index = String(i)
    lines.push(line)
    slot.appendChild(line)
  }
  column.append(wrap, slot)
  scroller.appendChild(column)
  document.body.appendChild(scroller)
  Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true, configurable: true })
  scroller.getBoundingClientRect = () => ({ top: 0, bottom: 900, height: 900 }) as DOMRect
  column.getBoundingClientRect = () => ({ left: 400, top: 0, width: 960, height: 900 }) as DOMRect
  // The load row sits at the very top of the list, above the transcript.
  wrap.getBoundingClientRect = () => {
    const top = BASE + spliced - scroller.scrollTop - 40
    return { top, bottom: top + 24, height: 24 } as DOMRect
  }
  return {
    column,
    wrap,
    button,
    slot,
    scroller,
    splice: (height: number) => {
      // The host's splice brings the rows with it, and the row count grows.
      spliced += height
      slot.insertBefore(document.createElement('div'), slot.firstChild)
    },
    firstRowTop: () => lines[0]?.getBoundingClientRect().top ?? 0,
    loadRowTop: () => wrap.getBoundingClientRect().top,
  }
}

/** Let the module read the current transcript. */
const t = (key: string): string => key

/**
 * Take over the frame loop and the clock, so the module's ticks can be driven
 * by hand and its timeouts can be reached.
 */
function frames(): { run: (ms?: number) => void, restore: () => void } {
  const queued: FrameRequestCallback[] = []
  const raf = window.requestAnimationFrame
  const caf = window.cancelAnimationFrame
  const now = performance.now()
  const clock = vi.spyOn(performance, 'now')
  clock.mockImplementation(() => now)
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    queued.push(callback)
    return queued.length
  }) as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame
  return {
    run: (ms = 0) => {
      clock.mockImplementation(() => now + ms)
      const pending = queued.splice(0, queued.length)
      for (const callback of pending) callback(now + ms)
    },
    restore: () => {
      window.requestAnimationFrame = raf
      window.cancelAnimationFrame = caf
      clock.mockRestore()
    },
  }
}

/** The sheet this module injects to take the browser's anchoring off. */
const anchorSheet = (): HTMLStyleElement | null =>
  document.head.querySelector('style[data-plugin-css="ds-bot-enhance/ds-bot-older-anchoring"]')

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('style[data-plugin="ds-bot-enhance"]').forEach((tag) => { tag.remove() })
})

describe('installAutoLoadEarlier', () => {
  it('clicks the host button when the reader wheels up at the top and shows the indicator', () => {
    const { button, slot, wrap } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(clicks).toBe(1)
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(true)
      // The indicator is painted on the body, not inside the host's column:
      // the older page arrives above the reader and would carry it off screen.
      expect(document.body.querySelector(`.${SPINNER_CLASS}`)).not.toBeNull()
      expect(document.querySelector(`.${SPINNER_CLASS}`)).not.toBeNull()
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('keeps the row the reader was reading where it was when the older page lands', () => {
    const { button, slot, scroller, splice, firstRowTop } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(clicks).toBe(1)
      const before = firstRowTop()
      // The host splices a page of older messages in above the reader.
      splice(1800)
      loop.run()
      // The row the reader was reading keeps its place in the viewport: the
      // growth of the page is given back to the scroller, which moves the
      // content up by exactly what was added above the row.
      expect(scroller.scrollTop).toBe(1800)
      expect(firstRowTop()).toBe(before)
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('leaves the reader’s own scrolling alone while the page is on its way', () => {
    const { button, slot, scroller, splice, firstRowTop } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      const before = firstRowTop()
      splice(1800)
      // The reader scrolls on their own while the older page is coming. Their
      // own movement is theirs: the row's place in the content does not move
      // with it, so the correction of the growth leaves their scroll alone.
      scroller.scrollTop = 300
      loop.run()
      // The scroller carries the reader's own scroll and the growth of the
      // page; the row stays where the reader had scrolled it to.
      expect(scroller.scrollTop).toBe(2100)
      expect(firstRowTop()).toBe(before - 300)
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('writes the correction of the growth once, and leaves it there when the page settles', () => {
    const { button, slot, scroller, splice } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      splice(1800)
      loop.run()
      expect(scroller.scrollTop).toBe(1800)
      // The page is in and the list is settled: no further correction is
      // asked for, and none is written.
      loop.run(100)
      loop.run(700)
      expect(scroller.scrollTop).toBe(1800)
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('does not ask for a page when there is no row to hold the reader’s place by', () => {
    const { button, slot, wrap } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    // The host gives no row a key: there is nothing to keep the reader's
    // place by, and a load that moves the reader away from what they were
    // reading is worse than no load at all.
    for (const row of document.querySelectorAll('[data-chat-anchor-key]')) {
      row.removeAttribute('data-chat-anchor-key')
    }
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(clicks).toBe(0)
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(false)
      expect(document.body.querySelector(`.${SPINNER_CLASS}`)).toBeNull()
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('gives the host button back when the load does not change the transcript', () => {
    const { button, slot, wrap } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(true)
      // The host never showed a loading state and nothing arrived: after the
      // grace period the frame that finds nothing changed ends the load, so
      // the reader can try again by hand.
      loop.run(1600)
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(false)
      expect(document.body.querySelector(`.${SPINNER_CLASS}`)).toBeNull()
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('leaves the host’s column unmarked', () => {
    const { button, slot, column } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      // The host's own row is left the way the host made it: this module
      // keeps its bearing in its own bookkeeping, not on the host's column.
      const marks = column.getAttributeNames().filter((name) => name.startsWith('data-dsh-enhance'))
      expect(marks).toEqual([])
      loop.run(1600)
      expect(column.getAttributeNames().filter((name) => name.startsWith('data-dsh-enhance'))).toEqual([])
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('takes the browser’s own anchoring off only while the page is on its way', () => {
    const { button, slot } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      // The browser would add the height of the older page to the scroller
      // itself, in the same frame as the correction this module makes: only
      // one of the two may be at work.
      expect(anchorSheet()?.textContent).toContain('overflow-anchor: none')
      loop.run(1600)
      expect(anchorSheet()).toBeNull()
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('keeps the indicator up until the transcript has settled', () => {
    const { button, slot, splice, wrap } = transcript()
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      splice(1800)
      loop.run(100)
      // The page landed, but it has not settled yet.
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(true)
      loop.run(700)
      expect(wrap.hasAttribute(LOADING_ATTR)).toBe(false)
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('asks for one page per gesture, not one per wheel event', () => {
    const { button, slot } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    const loop = frames()
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      // More wheel events inside the same sweep: the history is not pulled in
      // one go.
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(clicks).toBe(1)
    } finally {
      dispose()
      loop.restore()
    }
  })

  it('stays put while the reader is scrolled away from the top', () => {
    const { scroller, button, slot } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    Object.defineProperty(scroller, 'scrollTop', { value: TOP_THRESHOLD + 300, writable: true, configurable: true })
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    try {
      slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
      expect(clicks).toBe(0)
    } finally {
      dispose()
    }
  })

  it('takes its listeners back on dispose', () => {
    const { button, slot } = transcript()
    let clicks = 0
    button.addEventListener('click', () => { clicks += 1 })
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    dispose()
    slot.firstElementChild?.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }))
    expect(clicks).toBe(0)
  })

  it('does nothing when there is no transcript on the page', () => {
    document.body.innerHTML = ''
    const dispose = installAutoLoadEarlier({} as never, document, t as never)
    expect(() => {
      document.dispatchEvent(new WheelEvent('wheel', { deltaY: -120 }))
      dispose()
    }).not.toThrow()
  })
})

describe('auto-loader stylesheet', () => {
  it('hides the host button while the indicator is up', () => {
    expect(css).toContain(`[${LOADING_ATTR}] button`)
    expect(css).toContain('visibility: hidden !important')
  })

  it('paints the indicator out of the host row’s flow', () => {
    expect(css).toContain(`.${SPINNER_CLASS}`)
    expect(css).toContain('position: fixed !important')
    expect(css).toContain('pointer-events: none !important')
    expect(css).toContain('.dsh-enhance-older-ring')
    expect(css).toContain('@keyframes dsh-enhance-older-spin')
  })

  it('slows the ring down when motion is reduced', () => {
    expect(css).toContain('prefers-reduced-motion')
  })

  it('keeps the browser anchoring out of the sheet that is mounted for the session', () => {
    // The browser's anchoring is switched off at runtime, and only while the
    // older page is on its way. A sheet that is mounted for the whole session
    // would switch it off for the whole session as well, and the host's own
    // paging would lose it.
    expect(css).not.toContain('overflow-anchor')
  })
})
