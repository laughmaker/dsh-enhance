/**
 * Documents the DOM contract the selection feature depends on, and the pure
 * helpers over it. Kept free of React so it can be reasoned about (and unit
 * tested) on its own.
 */

/** Transcript node marker: one rendered Chat node (user or assistant). */
export const CHAT_NODE_SELECTOR = '[data-slot="conversation.chat.node"]'

/** Assistant-step flow marker: the markdown body wrapper of one assistant step. */
export const ASSISTANT_FLOW_SELECTOR = '[data-chat-flow-kind="assistant-step"]'

/**
 * Element an active selection must live in for the toolbar to appear: the
 * conversation transcript only, never the composer, sidebar or a preview.
 */
const SELECTION_ROOT_SELECTOR = `${CHAT_NODE_SELECTOR}, ${ASSISTANT_FLOW_SELECTOR}`

/** Marks the toolbar itself, so its own text never re-triggers the popover. */
export const TOOLBAR_ATTRIBUTE = 'data-dsh-enhance-toolbar'

/**
 * Whether a node belongs to the transcript.
 * @param node - candidate DOM node.
 * @returns whether the node is inside a rendered Chat node.
 */
export function isTranscriptNode(node: Node | null | undefined): boolean {
  if (node === null || node === undefined) return false
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  if (element === null) return false
  return element.closest(SELECTION_ROOT_SELECTOR) !== null
}

/**
 * Whether a node is part of this plugin's own toolbar.
 * @param node - candidate DOM node.
 * @returns whether the node is the toolbar or inside it.
 */
export function isToolbarNode(node: Node | null | undefined): boolean {
  if (node === null || node === undefined) return false
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  return element?.closest(`[${TOOLBAR_ATTRIBUTE}]`) !== null && element?.closest(`[${TOOLBAR_ATTRIBUTE}]`) !== undefined
}

/** A selection worth showing the toolbar for, captured at gesture time. */
export interface CapturedSelection {
  /** The selected text, single internal whitespace runs collapsed. */
  readonly text: string
  /** Viewport rectangle of the selection, in CSS pixels. */
  readonly rect: { readonly top: number; readonly left: number; readonly width: number; readonly height: number }
}

/** Shortest selection that opens the toolbar. */
export const MIN_SELECTION_CHARS = 2

/** Longest selection carried into a prompt verbatim. */
export const MAX_SELECTION_CHARS = 8000

/**
 * Read the current selection when it belongs to the transcript.
 * @param selection - the document selection, if any.
 * @returns the captured selection, or undefined when the toolbar must stay hidden.
 */
export function captureSelection(selection: Selection | null): CapturedSelection | undefined {
  if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return undefined
  const text = normalizeSelectionText(selection.toString())
  if (text.length < MIN_SELECTION_CHARS) return undefined
  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  if (!isTranscriptNode(container) || isToolbarNode(container)) return undefined
  // The composer is a contenteditable surface: its own selection is never a quote.
  const element = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement
  if (element?.closest('[contenteditable="true"]') != null) return undefined
  const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0)
  const rect = rects.length > 0 ? rects[rects.length - 1]! : range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return undefined
  return {
    text,
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
  }
}

/**
 * Normalize selected text for the draft: trim the ends and keep at most one
 * blank line between blocks, but never reflow the author's own line breaks.
 * @param raw - the selection's raw text.
 * @returns text safe to insert.
 */
export function normalizeSelectionText(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, '\n').trim()
  if (trimmed.length === 0) return ''
  const collapsed = trimmed.replace(/\n{3,}/g, '\n\n')
  return collapsed.length > MAX_SELECTION_CHARS ? collapsed.slice(0, MAX_SELECTION_CHARS) : collapsed
}

/**
 * Render one selected passage as the quoted block appended to a draft.
 * @param text - normalized selection text.
 * @returns markdown blockquote text with a trailing blank line.
 */
export function quoteForDraft(text: string): string {
  const quoted = text.split('\n').map(line => (line.length === 0 ? '>' : `> ${line}`)).join('\n')
  return `${quoted}\n\n`
}

/**
 * Render one selected passage as the opening question of a new conversation.
 * @param text - normalized selection text.
 * @returns the prompt text.
 */
export function promptForSideChat(text: string): string {
  return `About this passage:\n\n${quotedBlock(text)}\n\n`
}

/**
 * Quote a passage as a markdown blockquote.
 * @param text - normalized selection text.
 * @returns blockquote text without a trailing newline.
 */
export function quotedBlock(text: string): string {
  return text.split('\n').map(line => (line.length === 0 ? '>' : `> ${line}`)).join('\n')
}

/**
 * Text the copy shortcut should carry while the annotation popover is open.
 *
 * Opening the popover focuses the note field, and focusing a field takes the
 * document selection with it: Cmd+C then copies an empty box instead of the
 * words the reader just highlighted. So while the field holds no selection of
 * its own, the copy carries the marked passage; the moment the reader selects
 * text inside the field, the native copy is the one they asked for.
 * @param passage - the marked passage, when the popover is showing one.
 * @param field - the note field, once the popover has rendered it.
 * @returns text to write to the clipboard, or undefined to leave the copy alone.
 */
export function copyTextFor(
  passage: string | undefined,
  field: { readonly selectionStart: number | null; readonly selectionEnd: number | null } | null,
): string | undefined {
  if (passage === undefined || passage.length === 0) return undefined
  if (field !== null && field.selectionStart !== field.selectionEnd) return undefined
  return passage
}

/**
 * Place a `width`-wide box below (or above) an anchor rect, clamped into the viewport.
 * @param anchor - the selection rectangle.
 * @param width - toolbar width in CSS pixels.
 * @param height - toolbar height in CSS pixels.
 * @param gap - distance kept between the selection and the toolbar.
 * @param viewport - viewport size in CSS pixels.
 * @returns fixed-position top/left for the toolbar.
 */
export function placeToolbar(
  anchor: { readonly top: number; readonly left: number; readonly width: number; readonly height: number },
  width: number,
  height: number,
  gap: number,
  viewport: { readonly width: number; readonly height: number },
): { readonly top: number; readonly left: number } {
  const below = anchor.top + anchor.height + gap
  const above = anchor.top - height - gap
  const top = below + height <= viewport.height - 8 ? below : Math.max(8, above)
  const centered = anchor.left + anchor.width / 2 - width / 2
  const left = Math.min(Math.max(8, centered), Math.max(8, viewport.width - width - 8))
  return { top, left }
}
