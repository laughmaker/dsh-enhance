/**
 * The display form of a sent annotation entry.
 *
 * One entry is a two-column grid: the entry number sits in a column exactly as
 * wide as the number itself, and the quoted label, the passage and (below them)
 * the reader's own comment share the second column — so the passage always
 * starts at the same x as the "quoted" label, whether the entry is number 1 or
 * 12. The comment spans both columns. It paints inside the message bubble it
 * arrived in — no card, no fill, nothing that competes with the bubble. Groups
 * are tight; the blank line the writer puts between entries is what separates
 * them.
 *
 * Labels use literal colours rather than a single theme token: blue reads as
 * "this is the quoted passage", purple as "this is what I said about it", and
 * both stay legible over the light and dark bubble. The label colours are
 * opaque, because the label is small text and has to clear the 4.5:1 contrast
 * floor on both bubble colours.
 */
export const css = String.raw`/* The whole entry. A two-column grid: the number takes a max-content column, the
   quoted label and passage share the second column, and the comment spans both.
   Block level so it starts on its own line inside the bubble. */
.dsh-enhance-anno {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 6px;
  row-gap: 2px;
  align-items: baseline;
  margin: 6px 0 4px;
  padding: 0;
  font: inherit;
  line-height: 1.55;
}

/* The head dissolves into the grid: its number lands in column 1 and the quoted
   label in column 2, on one shared baseline row. */
.dsh-enhance-anno__head {
  display: contents;
}

.dsh-enhance-anno__number {
  grid-column: 1;
  grid-row: 1;
  color: var(--dsw-alias-label-caption);
  font-size: .85em;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.dsh-enhance-anno__label {
  font-size: .8125em;
  font-weight: 600;
  letter-spacing: .01em;
  line-height: 1.4;
}

/* Saturated blue: the quoted passage. Opaque, so the small label still reads
   against the light bubble (5.7:1 on the #ECECEC bubble). */
.dsh-enhance-anno__label--quote {
  grid-column: 2;
  grid-row: 1;
  color: #1d4ed8;
}

/* Saturated purple: the reader's own comment, on its own line above it.
   Opaque too, for the same reason (6.0:1 on the light bubble). */
.dsh-enhance-anno__label--comment {
  display: block;
  margin: 5px 0 2px;
  color: #6d28d9;
}

/* Dark bubbles keep the light blue and light purple, opaque so the label
   stays legible there as well (5.7:1 and 5.3:1 on a #2A2A2A bubble). */
body[data-ds-dark-theme] .dsh-enhance-anno__label--quote {
  color: #60a5fa;
}

body[data-ds-dark-theme] .dsh-enhance-anno__label--comment {
  color: #a78bfa;
}

/* Empty cell under the entry number. It stretches to the passage's height so the
   vertical rule runs the length of the quote, while staying in the number
   column (the "hanging indent" guide) rather than at the text's left edge. */
.dsh-enhance-anno__gutter {
  grid-column: 1;
  grid-row: 2;
  position: relative;
  align-self: stretch;
}

/* The hairline: 2px wide, its centre ~3.9px from the entry's left edge — the
   centre of the first (tabular) digit of the number, so single- and multi-digit
   entries share one vertical guide line however wide the number column is. */
.dsh-enhance-anno__gutter::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  background: rgb(37 99 235 / 30%);
}

body[data-ds-dark-theme] .dsh-enhance-anno__gutter::before {
  background: rgb(96 165 250 / 38%);
}

/* The passage: secondary body colour, on the shared text column so it lines up
   with the "quoted" label. pre-wrap keeps the passage's own line breaks (and any
   blank line inside it). */
.dsh-enhance-anno__quote {
  grid-column: 2;
  grid-row: 2;
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
}

/* The comment spans both columns, so it starts at the entry's left edge. */
.dsh-enhance-anno__comment-block {
  grid-column: 1 / -1;
  display: block;
  margin: 0;
}

.dsh-enhance-anno__comment {
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-primary);
}
`
