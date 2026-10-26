/**
 * Unit tests for the pure selection helpers.
 *
 * Run with the DSH checkout's vitest binary:
 *   node_modules/.bin/vitest run plugins/dsh-enhance/tests
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_SELECTION_CHARS, MIN_SELECTION_CHARS, normalizeSelectionText, placeToolbar,
  promptForSideChat, quoteForDraft, quotedBlock,
} from '../src/client/selection.ts'
import {
  addAnnotation, annotationLine, annotationsOf, annotationsPrompt, clearAnnotations,
  annotationsVisibleIn, removeAnnotation, subscribeAnnotations, updateAnnotationNote,
} from '../src/client/annotations.ts'
import { mountBadges, rangesOf, removeBadges } from '../src/client/anchors.ts'

describe('normalizeSelectionText', () => {
  it('trims and collapses long blank runs but keeps single line breaks', () => {
    expect(normalizeSelectionText('\n\nalpha\n\nbeta\n\n\n\ngamma\n\n')).toBe('alpha\n\nbeta\n\ngamma')
  })
  it('normalizes CRLF', () => {
    expect(normalizeSelectionText('a\r\nb')).toBe('a\nb')
  })
  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeSelectionText(' \n\t ')).toBe('')
  })
  it('caps the carried text', () => {
    const long = 'x'.repeat(MAX_SELECTION_CHARS + 500)
    expect(normalizeSelectionText(long)).toHaveLength(MAX_SELECTION_CHARS)
  })
  it('keeps the shortest accepted selection intact', () => {
    expect(normalizeSelectionText(''.padStart(MIN_SELECTION_CHARS, 'a'))).toBe(''.padStart(MIN_SELECTION_CHARS, 'a'))
  })
})

describe('quotedBlock', () => {
  it('prefixes every line and keeps blank lines as a bare marker', () => {
    expect(quotedBlock('one\n\ntwo')).toBe('> one\n>\n> two')
  })
})

describe('quoteForDraft', () => {
  it('ends with one blank line so the caret lands under the quote', () => {
    expect(quoteForDraft('passage')).toBe('> passage\n\n')
  })
})

describe('promptForSideChat', () => {
  it('opens with a sentence describing the passage and quotes it', () => {
    expect(promptForSideChat('passage')).toBe('About this passage:\n\n> passage\n\n')
  })
})

describe('placeToolbar', () => {
  const viewport = { width: 1000, height: 800 }

  it('prefers the space below the selection', () => {
    expect(placeToolbar({ top: 100, left: 400, width: 100, height: 20 }, 200, 40, 8, viewport))
      .toEqual({ top: 128, left: 350 })
  })

  it('flips above when the selection sits near the bottom', () => {
    expect(placeToolbar({ top: 760, left: 400, width: 100, height: 20 }, 200, 40, 8, viewport))
      .toEqual({ top: 712, left: 350 })
  })

  it('clamps into the viewport on both edges', () => {
    expect(placeToolbar({ top: 100, left: 990, width: 10, height: 20 }, 200, 40, 8, viewport).left).toBe(792)
    expect(placeToolbar({ top: 100, left: 0, width: 10, height: 20 }, 200, 40, 8, viewport).left).toBe(8)
  })
})

describe('annotation prompt block', () => {
  it('renders one compact line per annotation', () => {
    const block = annotationsPrompt([
      { id: 'a', passage: 'first line\nsecond line', note: 'tighten this' },
      { id: 'b', passage: 'another', note: '' },
    ])
    expect(block).toBe([
      'Regarding these passages:',
      '- "first line second line" — tighten this',
      '- "another"',
    ].join('\n'))
  })

  it('truncates a long passage so the draft stays readable', () => {
    const line = annotationLine({ id: 'c', passage: 'x'.repeat(400), note: 'n' })
    // Two quotes + the ellipsis + the em dash and note.
    expect(line).toBe(`"${'x'.repeat(139)}…" — n`)
  })

  it('returns an empty string when there is nothing to carry', () => {
    expect(annotationsPrompt([])).toBe('')
  })
})

describe('annotation store', () => {
  it('appends, publishes stable snapshots, and clears per session', () => {
    let changes = 0
    const stop = subscribeAnnotations(() => { changes += 1 })
    expect(annotationsOf('s1')).toEqual([])
    addAnnotation('s1', 'alpha', 'note a')
    const afterFirst = annotationsOf('s1')
    expect(afterFirst).toHaveLength(1)
    expect(annotationsOf('s1')).toBe(afterFirst)
    addAnnotation('s1', 'beta', '')
    expect(annotationsOf('s1')).toHaveLength(2)
    expect(annotationsOf('s2')).toEqual([])
    removeAnnotation('s1', afterFirst[0]!.id)
    expect(annotationsOf('s1')).toHaveLength(1)
    clearAnnotations('s1')
    expect(annotationsOf('s1')).toEqual([])
    expect(changes).toBe(4)
    stop()
    addAnnotation('s2', 'gamma', '')
    expect(changes).toBe(4)
  })
})

describe('annotation anchors', () => {
  it('renders one compact line per annotation with its instruction', () => {
    expect(annotationLine({ id: 'a', passage: 'quoted', note: 'do this' })).toBe('"quoted" — do this')
    expect(annotationLine({ id: 'b', passage: 'quoted', note: '' })).toBe('"quoted"')
  })

  it('edits an existing note in place and reports whether it changed', () => {
    addAnnotation('edit-1', 'passage', 'before')
    const first = annotationsOf('edit-1')[0]!
    expect(updateAnnotationNote('edit-1', first.id, 'after')).toBe(true)
    expect(annotationsOf('edit-1')[0]!.note).toBe('after')
    expect(updateAnnotationNote('edit-1', first.id, 'after')).toBe(false)
    expect(updateAnnotationNote('edit-1', 'missing', 'x')).toBe(false)
  })

  it('keeps the anchor when one is supplied', () => {
    const anchor = { flowKey: 'key-1', textIndex: 2, start: 3, length: 9 }
    addAnnotation('anchor-1', 'passage', 'note', anchor)
    expect(annotationsOf('anchor-1')[0]!.anchor).toEqual(anchor)
    addAnnotation('anchor-2', 'passage', 'note')
    expect(annotationsOf('anchor-2')[0]!.anchor).toBeUndefined()
  })
})

describe('badge mounting idempotence', () => {
  // The regression this pins: mounting inserted nodes inside an observed
  // subtree, so a MutationObserver-driven repaint re-entered the mount and froze
  // the renderer. Mounting must be a no-op when the badge already exists.
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts one badge per annotation and does not duplicate on repeat', () => {
    const anchor = { flowKey: 'k1', offset: 0, length: 5 }
    addAnnotation('badge-1', 'hello', 'note', anchor)
    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-chat-flow-key', 'k1')
    paragraph.textContent = 'hello world'
    document.body.appendChild(paragraph)

    const annotations = annotationsOf('badge-1')
    const first = mountBadges(annotations, () => {})
    const second = mountBadges(annotations, () => {})
    expect(first).toBe(1)
    expect(second).toBe(0)
    expect(document.querySelectorAll('[data-dsh-enhance-badge]')).toHaveLength(1)

    removeBadges()
    expect(document.querySelectorAll('[data-dsh-enhance-badge]')).toHaveLength(0)
    expect(paragraph.textContent).toBe('hello world')
  })
})

describe('anchor resolution over character offsets', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('finds the passage after a badge has split its text node', () => {
    const row = document.createElement('div')
    row.setAttribute('data-chat-flow-key', 'row-1')
    row.textContent = 'alpha beta gamma'
    document.body.appendChild(row)

    addAnnotation('off-1', 'beta', 'note', { flowKey: 'row-1', offset: 6, length: 4 })
    const annotations = annotationsOf('off-1')
    expect(rangesOf(annotations[0]!).map(range => range.toString())).toEqual(['beta'])

    // Mounting a badge splits the text node; the same offset must still resolve.
    mountBadges(annotations, () => {})
    expect(document.querySelectorAll('[data-dsh-enhance-badge]')).toHaveLength(1)
    expect(rangesOf(annotations[0]!).map(range => range.toString())).toEqual(['beta'])
  })
})

describe('annotations visible in a transcript', () => {
  it('shows a passage filed under another Session in the transcript it quotes', () => {
    // The `Ask in side chat` shape: the annotation belongs to the side
    // conversation, but the words it quotes live in the main transcript.
    addAnnotation('side-owner', 'quoted', 'note', { flowKey: 'k', offset: 0, length: 6 }, 'main-owner')

    expect(annotationsOf('side-owner')).toHaveLength(1)
    expect(annotationsOf('main-owner')).toHaveLength(0)
    expect(annotationsVisibleIn('main-owner').map(a => a.passage)).toEqual(['quoted'])
    expect(annotationsVisibleIn('side-owner')).toEqual([])
  })
})
