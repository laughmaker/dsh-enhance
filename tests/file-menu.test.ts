/**
 * Unit tests for the pure helpers behind the file right-click menu.
 *
 * The DOM gesture itself needs a browser; these helpers are deliberately free
 * of DOM globals so the path and placement rules can be checked in Node.
 */
import { describe, expect, it } from 'vitest'
import {
  isAbsolutePath,
  normalizeMentionPath,
  placeMenu,
  resolvePath,
} from '../src/client/file-menu.ts'

describe('normalizeMentionPath', () => {
  it('keeps a plain absolute path verbatim', () => {
    expect(normalizeMentionPath('/Users/hzd/notes/宠物定位技术路线.md'))
      .toBe('/Users/hzd/notes/宠物定位技术路线.md')
  })

  it('decodes a file URL into a path', () => {
    expect(normalizeMentionPath('file:///Users/hzd/a%20b.txt')).toBe('/Users/hzd/a b.txt')
  })

  it('strips single and ranged line anchors', () => {
    expect(normalizeMentionPath('/a/b.ts#L12')).toBe('/a/b.ts')
    expect(normalizeMentionPath('/a/b.ts#L12-L20')).toBe('/a/b.ts')
  })

  it('rejects empty and control-ridden titles', () => {
    expect(normalizeMentionPath('   ')).toBeUndefined()
    expect(normalizeMentionPath('/a/b\u0000c')).toBeUndefined()
  })
})

describe('isAbsolutePath', () => {
  it('recognises POSIX, tilde and Windows drive paths', () => {
    expect(isAbsolutePath('/Users/hzd/a.md')).toBe(true)
    expect(isAbsolutePath('~/a.md')).toBe(true)
    expect(isAbsolutePath('~')).toBe(true)
    expect(isAbsolutePath('C:\\Users\\a.md')).toBe(true)
  })

  it('leaves relative mentions alone', () => {
    expect(isAbsolutePath('a.md')).toBe(false)
    expect(isAbsolutePath('./docs/a.md')).toBe(false)
  })
})

describe('resolvePath', () => {
  it('passes an absolute path through', () => {
    expect(resolvePath('/a/b.md', '/elsewhere')).toBe('/a/b.md')
  })

  it('joins a relative mention onto the session cwd', () => {
    expect(resolvePath('docs/a.md', '/Users/hzd/project/')).toBe('/Users/hzd/project/docs/a.md')
    expect(resolvePath('./docs\\a.md', '/Users/hzd/project')).toBe('/Users/hzd/project/docs/a.md')
  })

  it('cannot resolve a relative mention without a cwd', () => {
    expect(resolvePath('a.md', undefined)).toBeUndefined()
  })
})

describe('placeMenu', () => {
  it('uses the pointer position when there is room', () => {
    expect(placeMenu(120, 90, 248, 268, { width: 1440, height: 900 })).toEqual({ left: 120, top: 90 })
  })

  it('clamps to the bottom-right margin', () => {
    expect(placeMenu(1400, 880, 248, 268, { width: 1440, height: 900 }))
      .toEqual({ left: 1184, top: 624 })
  })

  it('keeps an 8px margin at the top-left', () => {
    expect(placeMenu(-20, -30, 248, 268, { width: 1440, height: 900 })).toEqual({ left: 8, top: 8 })
  })
})
