/**
 * Re-find a marked passage in the transcript and reveal it.
 *
 * The reading gesture produces a Range, but a Range is live: React re-renders
 * replace the nodes it pointed at. Annotations therefore keep a structural
 * anchor (row key, text-node index, offsets) instead, and this module rebuilds
 * the range on demand — for the hover preview, for the highlight, and for the
 * scroll a row click performs.
 */
import type { Annotation, AnnotationAnchor } from './annotations.ts'

/** Any transcript row the plugin may anchor to. */
const ROW_SELECTOR = '[data-chat-flow-key], [data-chat-anchor-key]'

/**
 * Describe where a live range sits in the transcript.
 * @param range - the selection range.
 * @returns the anchor, or undefined when the range is outside a transcript row.
 */
export function anchorForRange(range: Range): AnnotationAnchor | undefined {
  const startElement = nodeElement(range.startContainer)
  const row = startElement?.closest<HTMLElement>(ROW_SELECTOR)
  if (row === null || row === undefined) return undefined
  const offset = textOffsetOf(row, range.startContainer, range.startOffset)
  const end = textOffsetOf(row, range.endContainer, range.endOffset)
  if (offset === undefined || end === undefined || end <= offset) return undefined
  return {
    flowKey: row.dataset.chatFlowKey ?? row.dataset.chatAnchorKey ?? '',
    offset,
    length: end - offset,
  }
}

/**
 * The element a node lives in.
 * @param node - an element or a text node.
 * @returns the element itself or its parent.
 */
function nodeElement(node: Node): Element | null {
  if (node.nodeType === Node.ELEMENT_NODE) return node as Element
  return node.parentElement
}

/**
 * List the text nodes of one row, ignoring this plugin's own badges.
 * @param row - the transcript row.
 * @returns its text nodes in document order.
 */
function textNodesOf(row: Element): Text[] {
  const walker = row.ownerDocument.createTreeWalker(row, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current !== null) {
    const parent = current.parentElement
    // Badge labels are plugin chrome, not transcript text: counting them would
    // shift every offset in the row.
    if (parent?.closest('[data-dsh-enhance-badge], [data-dsh-enhance-badge-anchor]') === null
      && current.textContent !== null && current.textContent.length > 0) {
      nodes.push(current as Text)
    }
    current = walker.nextNode()
  }
  return nodes
}

/**
 * Convert a DOM position inside a row into a character offset over its text.
 * @param row - the row the position belongs to.
 * @param node - the position's node.
 * @param offset - the position's offset within that node.
 * @returns the character offset, or undefined when the node is outside the row.
 */
function textOffsetOf(row: Element, node: Node, offset: number): number | undefined {
  const texts = textNodesOf(row)
  let total = 0
  for (const text of texts) {
    if (text === node) return total + Math.min(offset, text.data.length)
    if (text.contains(node)) {
      // The position sits on an element boundary inside this text's parent.
      return total + (node === text.parentNode ? Math.min(offset, text.data.length) : 0)
    }
    total += text.data.length
  }
  // A collapsed range on the row itself resolves to the end of its text.
  if (row.contains(node)) return total
  return undefined
}

/**
 * Resolve a row by its anchor key.
 * @param flowKey - `data-chat-flow-key` of the row.
 * @returns the row element, or null when it is not rendered (folded, or paged out).
 */
export function rowOf(flowKey: string): HTMLElement | null {
  if (flowKey.length === 0) return null
  return document.querySelector<HTMLElement>(`[data-chat-flow-key="${escapeAttribute(flowKey)}"]`)
}

/**
 * Escape a value for use inside an attribute selector.
 *
 * `CSS.escape` is the right tool but is absent in a bare JSDOM environment and in
 * older embedded webviews, and an unescaped quote would make the selector throw.
 * @param value - the raw attribute value.
 * @returns the value safe to embed between double quotes.
 */
function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, match => `\\${match}`)
}

/**
 * Rebuild the range a stored anchor describes.
 * @param anchor - the stored anchor.
 * @returns the range, or undefined when the row or its text is gone.
 */
export function rangeOf(anchor: AnnotationAnchor): Range | undefined {
  const row = rowOf(anchor.flowKey)
  if (row === null) return undefined
  const from = positionAt(row, anchor.offset)
  const to = positionAt(row, anchor.offset + anchor.length)
  if (from === undefined || to === undefined) return undefined
  const range = row.ownerDocument.createRange()
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  return range
}

