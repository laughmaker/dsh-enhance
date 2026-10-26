/**
 * Annotation model for one Session: passages the reader marked in the
 * transcript, each with the instruction they wrote for it.
 *
 * Annotations are browser-local and ephemeral, matching the reading gesture —
 * they exist while the draft they belong to exists. They are rendered into the
 * outgoing message as a fenced block so the model receives the passage and the
 * instruction together, and so the transcript keeps a readable record of what
 * was asked about.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** One marked passage and the instruction attached to it. */
export interface Annotation {
  /** Stable identity within the Session's list. */
  readonly id: string
  /** The quoted passage, normalized to single internal whitespace runs. */
  readonly passage: string
  /** What the reader wants done about it; empty when they confirmed without a note. */
  readonly note: string
  /**
   * Transcript anchor the passage came from: the row key plus the passage's
   * character range inside that row. Together they re-find the passage after the
   * list reopens, so a row click can scroll back to the words it quotes.
   */
  readonly anchor?: AnnotationAnchor
  /**
   * Session whose transcript holds the quoted passage.
   *
   * It is not always the Session that owns the annotation: `Ask in side chat`
   * files the passage under the sidebar conversation while the words stay in the
   * main one. Marks and badges follow this field, so the transcript the reader
   * selected from is the one that shows the pin.
   */
  readonly sourceSessionId?: string
}

/** Where a marked passage sits in the transcript. */
export interface AnnotationAnchor {
  /** The row's `data-chat-flow-key`. */
  readonly flowKey: string
  /**
   * Character offset of the passage start, counted over the row's text content.
   *
   * Offsets are used instead of a text-node index because the DOM is not stable:
   * this plugin inserts badges (which split text nodes) and React re-renders the
   * row. A node index shifts under both, while the row's concatenated text keeps
   * the same characters.
   */
  readonly offset: number
  /** Character length of the passage. */
  readonly length: number
}

/** Session id → its ordered annotations. */
const store = new Map<string, readonly Annotation[]>()

/** Identity counter per Session, so ids never repeat within a list. */
const counters = new Map<string, number>()

/** Listeners notified whenever any Session's list changes. */
const listeners = new Set<() => void>()

/** Cached read-only snapshots, so React sees a stable reference between changes. */
const snapshots = new Map<string, readonly Annotation[]>()

/** The empty list shared by every Session without annotations. */
const EMPTY: readonly Annotation[] = Object.freeze([])

/**
 * Publish a change to every listener.
 */
function publish(): void {
  for (const listener of listeners) listener()
}

/**
 * Rebuild one Session's published snapshot.
 * @param sessionId - the Session whose list changed.
 */
function refresh(sessionId: string): void {
  const next = store.get(sessionId)
  if (next === undefined || next.length === 0) snapshots.delete(sessionId)
  else snapshots.set(sessionId, Object.freeze([...next]))
}

/**
 * Read one Session's annotations.
 * @param sessionId - the Session to read.
 * @returns a stable snapshot, empty when nothing is marked.
 */
export function annotationsOf(sessionId: string): readonly Annotation[] {
  return snapshots.get(sessionId) ?? EMPTY
}

/**
 * Subscribe to annotation changes.
 * @param listener - called after every change.
 * @returns disposer.
 */
