/**
 * Mount point for the annotation tray and its popover.
 *
 * Registered into the composer's overlay anchor, so it reads the composer's own
 * `inputActions`/`useInput` from the slot's standard props without reaching into
 * the Conversation package at runtime (a feature plugin cannot value-import it).
 * Two things render from here:
 *
 * - the annotation pill, laid over the card's own top edge so it reads as part
 *   of the input frame rather than as a separate dock row;
 * - the annotation popover, portalled to `document.body` and positioned from
 *   the live text selection.
 *
 * Annotations ride the message without a second confirmation step: the seat
 * watches this composer for a send (click or Enter) and folds the marked
 * passages into the outgoing text at that moment, then clears them. That keeps
 * the composer clean while the reader writes and matches the gesture they
 * already know.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SelectionToolbar, type AnnotationSubmit } from './SelectionToolbar.tsx'
import {
  addAnnotation, annotationsOf, annotationsPrompt, annotationsVisibleIn, clearAnnotations,
  removeAnnotation, subscribeAnnotations, updateAnnotationNote, type Annotation,
  type AnnotationAnchor,
} from './annotations.ts'
import { anchorForRange, clearMarks, mountBadges, paintMarks, removeBadges } from './anchors.ts'
import { AnnotationTray } from './AnnotationTray.tsx'

/** Owner face the composer seat is registered with. */
export interface AnnotationSeatInjected {
  /**
   * Open a side conversation seeded with one passage.
   * @param passage - the marked passage.
   * @returns completion once the tab carries the conversation.
   */
  readonly askInSideChat: (
    passage: string,
    note?: string,
    sourceSessionId?: string,
    anchor?: AnnotationAnchor,
  ) => Promise<void>
}

/** Props of the whole composer seat. */
type AnnotationSeatProps = PropsRuntime<'conversation.input.overlay'>
  & PropsLocale<'dshEnhance'>
  & AnnotationSeatInjected

/**
 * Render the annotation tray and the annotation popover for one Session.
 * @param props - dock shares, translator, and the side-chat operation.
 * @returns the tray plus the popover portal.
 */
