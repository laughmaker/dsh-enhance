/**
 * Read the annotation entries back out of one sent message, so the transcript
 * can show them as labelled blocks instead of the raw wire text.
 *
 * `annotationsPrompt` writes numbered entries under a plain summary:
 *
 *     总结在前。
 *     1. Selected text:
 *        excerpt line
 *        User comment:
 *        comment line
 *
 *     2. Selected text:
 *        ...
 *
 * The outgoing message is unchanged — the model still receives exactly that
 * text, and copying the message still yields it. This module only recognises
 * the shape so a display rule can paint it. Recognition is deliberately strict:
 * the number must start at 1 and run consecutively, the `Selected text:` header
 * must end its line, and every body line must sit at the three-space column the
 * writer emits. A message that merely mentions "Selected text:" in prose is not
 * a match, which is what keeps ordinary messages untouched.
 */

/** Column the body of an entry sits at; must match `annotations.ts`. */
const INDENT = '   '

/** One entry header, anchored to a whole line. */
const HEADER = /^(\d+)\. Selected text:$/

/**
 * A code fence marker at the very start of a line.
 *
 * Only a fence that sits in column zero — or one or two spaces in — opens a
 * code block here. The body of an entry is always indented by three spaces, so
 * a fence the reader wrote inside a passage or a comment stays part of that
 * block: it is plain text to the transcript, not a code block, and it must not
 * swallow the entries that follow it.
 */
