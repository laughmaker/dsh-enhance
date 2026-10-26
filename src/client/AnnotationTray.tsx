/**
 * Annotation tray: the pill above the composer, its hover preview, and the
 * editing dialog.
 *
 * Interaction follows the reading gesture Codex uses: hovering the pill opens
 * the list, hovering a row previews the passage it quotes, clicking a row
 * scrolls the conversation back to those words, and each row can be edited or
 * removed in place.
 */
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { Annotation } from './annotations.ts'
import { clearHighlight, highlightAnnotation, revealAnnotation } from './anchors.ts'

/** Props of the tray. */
export interface AnnotationTrayProps {
  /** Translator for this plugin's namespace. */
  readonly t: TranslateNS<'dshEnhance'>
  /** Live annotations for this Session. */
  readonly annotations: readonly Annotation[]
  /**
   * Remove one annotation.
   * @param id - annotation identity.
   */
  readonly onRemove: (id: string) => void
  /**
   * Replace one annotation's instruction.
   * @param id - annotation identity.
   * @param note - the new instruction.
   */
  readonly onEdit: (id: string, note: string) => void
  /** Drop every annotation for this Session. */
  readonly onClear: () => void
  /** Monotonic counter; a change opens the list (an inline badge was clicked). */
  readonly openSignal: number
  /** Annotation id to open in the editor, set by a badge click. */
  readonly editRequest?: string | undefined
  /** Called once the request has been turned into an open editor. */
  readonly onEditRequestHandled?: () => void
}

/** Distance between the pill and its floating surfaces. */
const GAP = 6

/** Viewport margin kept by every floating surface. */
const MARGIN = 8

/**
 * The pill, the expandable list, the hover preview, and the edit dialog.
 * @param props - translator, the annotations, and the two mutations.
 * @returns the pill, or null when nothing is marked.
 */