export function subscribeAnnotations(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * Add one annotation to the end of a Session's list.
 * @param sessionId - the Session that owns it.
 * @param passage - the marked passage.
 * @param note - the instruction the reader wrote, possibly empty.
 * @returns the stored annotation.
 */
export function addAnnotation(
  sessionId: string,
  passage: string,
  note: string,
  anchor?: AnnotationAnchor,
  sourceSessionId?: string,
): Annotation {
  const counter = (counters.get(sessionId) ?? 0) + 1
  counters.set(sessionId, counter)
  const annotation: Annotation = {
    id: `annotation-${counter}`,
    passage,
    note,
    ...anchor === undefined ? {} : { anchor },
    ...sourceSessionId === undefined ? {} : { sourceSessionId },
  }
  store.set(sessionId, [...(store.get(sessionId) ?? []), annotation])
  refresh(sessionId)
  publish()
  return annotation
}

/**
 * Remove one annotation.
 * @param sessionId - the Session that owns it.
 * @param id - annotation identity.
 */
export function removeAnnotation(sessionId: string, id: string): void {
  const current = store.get(sessionId)
  if (current === undefined) return
  const next = current.filter(annotation => annotation.id !== id)
  if (next.length === current.length) return
  store.set(sessionId, next)
  refresh(sessionId)
  publish()
}

/**
 * Replace one annotation's instruction.
 * @param sessionId - the Session that owns it.
 * @param id - annotation identity.
 * @param note - the new instruction; empty clears it.
 * @returns whether the list changed.
 */
export function updateAnnotationNote(sessionId: string, id: string, note: string): boolean {
  const current = store.get(sessionId)
  if (current === undefined) return false
  const index = current.findIndex(annotation => annotation.id === id)
  if (index < 0) return false
  if (current[index]!.note === note) return false
  const next = [...current]
  next[index] = { ...current[index]!, note }
  store.set(sessionId, next)
  refresh(sessionId)
  publish()
  return true
}

/**
 * Drop every annotation for one Session.
 * @param sessionId - the Session to clear.
 */
export function clearAnnotations(sessionId: string): void {
  if (!store.has(sessionId)) return
  store.delete(sessionId)
  refresh(sessionId)
  publish()
}

/**
 * Drop annotations for a Session that is no longer on screen.
 * @param keep - the Session still mounted, if any.
 */
export function retainOnly(keep: SessionId | string | undefined): void {
  let changed = false
  for (const sessionId of [...store.keys()]) {
    if (sessionId === keep) continue
    store.delete(sessionId)
    snapshots.delete(sessionId)
    changed = true
  }
  if (changed) publish()
}

/**
 * Render one annotation as the compact reference the composer carries.
 *
 * The composer is a reading surface, not a document: a whole annotation block
 * dumped into it buries what the reader was writing. One line per annotation
 * keeps the draft readable while still carrying both halves the model needs.
 * @param annotation - the annotation to render.
 * @returns one line of message text.
 */
export function annotationLine(annotation: Annotation): string {
  const passage = annotation.passage.replace(/\s+/g, ' ').trim()
  const quoted = passage.length > 140 ? `${passage.slice(0, 139)}…` : passage
  const note = annotation.note.trim()
  return note.length === 0 ? `"${quoted}"` : `"${quoted}" — ${note}`
}

/**
 * Render the marked passages as the preamble of an outgoing message.
 *
 * The block lists what the instructions refer to, then leaves the reader's own
 * words as the body of the message underneath.
 * @param annotations - the annotations being sent.
 * @returns message text, or an empty string when there are none.
 */
export function annotationsPrompt(annotations: readonly Annotation[]): string {
  if (annotations.length === 0) return ''
  const lines = annotations.map(annotation => `- ${annotationLine(annotation)}`)
  return `Regarding these passages:\n${lines.join('\n')}`
}

/**
 * Short tab/tooltip label for one annotation.
 * @param annotation - the annotation.
 * @returns the note when present, otherwise a trimmed passage.
 */
export function annotationLabel(annotation: Annotation): string {
  const note = annotation.note.trim()
  if (note.length > 0) return note.length > 48 ? `${note.slice(0, 47)}…` : note
  const passage = annotation.passage.replace(/\s+/g, ' ').trim()
  return passage.length > 48 ? `${passage.slice(0, 47)}…` : passage
}

/**
 * Annotations whose passage is rendered in one Session's transcript.
 *
 * An annotation is listed under the composer it will be sent from, but its mark
 * belongs where the words are. `Ask in side chat` is the case that separates the
 * two: the passage is quoted from the main conversation but filed under the side
 * conversation, so the main transcript would show no pin without this lookup.
 * @param sessionId - the Session whose transcript is being marked.
 * @returns that transcript's annotated passages, across every owner.
 */
export function annotationsVisibleIn(sessionId: string): readonly Annotation[] {
  const visible: Annotation[] = []
  for (const [, list] of store) {
    for (const annotation of list) {
      if (annotation.anchor === undefined) continue
      if ((annotation.sourceSessionId ?? '') !== sessionId) continue
      visible.push(annotation)
    }
  }
  return visible.length === 0 ? EMPTY : visible
}