const FENCE = /^ {0,2}(`{3,}|~{3,})(.*)$/

/** Where one annotation entry sits in the message, and what it says. */
export interface AnnotationEntry {
  /** Offset of the `N. Selected text:` header in the original message. */
  readonly start: number
  /** Offset just past the entry, including the blank line that separates it. */
  readonly end: number
  /** The entry number the writer assigned; entries run 1, 2, 3… */
  readonly number: number
  /** Passage lines, their three-space indent removed, blank interior lines kept. */
  readonly quote: readonly string[]
  /** Comment lines, or undefined when the entry carries only a passage. */
  readonly comment: readonly string[] | undefined
}

/** One line of the message, with its offset and its carriage-return-free text. */
interface Line {
  /** The line exactly as it appears, newline excluded. */
  readonly raw: string
  /** `raw` with a trailing carriage return removed, for matching only. */
  readonly text: string
  /** Offset of the line's first character in the original message. */
  readonly start: number
}

/**
 * Split the message into lines that remember where they start.
 * @param text - the whole message.
 * @returns one entry per line, including a trailing empty line after a final newline.
 */
function linesOf(text: string): Line[] {
  const lines: Line[] = []
  let start = 0
  for (;;) {
    const newline = text.indexOf('\n', start)
    const end = newline === -1 ? text.length : newline
    const raw = text.slice(start, end)
    lines.push({ raw, text: raw.endsWith('\r') ? raw.slice(0, -1) : raw, start })
    if (newline === -1) break
    start = newline + 1
  }
  return lines
}

/**
 * Index of the next non-blank line at or after `from`.
 * @param lines - the message's lines.
 * @param from - where to start looking.
 * @returns that line's index, or undefined when only blanks remain.
 */
function nextNonBlank(lines: readonly Line[], from: number): number | undefined {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index]!.text.length > 0) return index
  }
  return undefined
}

/**
 * Mark the lines that belong to a fenced code block.
 *
 * A reader who pastes an example into their message — a snippet that happens
 * to look like an annotation — must not have it turned into a labelled block.
 * Only a fence in the first three columns opens a block here, because the body
 * of an annotation entry is always indented by three spaces: a fence inside a
 * passage is plain text to the transcript and stays part of that passage.
 *
 * A fence only counts when it is closed. An unterminated fence is ordinary
 * text, so it must not swallow the real entries that follow it.
 * @param lines - the message's lines.
 * @returns one flag per line, true when the line is part of a code block.
 */
function fencedLines(lines: readonly Line[]): boolean[] {
  const inside: boolean[] = new Array(lines.length).fill(false)
  for (let index = 0; index < lines.length; index += 1) {
    const open = FENCE.exec(lines[index]!.text)
    if (open === null) continue
    const marker = open[1]!
    const char = marker[0]!
    const length = marker.length
    // Find the closing fence: same character, at least as long, no info string.
    let close = -1
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const match = FENCE.exec(lines[scan]!.text)
      if (match === null) continue
      const end = match[1]!
      if (end[0] === char && end.length >= length && match[2]!.trim() === '') {
        close = scan
        break
      }
    }
    // An unterminated fence is plain text; leave the block unmarked and carry
    // on scanning after it.
    if (close === -1) continue
    for (let mark = index; mark <= close; mark += 1) inside[mark] = true
    index = close
  }
  return inside
}

/**
 * Parse one entry starting at its header line.
 * @param lines - the message's lines.
 * @param headerIndex - index of the `N. Selected text:` line.
 * @param textLength - total message length, for the end offset at EOF.
 * @param fenced - lines that belong to a code block.
 * @returns the entry, the index to continue scanning from, or undefined when the
 *          lines under this header do not form a valid entry.
 */
function parseEntry(
  lines: readonly Line[],
  headerIndex: number,
  textLength: number,
  fenced: readonly boolean[],
): { readonly entry: AnnotationEntry; readonly next: number } | undefined {
  const header = lines[headerIndex]!
  const number = Number(HEADER.exec(header.text)![1])
  const quote: string[] = []
  const comment: string[] = []
  let commentStarted = false
  let index = headerIndex + 1

  while (index < lines.length) {
    const line = lines[index]!
    if (HEADER.test(line.text) && !fenced[index]) break
    if (line.text.length === 0) {
      const ahead = nextNonBlank(lines, index)
      // A blank line runs into the next block only when an indented line follows
      // it; otherwise it is the entry's separator, so the entry takes the blank
      // lines with it and stops at the next significant line.
      if (ahead === undefined) { index = lines.length; break }
      if (!lines[ahead]!.text.startsWith(INDENT)) { index = ahead; break }
      // Every blank line of the run is part of the block, so a passage that had
      // two blank lines inside it keeps two — collapsing them to one would
      // change the shape the reader quoted.
      for (let blank = index; blank < ahead; blank += 1) {
        if (commentStarted) comment.push('')
        else quote.push('')
      }
      index = ahead
      continue
    }
    if (!line.text.startsWith(INDENT)) break
    const content = line.text.slice(INDENT.length)
    if (!commentStarted && content === 'User comment:') {
      commentStarted = true
      index += 1
      continue
    }
    if (commentStarted) comment.push(content)
    else quote.push(content)
    index += 1
  }

  if (quote.every(line => line.trim().length === 0)) return undefined
  if (commentStarted && comment.every(line => line.trim().length === 0)) return undefined

  // The entry's range ends where the next significant line begins, so the blank
  // line before a following entry (or the reader's body text) is drawn by this
  // entry rather than left as a loose text node between two blocks.
  const end = index >= lines.length ? textLength : lines[index]!.start
  return {
    entry: {
      start: header.start,
      end,
      number,
      quote,
      comment: commentStarted ? comment : undefined,
    },
    next: index,
  }
}

/**
 * Every annotation entry a message carries, in order.
 *
 * An entry only counts when its number continues the run from 1, so a message
 * that quotes a stray `7. Selected text:` in the middle of prose is not split.
 * @param text - the whole message.
 * @returns the recognised entries; empty when the message is not an annotation.
 */
export function parseAnnotationEntries(text: string): readonly AnnotationEntry[] {
  const lines = linesOf(text)
  const fenced = fencedLines(lines)
  const entries: AnnotationEntry[] = []
  let expected = 1
  let index = 0
  while (index < lines.length) {
    const match = fenced[index] ? null : HEADER.exec(lines[index]!.text)
    if (match === null || Number(match[1]) !== expected) {
      index += 1
      continue
    }
    const parsed = parseEntry(lines, index, text.length, fenced)
    if (parsed === undefined) {
      index += 1
      continue
    }
    entries.push(parsed.entry)
    expected += 1
    index = parsed.next
  }
  return entries
}

/** Identity the display rule registers under, and the node id it emits. */
export const ANNOTATION_RULE_ID = 'dshEnhance.annotation'

/** Payload one annotation node carries to its renderer. */
export interface AnnotationNodeData {
  /** Entry number, shown at the start of the group. */
  readonly number: number
  /** Passage lines. */
  readonly quote: readonly string[]
  /** Comment lines, absent when the entry carries only a passage. */
  readonly comment?: readonly string[]
}

/** A candidate node in the shape the user-text evaluator expects. */
export interface AnnotationCandidate {
  readonly id: string
  readonly start: number
  readonly end: number
  readonly data: AnnotationNodeData
}

/**
 * User-text rule that lifts each annotation entry out of a message.
 *
 * One call returns the first entry at or after `from`; the evaluator calls it
 * again past that entry for the next one, so a message with several entries
 * becomes several nodes with the plain summary and body text kept around them.
 */
export const annotationDisplayRule = {
  id: ANNOTATION_RULE_ID,
  // Ahead of the session/file rules, so a reference inside a passage stays part
  // of the annotation block instead of splitting it.
  order: 5,
  /**
   * Match the next annotation entry.
   * @param text - the whole message.
   * @param from - offset the evaluator has reached.
   * @returns the next entry as a node, or undefined when none is left.
   */
  match(text: string, from: number): AnnotationCandidate | undefined {
    for (const entry of parseAnnotationEntries(text)) {
      if (entry.start < from) continue
      return {
        id: ANNOTATION_RULE_ID,
        start: entry.start,
        end: entry.end,
        data: entry.comment === undefined
          ? { number: entry.number, quote: entry.quote }
          : { number: entry.number, quote: entry.quote, comment: entry.comment },
      }
    }
    return undefined
  },
}