export function AnnotationSeat(props: AnnotationSeatProps): ReactNode {
  const { sessionId, inputActions, useInput, t, askInSideChat } = props
  const draft = useInput(state => state.draft) as string
  const annotations = useSyncExternalStore(
    subscribeAnnotations,
    () => annotationsOf(sessionId),
    () => annotationsOf(sessionId),
  )
  // Anchor for surface decisions. The tray only renders once something is
  // annotated, so the anchor is the seat's own root — always mounted.
  const root = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>
  const [openSignal, setOpenSignal] = useState(0)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  // Whether this seat speaks for the main conversation.
  //
  // A Sidebar chat mounts the same seat, so the answer must come from a fact that
  // survives reloads: the annotation belongs to the main composer unless this
  // seat sits inside a side-chat surface. The check runs at gesture time, so it
  // tracks the seat's real position instead of a snapshot taken at mount.
  const isMainSurface = useMainSurface(root)

  /**
   * Store one confirmed annotation in this seat's own Session.
   *
   * Only the seat whose composer produced the selection records it; the other
   * mounted seats stay out of the way (see the popover gate below).
   */
  // Keep the transcript marked for as long as this Session has annotations, so
  // the reader can see which passages the next message will quote. The marks are
  // repainted whenever the list changes and whenever the transcript repaints
  // (a fold, a paged-in Turn, a switch back to this conversation).
  useEffect(() => {
    // A badge opens that annotation's editor only. Raising the list as well put
    // two surfaces on screen for one gesture, and the list is the pill's job.
    const onClick = (id: string): void => {
      setEditingId(id)
    }
    /** Repaint marks and badges; idempotent, so calling it twice costs nothing. */
    const repaint = (): void => {
      // Marks follow the transcript being displayed, not the owning composer:
      // a passage quoted into a side chat still lives in this conversation.
      const pinned = annotationsVisibleIn(sessionId)
      paintMarks(sessionId, pinned)
      mountBadges(pinned, onClick)
    }
    repaint()
    // Observe the whole document rather than one transcript element.
    //
    // The transcript is not necessarily rendered when this effect runs — a side
    // chat tab mounts before its conversation loads, and a resolved-at-mount node
    // would either be missing or be the main column's, which is why a sidebar
    // annotation only appeared after scrolling forced a repaint. Watching the
    // document and re-running the (idempotent) repaint covers rows appearing,
    // folding, paging, and markers landing in whichever transcript is on screen.
    const scope = root.current?.ownerDocument
    if (scope === null || scope === undefined) return () => { clearMarks(sessionId) }

    // The observer must never react to this plugin's own DOM writes: mounting a
    // badge inserts a node and splits a text node, which the observer sees, and
    // re-entering the mount from its own callback froze the whole page. Records
    // that are only this plugin's badges are therefore skipped, and the repaint
    // runs in a microtask so a burst of React updates costs one pass.
    let queued = false
    const isOwnMutation = (record: MutationRecord): boolean => {
      const touch = [...record.addedNodes, ...record.removedNodes]
      return touch.length > 0 && touch.every((node) => {
        if (!(node instanceof Element)) return false
        return node.matches('[data-dsh-enhance-badge], [data-dsh-enhance-badge-anchor]')
          || node.querySelector('[data-dsh-enhance-badge]') !== null
      })
    }
    const observer = new MutationObserver((records) => {
      if (records.every(isOwnMutation)) return
      if (queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        repaint()
      })
    })
    observer.observe(scope, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      removeBadges()
      clearMarks(sessionId)
    }
  }, [annotations, sessionId])

  const annotate = useMemo(
    () => ({ passage, note, anchor, sourceSessionId }: AnnotationSubmit): void => {
      // The seat that produced the gesture names both halves: the Session that
      // will send the note, and the transcript the words came from.
      addAnnotation(sessionId, passage, note, anchor, sourceSessionId ?? sessionId)
    },
    [sessionId],
  )

  // Fold the annotations into the message at send time, not before: the draft
  // stays exactly what the reader typed, and the passages travel with whatever
  // they send. Capture phase, so this runs before the composer's own handlers.
  useEffect(() => {
    if (annotations.length === 0) return
    const card = root.current?.closest('[data-composer-card]')
    if (card === null || card === undefined) return
    const carry = (): void => {
      const text = `${annotationsPrompt(annotations)}\n\n`
      // Insert at the caret so reference chips and later edits survive; fall
      // back to appending when the captured revision no longer matches.
      const insertion = inputActions.captureInsertion()
      if (!inputActions.insertText(text, insertion)) {
        inputActions.setDraft(`${draft}${draft === '' ? '' : '\n\n'}${text}`)
        inputActions.persistDraft()
      }
      clearAnnotations(sessionId)
    }
    const onPointer = (event: Event): void => {
      const target = event.target
      if (target instanceof Element && target.closest('[class*="_primary"]') !== null) carry()
    }
    const onKey = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) return
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
      const target = event.target
      if (target instanceof Element && target.closest('[contenteditable="true"]') !== null) carry()
    }
    card.addEventListener('click', onPointer, true)
    card.addEventListener('keydown', onKey, true)
    return () => {
      card.removeEventListener('click', onPointer, true)
      card.removeEventListener('keydown', onKey, true)
    }
  }, [annotations, draft, inputActions, sessionId])

  return (
    <div ref={root} className="dsh-enhance-seat" data-dsh-enhance-seat="">
      <AnnotationTray
        t={t}
        annotations={annotations}
        onRemove={id => { removeAnnotation(sessionId, id) }}
        onEdit={(id, note) => { updateAnnotationNote(sessionId, id, note) }}
        onClear={() => { clearAnnotations(sessionId) }}
        openSignal={openSignal}
        editRequest={editingId}
        onEditRequestHandled={() => { setEditingId(undefined) }}
      />
      <SelectionToolbar
        t={t}
        sourceSessionId={sessionId}
        ownsSelection={isMainSurface}
        onAnnotate={annotate}
        askInSideChat={askInSideChat}
        notify={message => console.warn(`[dsh-enhance] ${message}`)}
      />
    </div>
  )
}

/**
 * Build a predicate that reports whether this seat's composer is the main one.
 *
 * Two markers answer it: this plugin's own side-chat surface and the subagent
 * chat tab's `data-sidebar-chat`. Both are rendered by the tab bodies, so a
 * restored tab reports the same answer as a freshly opened one — an in-memory
 * registry would forget every conversation after a reload.
 * @param root - the seat's root element, mounted inside this composer.
 * @returns predicate consulted for each gesture.
 */
function useMainSurface(root: RefObject<HTMLDivElement>): () => boolean {
  return useCallback(() => {
    const element = root.current
    if (element === null) return false
    return element.closest('[data-sidebar-chat], [data-dsh-enhance-side-chat]') === null
  }, [root])
}