/**
 * Resolve a character offset over a row's text back to a DOM position.
 * @param row - the transcript row.
 * @param offset - character offset over the row's text.
 * @returns the DOM position, or undefined when the offset is past the text.
 */
function positionAt(row: Element, offset: number): { node: Text; offset: number } | undefined {
  let remaining = offset
  for (const text of textNodesOf(row)) {
    if (remaining <= text.data.length) return { node: text, offset: remaining }
    remaining -= text.data.length
  }
  const last = textNodesOf(row).at(-1)
  return last === undefined ? undefined : { node: last, offset: last.data.length }
}

/**
 * Register the plugin's highlight name for the marked passages.
 *
 * The hovered row and the passage being annotated share one highlight: both are
 * "this is what the text in the panel refers to".
 */
export const HIGHLIGHT_NAME = 'dsh-enhance-annotation'

/**
 * Registered highlight name for passages that carry an annotation.
 *
 * Distinct from the transient {@link HIGHLIGHT_NAME}: this one stays painted for
 * as long as the annotation exists, so the transcript itself shows which
 * passages the message will quote.
 */
export const MARK_NAME = 'dsh-enhance-annotation-mark'

/**
 * Highlight name for one Session's marks.
 *
 * A registry entry is global, so a single name painted the main conversation's
 * marks and then the sidebar's, leaving whichever ran last. Naming the entry per
 * Session keeps both painted at once.
 * @param sessionId - the Session whose marks these are.
 * @returns a registry key unique to that Session.
 */
