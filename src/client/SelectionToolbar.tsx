/**
 * Annotation popover: the small composer that appears next to a transcript
 * selection.
 *
 * The gesture mirrors the reading flow: select a passage, say what you want
 * about it, confirm. A confirmed popover becomes one entry in the composer's
 * annotation tray instead of writing into the draft, so several passages can be
 * marked while the message they belong to stays open.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { TOOLBAR_ATTRIBUTE, captureSelection, placeToolbar, type CapturedSelection } from './selection.ts'
import { anchorForRange } from './anchors.ts'
import type { AnnotationAnchor } from './annotations.ts'

/** Where the marked passage sits, when the selection allowed describing it. */
export type AnnotationAnchorInput = AnnotationAnchor | undefined

/** What the popover reports back to its host. */
export interface AnnotationSubmit {
  /** The marked passage. */
  readonly passage: string
  /** The instruction the reader wrote; may be empty. */
  readonly note: string
  /** Where the passage sits, so the row can scroll back to it later. */
  readonly anchor: AnnotationAnchorInput
  /** Session whose transcript holds the passage (the one it was selected in). */
  readonly sourceSessionId?: string | undefined
}

/** Owner-supplied callbacks. */
export interface SelectionToolbarProps {
  /** Translator for this plugin's namespace. */
  readonly t: TranslateNS<'dshEnhance'>
  /**
   * Whether this popover's composer is the main conversation.
   *
   * A right-Sidebar chat mounts the same seat, and the reader annotates the
   * conversation on screen — so only the main composer answers a transcript
   * gesture. Consulted per gesture, because a seat can move between surfaces.
   * @returns whether this seat owns the main composer.
   */
  readonly ownsSelection: () => boolean
  /** Session this popover's composer belongs to; recorded as the passage source. */
  readonly sourceSessionId?: string | undefined
  /**
   * Store one annotation.
   * @param submit - the passage, its instruction, and its transcript anchor.
   */
  readonly onAnnotate: (submit: AnnotationSubmit) => void
  /**
   * Open a side conversation seeded with the marked passage.
   * @param passage - the marked passage.
   * @param note - the instruction typed so far, so the side chat starts from it.
   * @returns completion; failures are reported through `notify`.
   */
  readonly askInSideChat: (
    passage: string,
    note?: string,
    sourceSessionId?: string,
    anchor?: AnnotationAnchor,
  ) => Promise<void>
  /**
   * Report a failed action.
   * @param message - already-localized message.
   */
  readonly notify: (message: string) => void
}

/** Distance kept between the selection and the popover. */
const GAP = 8

/** Popover footprint used for placement before the first measurement. */
const APPROX_WIDTH = 420
const APPROX_HEIGHT = 96

/** Gestures that may end a selection; `mouseup` also covers trackpad drags. */
const SETTLE_EVENTS = ['mouseup', 'keyup', 'touchend'] as const

/** Registered highlight name; the sheet styles `::highlight(...)` under this name. */
const HIGHLIGHT_NAME = 'dsh-enhance-annotation'

/**
 * Render the annotation popover while a transcript selection is active.
 * @param props - translator, the annotate action, and the side-chat action.
 * @returns the portal content, or null while no selection is active.
 */
