/**
 * The display form of a sent annotation entry.
 *
 * One entry is one compact group: its number and a small "quoted" label, the
 * passage under a hairline rule in the secondary text colour, then the reader's
 * own comment under a "my note" label in the normal foreground. It paints inside
 * the message bubble it arrived in — no card, no fill, nothing that competes with
 * the bubble. Groups are tight; the blank line the writer puts between entries is
 * what separates them.
 *
 * Labels use literal colours rather than a single theme token: blue reads as
 * "this is the quoted passage", purple as "this is what I said about it", and
 * both stay legible over the light and dark bubble. The label colours are
 * opaque, because the label is small text and has to clear the 4.5:1 contrast
 * floor on both bubble colours.
 */
export const css = String.raw`/* The whole entry. Block level so it starts on its own line inside the bubble,
   and small vertical margins so consecutive entries breathe without a gap. */
.dsh-enhance-anno {
  display: block;
  margin: 6px 0 4px;
  padding: 0;
  font: inherit;
  line-height: 1.55;
}

/* Number and the "quoted" label share one baseline row. */
.dsh-enhance-anno__head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 0 2px;
  line-height: 1.4;
}

.dsh-enhance-anno__number {
  color: var(--dsw-alias-label-caption);
  font-size: .85em;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
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

/* The passage: secondary body colour, hung off a thin vertical rule. pre-wrap
   keeps the passage's own line breaks (and any blank line inside it). The rule
   is drawn as a pseudo-element so it can sit centred under the entry number's
   digit (not its trailing dot), like an outline indent guide; padding keeps the
   text inset exactly as the old border-left did (12px from the quote's edge). */
.dsh-enhance-anno__quote {
  position: relative;
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding-left: 12px;
  color: var(--dsw-alias-label-secondary);
}

/* The hairline itself: 2px wide, its centre ~3.9px from the quote's left edge —
   the centre of the first (tabular) digit of the entry number, so single- and
   double-digit entries share one vertical guide line. */
.dsh-enhance-anno__quote::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  background: rgb(37 99 235 / 30%);
}

body[data-ds-dark-theme] .dsh-enhance-anno__quote::before {
  background: rgb(96 165 250 / 38%);
}

/* The comment block keeps normal foreground weight and colour. */
.dsh-enhance-anno__comment-block {
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
