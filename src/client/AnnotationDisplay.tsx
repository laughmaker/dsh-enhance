/**
 * Paint one sent annotation entry inside the transcript.
 *
 * The message on the wire is untouched: the model still receives the numbered
 * `Selected text:` / `User comment:` text and copying the message still yields
 * it, because the copy reads the message content, not this DOM. This component
 * only draws the shape `annotation-display.ts` recognised — a number and a small
 * label, the passage under a hairline rule, then the reader's own comment — so a
 * long answer stops reading as one wall of wire text. It stays inside the
 * message bubble: no card, no fill.
 */
import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { AnnotationNodeData } from './annotation-display.ts'
import { LOCALE_NS } from './locales.ts'

/** Props the host hands a `conversation.user.text.node` renderer, plus our translator. */
export interface AnnotationDisplayProps {
  /** The node the display rule emitted. */
  readonly node: { readonly id: string; readonly data: AnnotationNodeData }
  /** The raw slice the node covers; unused, the parsed fields are enough. */
  readonly raw: string
  /** Whether the transcript is interactive; the block adds no controls. */
  readonly interactive: boolean
  /** Translator bound to this plugin's namespace. */
  readonly t: TranslateNS<typeof LOCALE_NS>
}

/**
 * Render one annotation entry.
 * @param props - the node and the translator.
 * @returns the labelled group.
 */
export function AnnotationDisplay(props: AnnotationDisplayProps): ReactNode {
  const { number, quote, comment } = props.node.data
  const t = props.t
  return (
    <span className="dsh-enhance-anno">
      <span className="dsh-enhance-anno__head">
        <span className="dsh-enhance-anno__number">{`${number}.`}</span>
        <span className="dsh-enhance-anno__label dsh-enhance-anno__label--quote">{t('anno.quote')}</span>
      </span>
      {/* Empty cell in the number column; it paints the vertical rule so the rule
          stays under the digit while the quote sits on the shared text column. */}
      <span className="dsh-enhance-anno__gutter" aria-hidden="true" />
      <span className="dsh-enhance-anno__quote">{quote.join('\n')}</span>
      {comment === undefined ? null : (
        <span className="dsh-enhance-anno__comment-block">
          <span className="dsh-enhance-anno__label dsh-enhance-anno__label--comment">{t('anno.comment')}</span>
          <span className="dsh-enhance-anno__comment">{comment.join('\n')}</span>
        </span>
      )}
    </span>
  )
}