export function markNameFor(sessionId: string): string {
  return `${MARK_NAME}-${sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/**
 * Paint one annotation's passage.
 * @param annotation - the annotation to highlight.
 * @returns whether a highlight was applied (its row is currently rendered).
 */
export function highlightAnnotation(annotation: Annotation): boolean {
  const ranges = rangesOf(annotation)
  if (ranges.length === 0 || typeof Highlight === 'undefined' || CSS.highlights === undefined) return false
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges))
  return true
}

/**
 * Clear any annotation highlight this plugin painted.
 */
export function clearHighlight(): void {
  if (typeof CSS === 'undefined' || CSS.highlights === undefined) return
  CSS.highlights.delete(HIGHLIGHT_NAME)
}

/**
 * Resolve the ranges for one annotation, falling back to a text search.
 *
 * The stored anchor is tried first. Failing that — a folded row, a re-rendered
 * node list, a passage that came from another part of the page — the passage is
 * searched inside its row, then inside the transcript, so the row click still
 * lands somewhere useful instead of doing nothing.
 * @param annotation - the annotation to resolve.
 * @returns every range that should be highlighted.
 */
export function rangesOf(annotation: Annotation): Range[] {
  if (annotation.anchor !== undefined) {
    const range = rangeOf(annotation.anchor)
    if (range !== undefined) return [range]
  }
  return searchRanges(annotation.passage, annotation.anchor?.flowKey)
}

/**
 * Find a passage's text in the rendered transcript.
 * @param passage - the quoted passage.
 * @param flowKey - preferred row, when the annotation carries one.
 * @returns the matching ranges, at most a handful.
 */
function searchRanges(passage: string, flowKey: string | undefined): Range[] {
  const needle = passage.replace(/\s+/g, ' ').trim()
  if (needle.length === 0) return []
  const roots: Element[] = []
  const preferred = flowKey === undefined ? null : rowOf(flowKey)
  if (preferred !== null) roots.push(preferred)
  const transcript = document.querySelector('[data-chat-flow-kind]')?.closest('[data-slot="conversation.session"]')
  if (transcript !== null && transcript !== undefined && !roots.includes(transcript)) roots.push(transcript)
  const ranges: Range[] = []
  for (const root of roots) {
    for (const text of textNodesOf(root)) {
      // Match on the collapsed form, then map the hit back onto the raw text.
      //
      // Collapsing whitespace changes the string's length, so an index taken
      // from the collapsed form is not a valid offset into `text.data`. That
      // mismatch silently missed every passage that spanned a line break —
      // exactly the multi-line prose these annotations point at — so the
      // passage never got a range and its highlight never appeared.
      const collapsed = text.data.replace(/\s+/g, ' ')
      const hit = collapsed.indexOf(needle)
      if (hit < 0) continue
      const start = rawIndexOf(text.data, hit)
      const end = rawIndexOf(text.data, hit + needle.length)
      if (start === undefined || end === undefined) continue
      const range = document.createRange()
      range.setStart(text, start)
      range.setEnd(text, end)
      ranges.push(range)
      return ranges
    }
  }
  return ranges
}

/**
 * Map an offset in the whitespace-collapsed text back to the raw text.
 *
 * `collapsedOffset` counts characters after every run of whitespace became a
 * single space, so walking the raw string while emitting one position per
 * collapsed character gives the matching raw index. A collapsed offset equal to
 * the collapsed length maps to the end of the raw string.
 * @param raw - the node's actual text.
 * @param collapsedOffset - the index in `raw.replace(/\s+/g, ' ')`.
 * @returns the equivalent index in `raw`.
 */
function rawIndexOf(raw: string, collapsedOffset: number): number | undefined {
  if (collapsedOffset < 0) return undefined
  let produced = 0
  let index = 0
  while (index < raw.length) {
    if (produced === collapsedOffset) return index
    // One collapsed character per run: step over the whole whitespace run.
    if (/\s/.test(raw[index] ?? '')) {
      while (index < raw.length && /\s/.test(raw[index] ?? '')) index += 1
      produced += 1
      continue
    }
    index += 1
    produced += 1
  }
  return produced === collapsedOffset ? raw.length : undefined
}

/**
 * Scroll a marked passage into view and paint it.
 * @param annotation - the annotation whose row should be shown.
 * @returns whether the passage was found and revealed.
 */
export function revealAnnotation(annotation: Annotation): boolean {
  const ranges = rangesOf(annotation)
  if (ranges.length === 0) return false
  const range = ranges[0]!
  const row = nodeElement(range.startContainer)?.closest<HTMLElement>(ROW_SELECTOR) ?? null
  highlightAnnotation(annotation)
  return scrollIntoView(row ?? nodeElement(range.startContainer), range)
}

/**
 * Scroll one passage into the vertical middle of the transcript viewport.
 *
 * Centring the *passage* (not its row) matters: rows can be a whole Turn tall,
 * and centring such a row leaves the quoted words near the bottom edge where the
 * composer covers them. The composer is an overlay in this layout, so the
 * scroller's own rectangle is not the usable area — the visible band ends where
 * the composer starts. The pass is repeated on the next frames because the
 * transcript virtualizes Turns and eases its own scroll.
 * @param row - the row to centre, when it is rendered.
 * @param range - the passage, used when only its parent is available.
 * @returns whether a scroll target was found.
 */
function scrollIntoView(row: Element | null, range: Range): boolean {
  const target = row ?? nodeElement(range.startContainer)
  if (target === null) return false
  const scroller = scrollerOf(target)
  const box = scroller ?? null

  /** Vertical band the reader can actually see: above the composer overlay. */
  const visibleBand = (): { top: number; height: number } => {
    if (box === null) return { top: 0, height: window.innerHeight }
    const rect = box.getBoundingClientRect()
    const composer = document.querySelector('[data-composer-card]')?.getBoundingClientRect()
    const bottom = composer !== undefined && composer.top > rect.top && composer.top < rect.bottom
      ? composer.top
      : rect.bottom
    return { top: rect.top, height: Math.max(120, bottom - rect.top) }
  }

  const centre = (): boolean => {
    // The passage rect is the precise target; a degenerate one falls back to
    // the row so a zero-size range cannot leave the scroll untouched.
    const passage = range.getBoundingClientRect()
    const targetRect = passage.height > 0 ? passage : target.getBoundingClientRect()
    const band = visibleBand()
    const delta = targetRect.top + targetRect.height / 2 - (band.top + band.height / 2)
    if (Math.abs(delta) < 2) return true
    if (box === null) {
      window.scrollBy({ top: delta, behavior: 'smooth' })
      return false
    }
    box.scrollTo({ top: box.scrollTop + delta, behavior: 'smooth' })
    return false
  }

  centre()
  // Two deferred passes: one immediately after layout, one after the smooth
  // scroll settles. Both are no-ops once the passage is already centred.
  requestAnimationFrame(() => {
    centre()
    requestAnimationFrame(() => { centre() })
  })
  return true
}

/**
 * Find the nearest scrollable ancestor of a transcript node.
 * @param node - a node inside the transcript.
 * @returns its scrolling container, or null when the page itself scrolls.
 */
function scrollerOf(node: Element): HTMLElement | null {
  for (let element = node.parentElement; element !== null; element = element.parentElement) {
    if (element.scrollHeight <= element.clientHeight + 8) continue
    const overflowY = element.ownerDocument.defaultView?.getComputedStyle(element).overflowY ?? ''
    if (overflowY === 'auto' || overflowY === 'scroll') return element
  }
  return null
}

/**
 * Repaint the persistent marks for every annotation of one Session.
 *
 * The marks are a separate highlight registry entry from the hover/selection
 * highlight, so revealing a row does not erase which passages are annotated.
 * Ranges whose row is not currently rendered are skipped — the mark appears when
 * that part of the transcript mounts, and the caller re-runs this on change.
 * @param annotations - the Session's annotations.
 * @returns how many marks were painted.
 */
export function paintMarks(sessionId: string, annotations: readonly Annotation[]): number {
  if (typeof Highlight === 'undefined' || CSS.highlights === undefined) return 0
  const name = markNameFor(sessionId)
  const ranges = annotations.flatMap(annotation => rangesOf(annotation))
  if (ranges.length === 0) {
    CSS.highlights.delete(name)
    return 0
  }
  CSS.highlights.set(name, new Highlight(...ranges))
  return ranges.length
}

/**
 * Remove every persistent annotation mark.
 */
export function clearMarks(sessionId: string): void {
  if (typeof CSS === 'undefined' || CSS.highlights === undefined) return
  CSS.highlights.delete(markNameFor(sessionId))
}

/** Attribute marking an inline annotation badge this plugin inserted. */
export const BADGE_ATTRIBUTE = 'data-dsh-enhance-badge'


/**
 * One solid disc carrying the reading-order number.
 *
 * Earlier takes drew a pin with a counter beside it, or a counter notched into
 * the pin's outline; both read as two shapes on one line. A single filled disc
 * with the digits inside is one mark with one silhouette, which is what the
 * inline marker needs to be. The disc grows into a pill for two and three
 * digits so the number never outgrows the shape.
 * @param number - the annotation's 1-based position.
 * @returns the SVG markup for one badge.
 */
function badgeGlyph(number: number): string {
  const digits = String(number)
  // Rounded-square tile, measured off the reference marker: the blue field is
  // square, its corner radius is a little under half the side, and the white
  // ring is a thin hairline (~4% of the side) rather than a heavy border — the
  // ring is only there to lift the tile off body text. The fill is the
  // reference's own blue, not a generic accent.
  const length = digits.length
  const side = 22
  const width = length > 1 ? side + (length - 1) * 11 : side
  const ring = 1.1
  const radius = 8.6
  const fontSize = length > 2 ? 10.5 : length > 1 ? 12 : 13.5
  return `<svg viewBox="0 0 ${width} ${side}" width="${width}" height="${side}" aria-hidden="true" focusable="false">
  <rect x="${ring / 2}" y="${ring / 2}" width="${width - ring}" height="${side - ring}"
        rx="${radius}" fill="#0268cc" stroke="#e9e9e9" stroke-width="${ring}"/>
  <text x="${width / 2}" y="${side / 2 + 0.5}" text-anchor="middle" dominant-baseline="central"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        font-size="${fontSize}" font-weight="500" fill="#fff"
        style="font-variant-numeric: tabular-nums">${digits}</text>
</svg>`
}

/**
 * Place one annotation badge at the end of every marked passage.
 *
 * A CSS highlight can only paint; it cannot carry an icon or react to a click,
 * and decoration properties are not honoured inside `::highlight`. A small inline
 * badge does both: it marks the passage in place and opens the tray when
 * clicked. Badges are re-derived from the highlights on every repaint, so a
 * folded or paged-away Turn loses and regains them with its own DOM.
 * @param annotations - the Session's annotations.
 * @param onClick - called when a badge is activated.
 * @returns how many badges are currently mounted.
 */
export function mountBadges(annotations: readonly Annotation[], onClick: (id: string) => void): number {
  // Idempotence is what keeps this safe to call from a MutationObserver: the
  // DOM writes below are observed by the caller, so a non-idempotent mount would
  // re-enter itself and stall the page. Each annotation keeps at most one badge,
  // and an existing badge is left exactly where it is.
  const existing = new Map<string, HTMLButtonElement>()
  for (const badge of document.querySelectorAll<HTMLButtonElement>(`[${BADGE_ATTRIBUTE}]`)) {
    existing.set(badge.getAttribute(BADGE_ATTRIBUTE) ?? '', badge)
  }
  // Numbering follows the store's order, so it re-derives on every repaint: a
  // removed annotation closes the gap instead of leaving 1, 3, 4 behind. Badges
  // already mounted are renumbered in place rather than rebuilt, which keeps the
  // observer from seeing a remove/insert pair for every marker on each pass.
  let mounted = 0
  annotations.forEach((annotation, offset) => {
    const number = offset + 1
    const live = existing.get(annotation.id)
    if (live !== undefined) {
      live.dataset.dshEnhanceBadgeNumber = String(number)
      live.setAttribute('aria-label', badgeLabel(annotation, number))
      live.title = badgeLabel(annotation, number)
      const slot = live.querySelector('svg text')
      if (slot !== null && slot.textContent !== String(number)) {
        live.innerHTML = badgeGlyph(number)
      }
      return
    }
    const ranges = rangesOf(annotation)
    const last = ranges[ranges.length - 1]
    if (last === undefined) return
    const badge = createBadge(annotation, number, onClick)
    // A zero-width marker span gives the badge a stable insertion point that does
    // not disturb the text it follows.
    const anchor = document.createElement('span')
    anchor.setAttribute('data-dsh-enhance-badge-anchor', '')
    anchor.appendChild(badge)
    const container = last.endContainer
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container as Text
      const at = Math.min(last.endOffset, text.data.length)
      if (at >= text.data.length) text.parentNode?.insertBefore(anchor, text.nextSibling)
      else text.parentNode?.insertBefore(anchor, text.splitText(at))
    } else {
      container.parentNode?.insertBefore(anchor, container.nextSibling)
    }
    mounted += 1
  })
  return mounted
}

/**
 * Accessible name for one badge: the reading order number, then the note (or
 * the passage when the reader left the note empty).
 * @param annotation - the annotation it marks.
 * @param number - its 1-based position in the Session's annotation list.
 * @returns the label shared by `title` and `aria-label`.
 */
function badgeLabel(annotation: Annotation, number: number): string {
  const body = annotation.note.trim().length > 0 ? annotation.note : annotation.passage
  return `${number}. ${body}`
}

/**
 * Build one badge button.
 *
 * The badge carries the annotation's position, not just a pin: with several
 * passages marked in one conversation, an unnumbered pin says "something here"
 * where the reader needs "this is the one the tray's first row refers to". The
 * number sits in a filled circle beside the pin, matching the marker shape the
 * annotation list uses.
 * @param annotation - the annotation it marks.
 * @param number - its 1-based position among the Session's annotations.
 * @param onClick - called with the annotation id when activated.
 * @returns the detached button.
 */
function createBadge(annotation: Annotation, number: number, onClick: (id: string) => void): HTMLButtonElement {
  const badge = document.createElement('button')
  badge.type = 'button'
  badge.setAttribute(BADGE_ATTRIBUTE, annotation.id)
  badge.className = 'dsh-enhance-badge'
  badge.dataset.dshEnhanceBadgeNumber = String(number)
  const label = badgeLabel(annotation, number)
  badge.title = label
  badge.setAttribute('aria-label', label)
  badge.innerHTML = badgeGlyph(number)
  badge.addEventListener('click', (event) => {
    event.stopPropagation()
    event.preventDefault()
    onClick(annotation.id)
  })
  return badge
}

/**
 * Remove every badge this plugin inserted, restoring the text it split.
 */
export function removeBadges(): void {
  for (const anchor of [...document.querySelectorAll('[data-dsh-enhance-badge-anchor]')]) {
    const parent = anchor.parentNode
    anchor.remove()
    // Re-join the text node the badge split, so repeated mounting cannot
    // fragment a paragraph into ever more pieces. `normalize()` also collapses
    // React's neighbouring text nodes, which is safe here because this only
    // runs on teardown, outside the observer callback.
    parent?.normalize()
  }
}