export function AnnotationTray({
  t, annotations, onRemove, onEdit, onClear, openSignal, editRequest, onEditRequestHandled,
}: AnnotationTrayProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Annotation | undefined>(undefined)
  const [editAnchor, setEditAnchor] = useState<DOMRect | undefined>(undefined)

  /** Open the editor for one annotation, anchored under the badge that asked. */
  const setEditingAt = (annotation: Annotation | undefined, anchor?: DOMRect): void => {
    setEditing(annotation)
    setEditAnchor(anchor)
  }
  const pill = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [listStyle, setListStyle] = useState<CSSProperties | undefined>(undefined)

  // An inline badge in the transcript raises the tray; the counter is the
  // request, so repeated clicks re-open it even when it was already open.
  useEffect(() => {
    if (openSignal === 0) return
    setOpen(true)
  }, [openSignal])

  // A badge names the annotation to edit. The editor opens on its own, anchored to
  // the badge that was clicked, so the dialog appears where the reader pointed.
  useEffect(() => {
    if (editRequest === undefined) return
    const target = annotations.find(annotation => annotation.id === editRequest)
    if (target !== undefined) {
      const badge = document.querySelector<HTMLElement>(`[data-dsh-enhance-badge="${editRequest}"]`)
      setEditingAt(target, badge?.getBoundingClientRect())
    }
    onEditRequestHandled?.()
  }, [annotations, editRequest, onEditRequestHandled])

  /** Timer that tolerates the pointer crossing between the pill and the list. */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Cancel a pending close. */
  const keepOpen = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  /**
   * Close everything after a short grace period.
   *
   * The list is portalled to `<body>` and sits 6px away from the pill, so an
   * immediate close on the pill's `mouseleave` makes the list unreachable. The
   * delay is cancelled by any surface of this tray taking the pointer back.
   */
  const scheduleClose = useCallback(() => {
    keepOpen()
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setOpen(false)
      clearHighlight()
    }, 180)
  }, [keepOpen])

  /** Close everything now; any highlight this tray painted goes with it. */
  const dismissAll = useCallback(() => {
    keepOpen()
    setOpen(false)
    clearHighlight()
  }, [keepOpen])

  useEffect(() => () => { keepOpen() }, [keepOpen])

  // Place the list after it renders, in a layout effect so the very first paint
  // already carries coordinates. Measuring in a plain effect ran before the
  // portal mounted, which left the list with no position at all.
  useLayoutEffect(() => {
    if (!open) { setListStyle(undefined); return }
    const listElement = list.current
    const pillElement = pill.current
    if (listElement === null || pillElement === null) return
    const anchorRect = pillElement.getBoundingClientRect()
    const height = listElement.offsetHeight
    const width = listElement.offsetWidth
    const fitsAbove = anchorRect.top - GAP - height >= MARGIN
    const left = Math.min(Math.max(MARGIN, anchorRect.left), Math.max(MARGIN, window.innerWidth - width - MARGIN))
    setListStyle(fitsAbove
      ? { position: 'fixed', left: `${Math.round(left)}px`, bottom: `${Math.round(window.innerHeight - anchorRect.top + GAP)}px` }
      : { position: 'fixed', left: `${Math.round(left)}px`, top: `${Math.round(anchorRect.bottom + GAP)}px` })
  }, [open, annotations.length])

  // One pointer tracker owns the whole hover lifecycle: it opens the list when
  // the pointer reaches the pill and closes it when the pointer leaves the
  // pill/list region. Geometry is used instead of mouseenter/mouseleave because
  // the list is portalled under <body> — a synthetic enter on the pill does not
  // describe the region the reader actually moves through, and the 7px gap
  // between the two surfaces would close the list on the way.
  useEffect(() => {
    if (annotations.length === 0) return
    const inside = (element: HTMLElement | null, x: number, y: number): boolean => {
      if (element === null) return false
      const rect = element.getBoundingClientRect()
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    }
    const onMove = (event: Event): void => {
      if (!(event instanceof PointerEvent)) return
      const { clientX: x, clientY: y } = event
      const overPill = inside(pill.current, x, y)
      const overList = inside(list.current, x, y)
      if (overPill || overList) {
        keepOpen()
        setOpen(true)
        return
      }
      scheduleClose()
    }
    document.addEventListener('pointermove', onMove, true)
    return () => { document.removeEventListener('pointermove', onMove, true) }
  }, [annotations.length, keepOpen, scheduleClose])

  // Dismiss on an outside pointer or Escape. The listener runs on the document,
  // so clicking anywhere else — the composer, the transcript, another panel —
  // collapses the tray. That is the "focus moved away" gesture.
  useEffect(() => {
    if (!open && editing === undefined) return
    const onPointerDown = (event: Event): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (pill.current?.contains(target) === true) return
      if (list.current !== null && list.current.contains(target)) return
      if (target instanceof Element
        && target.closest('[data-dsh-enhance-popover], [data-dsh-enhance-edit]') !== null) return
      dismissAll()
      setEditing(undefined)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (editing !== undefined) { setEditing(undefined); return }
      dismissAll()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [dismissAll, editing, open])

  // Leaving the page clears the preview highlight with the component.
  useEffect(() => () => { clearHighlight() }, [])

  if (annotations.length === 0) return null

  return (
    <div className="dsh-enhance-tray" data-dsh-enhance-tray="">
      <div
        ref={pill}
        className="dsh-enhance-tray__pill"

      >
        <button
          type="button"
          className="dsh-enhance-tray__chip"
          aria-expanded={open}
          title={t('tray.hint')}
          onClick={() => { setOpen(value => !value) }}
        >
          <span className="dsh-enhance-tray__glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="13" height="13" focusable="false">
              <path
                d="M2.6 3.4h10.8v7.1H7.4L4.3 13v-2.5H2.6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="dsh-enhance-tray__label">{t('tray.count', { count: String(annotations.length) })}</span>
        </button>
        <span className="dsh-enhance-tray__divider" aria-hidden="true" />
        <button
          type="button"
          className="dsh-enhance-tray__clear"
          aria-label={t('tray.clearAll')}
          title={t('tray.clearAll')}
          onClick={() => { dismissAll(); onClear() }}
        >
          <TrashGlyph />
        </button>
      </div>
      {open && createPortal(
        <ul ref={list} className="dsh-enhance-tray__list" role="list" style={listStyle}>
          {annotations.map((annotation, index) => (
            <li key={annotation.id} className="dsh-enhance-tray__item">
              <button
                type="button"
                className="dsh-enhance-tray__row"
                aria-label={t('tray.reveal')}
                onMouseEnter={() => { highlightAnnotation(annotation) }}
                onMouseLeave={() => { clearHighlight() }}
                onClick={() => { revealAnnotation(annotation) }}
              >
                <span className="dsh-enhance-tray__index" aria-hidden="true">{index + 1}</span>
                <span className="dsh-enhance-tray__text">
                  <span className="dsh-enhance-tray__note">
                    {annotation.note.trim().length > 0 ? annotation.note : t('tray.noNote')}
                  </span>
                  <span className="dsh-enhance-tray__passage">{collapse(annotation.passage)}</span>
                </span>
              </button>
              <span className="dsh-enhance-tray__actions">
                <button
                  type="button"
                  className="dsh-enhance-tray__icon"
                  aria-label={t('tray.edit')}
                  title={t('tray.edit')}
                  onMouseEnter={() => { highlightAnnotation(annotation) }}
                  onClick={() => { setEditingAt(annotation) }}
                >
                  <PencilGlyph />
                </button>
                <button
                  type="button"
                  className="dsh-enhance-tray__icon"
                  aria-label={t('tray.remove')}
                  title={t('tray.remove')}
                  onClick={() => { onRemove(annotation.id) }}
                >
                  <TrashGlyph />
                </button>
              </span>
            </li>
          ))}
        </ul>,
        document.body,
      )}
      {editing !== undefined && (
        <AnnotationEditor
          t={t}
          annotation={editing}
          anchor={editAnchor}
          onCancel={() => { setEditingAt(undefined) }}
          onSave={(note) => {
            onEdit(editing.id, note)
            setEditingAt(undefined)
          }}
        />
      )}
    </div>
  )
}

