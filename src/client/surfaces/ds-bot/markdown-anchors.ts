/**
 * DS Bot's own bubble CSS outranks the shared markdown sheet:
 *   .bt-bubble [class*="_markdown"] { color/font-size/line-height: inherit !important }
 *   .bt-bubble p { margin: 0 }
 *   .bt-bubble [class*="_markdown"] li::marker { color: var(--bt-ink-2) }
 *
 * The first rule carries !important at (0,2,0), while the shared sheet states
 * its measure at (0,1,0) on `[class*="_markdown"]`, so the host wins and the
 * body inherits the bubble's 14px. Restate the same declarations under a
 * three-anchor selector (0,3,0) plus a node-free fallback, so they win on
 * specificity rather than on load order. Only the measured declarations are
 * repeated; every other markdown rule stays on the shared sheet.
 */
const bubble = '.bt-bubble'
const md = `[data-slot="conversation.chat.node"] ${bubble} [class*="_markdown"]`
const fallback = `${bubble} [class*="_markdown"][class*="_markdown"]`

/** The DS Bot anchor overlay. Not mounted on DeepSeek Harness. */
export const css = `${md},
${fallback} {
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}
${md} p,
${fallback} p {
  margin: 0 0 1em !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
}
${md} li::marker,
${fallback} li::marker {
  color: var(--md-accent) !important;
  font-weight: 700 !important;
}
`
