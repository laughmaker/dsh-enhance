/**
 * Unit tests for the startup window geometry module.
 *
 * The module drives a structural `DesktopWindow` rather than the real `window`,
 * so these run in plain Node: no DOM is needed to check when the frame is
 * filled, which frame is persisted, and what a second launch restores.
 *
 * Run with this checkout's vitest binary:
 *   node_modules/.bin/vitest run tests/window-geometry.test.ts
 */
import { describe, expect, it, vi } from 'vitest'
import {
  clampToArea, currentFrame, isFilled, readSavedGeometry, STORAGE_KEY, workAreaOf,
  type DesktopWindow, type Frame, type GeometryStore,
} from '../src/client/window-geometry.ts'

/** Work area of the machine these were written on: 1470x956 display, menu bar and Dock. */
const AREA = { left: 46, top: 33, width: 1424, height: 923 }

describe('clampToArea', () => {
  it('keeps a frame that already fits', () => {
    expect(clampToArea({ x: 200, y: 120, width: 1000, height: 700 }, AREA))
      .toEqual({ x: 200, y: 120, width: 1000, height: 700 })
  })
  it('shrinks a frame wider than the display', () => {
    const frame = clampToArea({ x: 0, y: 0, width: 3000, height: 2000 }, AREA)
    expect(frame.width).toBe(AREA.width)
    expect(frame.height).toBe(AREA.height)
  })
  it('pulls a frame back from a display that is gone', () => {
    const frame = clampToArea({ x: 4000, y: 2500, width: 1000, height: 700 }, AREA)
    expect(frame.x).toBeGreaterThanOrEqual(AREA.left)
    expect(frame.x).toBeLessThanOrEqual(AREA.left + AREA.width)
    expect(frame.y).toBeGreaterThanOrEqual(AREA.top)
    expect(frame.y).toBeLessThanOrEqual(AREA.top + AREA.height)
  })
  it('leaves a sliver of the title bar reachable on the left', () => {
    const frame = clampToArea({ x: -900, y: 100, width: 1000, height: 700 }, AREA)
    expect(frame.x).toBeGreaterThan(-frame.width)
  })
})

describe('isFilled', () => {
  it('accepts the work area', () => {
    expect(isFilled({ x: 46, y: 33, width: 1424, height: 923 }, AREA)).toBe(true)
  })
  it('tolerates the one-pixel rounding a maximized window reports', () => {
    expect(isFilled({ x: 46, y: 33, width: 1420, height: 923 }, AREA)).toBe(true)
  })
  it('rejects any smaller window', () => {
    expect(isFilled({ x: 100, y: 60, width: 1280, height: 820 }, AREA)).toBe(false)
  })
})

describe('readSavedGeometry', () => {
  it('parses a saved record', () => {
    expect(readSavedGeometry(JSON.stringify({ normal: { x: 1, y: 2, width: 3, height: 4 }, maximized: false })))
      .toEqual({ normal: { x: 1, y: 2, width: 3, height: 4 }, maximized: false })
  })
  it('treats a missing record as a first launch', () => {
    expect(readSavedGeometry(null)).toBeUndefined()
    expect(readSavedGeometry('')).toBeUndefined()
  })
  it('rejects malformed JSON and impossible frames', () => {
    expect(readSavedGeometry('{')).toBeUndefined()
    expect(readSavedGeometry('[]')).toBeUndefined()
    expect(readSavedGeometry(JSON.stringify({ normal: { x: 0, y: 0, width: 0, height: 700 } }))).toBeUndefined()
    expect(readSavedGeometry(JSON.stringify({ normal: { x: 0, y: 0, width: 1000 } }))).toBeUndefined()
  })
  it('defaults the maximized flag to false', () => {
    const record = readSavedGeometry(JSON.stringify({ normal: { x: 0, y: 0, width: 1000, height: 700 } }))
    expect(record?.maximized).toBe(false)
  })
})

/** A window double: settable frame, recorded calls, no DOM. */
interface Double {
  win: DesktopWindow
  frame: Frame
  calls: { resize: Array<[number, number]>, move: Array<[number, number]> }
  emit(type: string): void
  hidden: boolean
}

/**
 * Build the double.
 * @param frame - the frame the window starts at.
 * @param area - the work area it reports.
 * @returns the double.
 */
function double(frame: Frame, area = AREA): Double {
  const listeners = new Map<string, Set<(event: Event) => void>>()
  const state: Double = {
    frame: { ...frame },
    calls: { resize: [], move: [] },
    hidden: false,
    win: undefined as unknown as DesktopWindow,
    emit(type) {
      for (const listener of listeners.get(type) ?? []) listener(new Event(type))
    },
  }
  state.win = {
    get screen() {
      return {
        availLeft: area.left,
        availTop: area.top,
        availWidth: area.width,
        availHeight: area.height,
      }
    },
    get document() {
      return { visibilityState: state.hidden ? 'hidden' : 'visible' }
    },
    get outerWidth() { return state.frame.width },
    get outerHeight() { return state.frame.height },
    get screenX() { return state.frame.x },
    get screenY() { return state.frame.y },
    resizeTo(width, height) {
      state.calls.resize.push([width, height])
      state.frame = { ...state.frame, width, height }
    },
    moveTo(x, y) {
      state.calls.move.push([x, y])
      state.frame = { ...state.frame, x, y }
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
  }
  return state
}

/** In-memory storage double. */
function store(initial: Record<string, string> = {}): GeometryStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => { data[key] = value },
  }
}