/**
 * Editing dialog: rewrite the instruction attached to one passage.
 *
 * It is a small floating panel, not a modal: the reader is usually editing while
 * reading the passage behind it, so the header doubles as a drag handle and the
 * panel never blocks the page.
 */
function AnnotationEditor({ t, annotation, anchor, onCancel, onSave }: {
  readonly t: TranslateNS<'dshEnhance'>
  readonly annotation: Annotation
  /** Bounds of the badge that opened the editor, when a badge opened it. */
  readonly anchor: DOMRect | undefined
  readonly onCancel: () => void
  readonly onSave: (note: string) => void
}): ReactNode {
  const [value, setValue] = useState(annotation.note)
  const field = useRef<HTMLTextAreaElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined)

  // A drag moves the panel by the pointer delta from where the gesture started;
  // the offset is folded into the same fixed coordinates the initial placement
  // produced, so dragging can never leave the panel off screen.
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  useEffect(() => { field.current?.focus({ preventScroll: true }) }, [])

  // Placement mirrors the popover: anchor under the badge that opened the dialog,
  // flip above when the viewport has no room below, and clamp both axes.
  useLayoutEffect(() => {
    if (anchor === undefined) return
    const element = surface.current
    const width = element?.offsetWidth ?? 380
    const height = element?.offsetHeight ?? 150
    const left = Math.min(Math.max(MARGIN, anchor.left), Math.max(MARGIN, window.innerWidth - width - MARGIN))
    const below = anchor.bottom + GAP
    const top = below + height <= window.innerHeight - MARGIN ? below : Math.max(MARGIN, anchor.top - height - GAP)
    setStyle({ position: 'fixed', left: `${Math.round(left)}px`, top: `${Math.round(top)}px` })
  }, [anchor])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    const element = surface.current
    if (element === null) return
    const box = element.getBoundingClientRect()
    drag.current = { x: event.clientX, y: event.clientY, left: box.left, top: box.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    const state = drag.current
    if (state === null) return
    const element = surface.current
    const width = element?.offsetWidth ?? 380
    const height = element?.offsetHeight ?? 150
    const left = Math.min(
      Math.max(MARGIN, state.left + event.clientX - state.x),
      Math.max(MARGIN, window.innerWidth - width - MARGIN),
    )
    const top = Math.min(
      Math.max(MARGIN, state.top + event.clientY - state.y),
      Math.max(MARGIN, window.innerHeight - height - MARGIN),
    )
    setStyle({ position: 'fixed', left: `${Math.round(left)}px`, top: `${Math.round(top)}px` })
  }, [])

  const endDrag = useCallback((): void => { drag.current = null }, [])

  return createPortal(
    <div
      ref={surface}
      className={anchor === undefined ? 'dsh-enhance-edit' : 'dsh-enhance-edit dsh-enhance-edit--anchored'}
      data-dsh-enhance-edit=""
      role="dialog"
      aria-label={t('tray.edit')}
      style={style}
    >
      {/* The quoted passage is the header: it says what is being edited, and it is
          still the drag surface, so the panel can be moved off the words without a
          separate grip bar taking up a row. */}
      <div
        className="dsh-enhance-edit__head"
        title={annotation.passage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="dsh-enhance-edit__label">{collapse(annotation.passage)}</span>
      </div>
      <div className="dsh-enhance-edit__body">
        <textarea
          ref={field}
          className="dsh-enhance-edit__field"
          value={value}
          rows={3}
          placeholder={t('toolbar.placeholder')}
          aria-label={t('toolbar.placeholder')}
          onChange={(event) => { setValue(event.currentTarget.value) }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              onSave(value.trim())
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
        />
        {/* One action. Escape and a click outside already cancel, so a Cancel button
            was a third way to do the same thing; the confirmation is a check mark. */}
        <button
          type="button"
          className="dsh-enhance-edit__confirm"
          aria-label={t('tray.save')}
          title={t('tray.save')}
          onClick={() => { onSave(value.trim()) }}
        >
          <CheckGlyph />
        </button>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Flatten a passage for one line in the list.
 * @param text - the annotation passage.
 * @returns flattened, truncated text.
 */
function collapse(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 119)}…` : flat
}

/** Check glyph: the single confirm action of the editor. */
function CheckGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M3.6 8.5 6.4 11.2 12.5 4.9"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

/** Pencil glyph. */
function PencilGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M11.1 2.6 13.4 4.9 5.6 12.7 2.6 13.4 3.3 10.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Trash glyph. */
function TrashGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.8 4.6l.6 8.2h5.2l.6-8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
