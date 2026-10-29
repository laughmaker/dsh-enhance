/**
 * Unit tests for the copy gesture the annotation popover forwards.
 *
 * The regression this pins: the popover focuses its note field as it opens, and
 * that focus takes the document selection with it — Cmd+C then copied an empty
 * box instead of the passage the reader had just highlighted.
 */
import { describe, expect, it } from 'vitest'
import { copyTextFor } from '../src/client/selection.ts'

/** A note field with nothing selected, the state the popover opens in. */
const collapsedField = { selectionStart: 3, selectionEnd: 3 }

/** A note field whose text the reader selected themselves. */
const selectedField = { selectionStart: 2, selectionEnd: 9 }

describe('copyTextFor', () => {
  it('copies the passage while the note field carries no selection', () => {
    expect(copyTextFor('the marked passage', collapsedField)).toBe('the marked passage')
  })

  it('leaves the copy to the browser once the reader selects text in the field', () => {
    expect(copyTextFor('the marked passage', selectedField)).toBeUndefined()
  })

  it('copies the passage when focus sits outside the field', () => {
    expect(copyTextFor('the marked passage', null)).toBe('the marked passage')
  })

  it('stays out of the way when no passage is marked', () => {
    expect(copyTextFor(undefined, collapsedField)).toBeUndefined()
  })

  it('ignores an empty passage', () => {
    expect(copyTextFor('', collapsedField)).toBeUndefined()
  })
})