describe('workAreaOf and currentFrame', () => {
  it('reads the work area in the platform naming', () => {
    expect(workAreaOf(double({ x: 0, y: 0, width: 800, height: 600 }).win)).toEqual(AREA)
  })
  it('reads the live frame', () => {
    const harness = double({ x: 12, y: 34, width: 900, height: 700 })
    expect(currentFrame(harness.win)).toEqual({ x: 12, y: 34, width: 900, height: 700 })
  })
})

describe('installStartupGeometry', () => {
  it('fills the work area on a first launch and records it as maximized', async () => {
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const harness = double({ x: 95, y: 33, width: 1280, height: 820 })
    const storage = store()
    const dispose = installStartupGeometry(harness.win, storage)
    expect(harness.calls.resize).toEqual([[AREA.width, AREA.height]])
    // Resize precedes move: the platform clamps a move against the new size.
    expect(harness.calls.move).toEqual([[AREA.left, AREA.top]])
    await new Promise((resolve) => setTimeout(resolve, 700))
    dispose()
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({
      normal: { x: 95, y: 33, width: 1280, height: 820 },
      maximized: true,
    })
  })

  it('restores the saved frame instead of filling', async () => {
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const saved = { normal: { x: 200, y: 120, width: 1000, height: 700 }, maximized: false }
    const storage = store({ [STORAGE_KEY]: JSON.stringify(saved) })
    const harness = double({ x: 95, y: 33, width: 1280, height: 820 })
    const dispose = installStartupGeometry(harness.win, storage)
    expect(harness.calls.resize).toEqual([[1000, 700]])
    expect(harness.calls.move).toEqual([[200, 120]])
    dispose()
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual(saved)
  })

  it('re-fills when the last session ended maximized', async () => {
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const saved = { normal: { x: 200, y: 120, width: 1000, height: 700 }, maximized: true }
    const storage = store({ [STORAGE_KEY]: JSON.stringify(saved) })
    const harness = double({ x: 95, y: 33, width: 1280, height: 820 })
    const dispose = installStartupGeometry(harness.win, storage)
    expect(harness.calls.resize).toEqual([[AREA.width, AREA.height]])
    dispose()
  })

  it('persists the frame after a user resize settles', async () => {
    vi.useFakeTimers()
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const storage = store({ [STORAGE_KEY]: JSON.stringify({ normal: { x: 46, y: 33, width: 1424, height: 923 }, maximized: true }) })
    const harness = double({ x: 46, y: 33, width: 1424, height: 923 })
    const dispose = installStartupGeometry(harness.win, storage)
    vi.advanceTimersByTime(700)
    harness.frame = { x: 300, y: 200, width: 900, height: 700 }
    harness.emit('resize')
    vi.advanceTimersByTime(500)
    dispose()
    vi.useRealTimers()
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({
      normal: { x: 300, y: 200, width: 900, height: 700 },
      maximized: false,
    })
  })

  it('keeps the last unmaximized frame when the window is maximized again', async () => {
    vi.useFakeTimers()
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const storage = store({ [STORAGE_KEY]: JSON.stringify({ normal: { x: 300, y: 200, width: 900, height: 700 }, maximized: false }) })
    const harness = double({ x: 300, y: 200, width: 900, height: 700 })
    const dispose = installStartupGeometry(harness.win, storage)
    vi.advanceTimersByTime(700)
    harness.frame = { x: AREA.left, y: AREA.top, width: AREA.width, height: AREA.height }
    harness.emit('resize')
    vi.advanceTimersByTime(500)
    dispose()
    vi.useRealTimers()
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({
      normal: { x: 300, y: 200, width: 900, height: 700 },
      maximized: true,
    })
  })

  it('saves when the page becomes hidden, which is what closing does', async () => {
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const storage = store({ [STORAGE_KEY]: JSON.stringify({ normal: { x: 46, y: 33, width: 1424, height: 923 }, maximized: true }) })
    const harness = double({ x: 46, y: 33, width: 1424, height: 923 })
    const dispose = installStartupGeometry(harness.win, storage)
    await new Promise((resolve) => setTimeout(resolve, 700))
    harness.frame = { x: 260, y: 180, width: 1010, height: 740 }
    harness.hidden = true
    harness.emit('visibilitychange')
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({
      normal: { x: 260, y: 180, width: 1010, height: 740 },
      maximized: false,
    })
    dispose()
  })

  it('stays inert when storage is blocked and the area is unusable', async () => {
    const { installStartupGeometry } = await import('../src/client/window-geometry.ts')
    const harness = double({ x: 0, y: 0, width: 800, height: 600 }, { left: 0, top: 0, width: 0, height: 0 })
    const dispose = installStartupGeometry(harness.win, store())
    expect(harness.calls.resize).toEqual([])
    dispose()
  })
})