export function SelectionToolbar({
  t, ownsSelection, sourceSessionId, onAnnotate, askInSideChat, notify,
}: SelectionToolbarProps): ReactNode {
  const [captured, setCaptured] = useState<CapturedSelection | undefined>(undefined)
  const [placement, setPlacement] = useState<{ top: number; left: number } | undefined>(undefined)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const surface = useRef<HTMLDivElement | null>(null)
  const input = useRef<HTMLTextAreaElement | null>(null)
  const latest = useRef<CapturedSelection | undefined>(undefined)
  const savedRange = useRef<Range | null>(null)
  const savedAnchor = useRef<AnnotationAnchorInput>(undefined)

  const dismiss = useCallback(() => {
    latest.current = undefined
    setCaptured(undefined)
    setPlacement(undefined)
    setNote('')
    setBusy(false)
  }, [])

  useEffect(() => {
    /** Capture on the gesture that ends a selection, never mid-drag. */
    const settle = (event: Event): void => {
      // A pointer landing inside this popover is the reader writing their note;
      // the same goes for the selection the textarea itself carries.
      if (isInsidePopover(event.target) || isInsidePopover(document.activeElement)) return
      if (!ownsSelection()) { dismiss(); return }
      const selection = window.getSelection()
      const next = captureSelection(selection)
      if (next === undefined) { dismiss(); return }
      // Keep the range: focusing the note field clears the document selection,
      // and the passage must stay highlighted while the reader writes.
      savedRange.current = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null
      savedAnchor.current = savedRange.current === null ? undefined : anchorForRange(savedRange.current)
      latest.current = next
      setCaptured(next)
    }
    /** Collapse the popover whenever the selection moves away or empties. */
    const onChange = (): void => {
      if (isInsidePopover(document.activeElement)) return
      const selection = window.getSelection()
      if (captureSelection(selection) === undefined || !ownsSelection()) dismiss()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') dismiss()
    }
    const onScroll = (event: Event): void => {
      if (isInsidePopover(event.target)) return
      dismiss()
    }
    for (const name of SETTLE_EVENTS) document.addEventListener(name, settle, true)
    document.addEventListener('selectionchange', onChange)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', dismiss)
    return () => {
      for (const name of SETTLE_EVENTS) document.removeEventListener(name, settle, true)
      document.removeEventListener('selectionchange', onChange)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [dismiss, ownsSelection])

  // Paint the marked passage as a highlight instead of re-selecting it.
  //
  // The document selection follows focus: once the note field is focused the
  // passage would lose its native highlight, and re-adding the range on every
  // selection change would take the caret back and make typing impossible. The
  // Custom Highlight API paints the range without touching the selection, so
  // the reader keeps both the caret and the mark.
  useEffect(() => {
    if (captured === undefined) return
    const range = savedRange.current
    if (range === null || typeof Highlight === 'undefined' || CSS.highlights === undefined) return
    const highlight = new Highlight(range)
    CSS.highlights.set(HIGHLIGHT_NAME, highlight)
    return () => {
      if (CSS.highlights.get(HIGHLIGHT_NAME) === highlight) CSS.highlights.delete(HIGHLIGHT_NAME)
    }
  }, [captured])

  useEffect(() => {
    if (captured === undefined) { setPlacement(undefined); return }
    const element = surface.current
    setPlacement(placeToolbar(captured.rect, element?.offsetWidth ?? APPROX_WIDTH, element?.offsetHeight ?? APPROX_HEIGHT, GAP, {
      width: window.innerWidth,
      height: window.innerHeight,
    }))
  }, [captured])

  // Focus the note field as soon as the popover exists.
  //
  // This waits for `placement`, not `captured`: the component returns null until
  // both are set, so on the pass where a selection is captured the textarea has
  // not been mounted yet and `input.current` is still null. Keying the effect on
  // the rendered state is what actually lands the caret in the field, so the
  // reader can type the note straight away instead of clicking first.
  useEffect(() => {
    if (placement === undefined) return
    input.current?.focus({ preventScroll: true })
  }, [placement])

  // Grow the field with its text instead of scrolling it.
  //
  // The note is written while the passage stays readable behind the popover, so
  // a scrollbar inside a 4-line box hides part of what was just typed. Height is
  // measured from `scrollHeight` (which the CSS keeps unbounded) and written
  // back as an inline height, reset to auto first so a deleted line shrinks it
  // again rather than leaving the box tall.
  useLayoutEffect(() => {
    const field = input.current
    if (field === null) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [note, placement])

  const confirm = useCallback(() => {
    const current = latest.current
    if (current === undefined) return
    onAnnotate({
      passage: current.text,
      note: note.trim(),
      anchor: savedAnchor.current,
      sourceSessionId,
    })
    dismiss()
  }, [dismiss, note, onAnnotate, sourceSessionId])

  const ask = useCallback(() => {
    const current = latest.current
    if (current === undefined) return
    setBusy(true)
    void askInSideChat(current.text, note.trim(), sourceSessionId, savedAnchor.current)
      .then(() => { dismiss() })
      .catch((error: unknown) => {
        notify(t('error.sideChat', { message: error instanceof Error ? error.message : String(error) }))
      })
      .finally(() => { setBusy(false) })
  }, [askInSideChat, dismiss, note, notify, t])

  if (captured === undefined || placement === undefined) return null

  const portal = (
    <div
      ref={surface}
      className="dsh-enhance-popover"
      data-dsh-enhance-toolbar=""
      role="dialog"
      aria-label={t('toolbar.label')}
      style={{ top: `${placement.top}px`, left: `${placement.left}px` }}
    >
      <div className="dsh-enhance-popover__field">
        <textarea
          ref={input}
          className="dsh-enhance-popover__input"
          value={note}
          rows={1}
          placeholder={t('toolbar.placeholder')}
          aria-label={t('toolbar.placeholder')}
          onChange={(event) => { setNote(event.currentTarget.value) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              confirm()
            }
          }}
        />
        <button
          type="button"
          className="dsh-enhance-popover__confirm"
          aria-label={t('toolbar.confirm')}
          title={t('toolbar.confirmHint')}
          disabled={note.trim().length === 0}
          onClick={confirm}
        >
          <CheckGlyph />
        </button>
      </div>
      <div className="dsh-enhance-popover__footer">
        <span className="dsh-enhance-popover__quote" title={captured.text}>
          {preview(captured.text)}
        </span>
        <button
          type="button"
          className="dsh-enhance-popover__link"
          onClick={ask}
          disabled={busy}
          title={t('toolbar.sideChat.hint')}
        >
          {busy ? t('toolbar.sideChat.busy') : t('toolbar.sideChat')}
        </button>
      </div>
    </div>
  )

  return createPortal(portal, document.body)
}

/**
 * Whether a node sits inside the popover surface.
 * @param node - candidate node.
 * @returns whether the node is inside `[data-dsh-enhance-toolbar]`.
 */
export function isInsidePopover(node: unknown): boolean {
  if (!(node instanceof Node)) return false
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
  return element?.closest(`[${TOOLBAR_ATTRIBUTE}]`) != null
}

/**
 * One-line preview of a passage for the popover header.
 * @param text - the normalized passage.
 * @returns collapsed, truncated text.
 */
function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat
}

/** Check mark drawn inline, so the popover depends on no icon package. */
function CheckGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M3.4 8.6 6.3 11.4 12.6 4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
