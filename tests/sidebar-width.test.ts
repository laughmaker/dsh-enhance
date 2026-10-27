/**
 * Unit tests for the remembered sidebar width.
 *
 * Run with this checkout's vitest binary:
 *   node_modules/.bin/vitest run tests/sidebar-width.test.ts
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, readSidebarWidth, rememberSidebarWidth,
  STORAGE_KEY, startupSidebarWidth, type WidthStore,
} from '../src/client/sidebar-width.ts'

/** In-memory storage double. */
function store(initial: Record<string, string> = {}): WidthStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => { data[key] = value },
  }
}

describe('readSidebarWidth', () => {
  it('reads a width inside the contract range', () => {
    expect(readSidebarWidth('264')).toBe(264)
    expect(readSidebarWidth('420')).toBe(420)
  })
  it('rejects widths the layout cannot paint', () => {
    expect(readSidebarWidth('120')).toBeUndefined()
    expect(readSidebarWidth('900')).toBeUndefined()
    expect(readSidebarWidth('wide')).toBeUndefined()
    expect(readSidebarWidth('')).toBeUndefined()
    expect(readSidebarWidth(null)).toBeUndefined()
  })
  it('rounds a fractional width', () => {
    expect(readSidebarWidth('263.6')).toBe(264)
  })
})

describe('startupSidebarWidth', () => {
  it('opens at the narrowest width on a first run', () => {
    expect(startupSidebarWidth(store())).toBe(DEFAULT_WIDTH)
    expect(DEFAULT_WIDTH).toBe(MIN_WIDTH)
  })
  it('opens at the width the reader left', () => {
    expect(startupSidebarWidth(store({ [STORAGE_KEY]: '320' }))).toBe(320)
  })
  it('falls back to the default when the stored value is unusable', () => {
    expect(startupSidebarWidth(store({ [STORAGE_KEY]: '0' }))).toBe(DEFAULT_WIDTH)
  })
  it('falls back to the default when storage is blocked', () => {
    expect(startupSidebarWidth(null)).toBe(DEFAULT_WIDTH)
    const throwing: WidthStore = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }
    expect(startupSidebarWidth(throwing)).toBe(DEFAULT_WIDTH)
  })
  it('never opens wider than the layout contract allows', () => {
    expect(startupSidebarWidth(store({ [STORAGE_KEY]: String(MAX_WIDTH * 3) }))).toBe(DEFAULT_WIDTH)
  })
})

describe('rememberSidebarWidth', () => {
  it('stores the settled width', () => {
    const storage = store()
    rememberSidebarWidth(storage, 300)
    expect(storage.data[STORAGE_KEY]).toBe('300')
  })
  it('clamps to the range this plugin can paint', () => {
    const storage = store()
    rememberSidebarWidth(storage, 40)
    expect(storage.data[STORAGE_KEY]).toBe(String(MIN_WIDTH))
    rememberSidebarWidth(storage, 9999)
    expect(storage.data[STORAGE_KEY]).toBe(String(MAX_WIDTH))
  })
  it('survives storage that refuses writes', () => {
    const blocked: WidthStore = {
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
    }
    expect(() => rememberSidebarWidth(blocked, 300)).not.toThrow()
    expect(() => rememberSidebarWidth(null, 300)).not.toThrow()
  })
})
