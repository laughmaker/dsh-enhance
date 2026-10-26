/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`:is([data-ds-dark-theme], [data-ds-dark-theme] body) :is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) {
  --md-text: #efefef;
  --md-text-strong: #fff;
  --md-text-muted: #a5a5a5;
  --md-border: rgb(255 255 255 / 11%);
  --md-border-strong: rgb(255 255 255 / 19%);
  --md-accent: #8ab4ff;
  --md-accent-soft: rgb(138 180 255 / 12%);
  --md-heading-1: rgb(231 77 71);
  --md-heading-2: rgb(215 148 64);
  --md-heading-3: rgb(7 170 246);
  --md-heading-4: rgb(163 110 251);
  --md-heading-5: rgb(109 215 215);
  --md-heading-6: rgb(175 191 5);
  --md-code-bg: #0c0c0c;
  --md-code-text: #d9e5ff;
  --md-table-bg: #161616;
  --md-table-head-bg: #222;
  --md-radius-sm: 6px;
  --md-radius-md: 10px;
}

:where(html:not([data-ds-dark-theme]), body:not([data-ds-dark-theme])) :is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) {
  --md-text: #242424;
  --md-text-strong: #111;
  --md-text-muted: #5f6368;
  --md-border: rgb(0 0 0 / 12%);
  --md-border-strong: rgb(0 0 0 / 20%);
  --md-accent: #0969da;
  --md-accent-soft: rgb(9 105 218 / 8%);
  --md-heading-1: #c9372c;
  --md-heading-2: #9a5700;
  --md-heading-3: #006b9f;
  --md-heading-4: #7047a8;
  --md-heading-5: #147879;
  --md-heading-6: #626c00;
  --md-code-bg: #f6f8fa;
  --md-code-text: #244a7c;
  --md-table-bg: #fff;
  --md-table-head-bg: #f1f3f5;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) [data-slot="conversation.chat.node"] > div > div > div:has(> :is(p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, hr)) {
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}

/* The sidebar renderer is the Markdown container itself rather than a conversation
   row, so the rule above (which walks to the node wrapper) never reaches it. The
   body text is set on the container directly. */
[class*="_markdown"] {
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}

/* Thinking disclosures wrap a div rather than markdown children, so they miss
   the rule above, and their label carries its own 11px declaration. Match them
   on the stable data-variant hook instead of the hashed CSS-module class, and
   lift the label to 12px so the whole centre column shifts by the same +1. */
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) [data-variant="think"] {
  font-size: 12px !important;
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) [data-variant="think"] :is([class*="_text"], [class*="_title"]) {
  font-size: 12px !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) :is(h1, h2, h3, h4, h5, h6) {
  padding-bottom: .35em;
  border-bottom: 1px solid var(--md-border);
  line-height: 1.3 !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h1 {
  margin: 1.45em 0 .65em !important;
  padding-bottom: .4em;
  border-bottom-color: var(--md-border-strong);
  color: var(--md-heading-1) !important;
  font-size: 1.8rem !important;
  font-weight: 750 !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h2 {
  margin: 1.5em 0 .6em !important;
  color: var(--md-heading-2) !important;
  font-size: 1.4rem !important;
  font-weight: 720 !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h3 {
  margin: 1.35em 0 .5em !important;
  border-bottom: 0;
  color: var(--md-heading-3) !important;
  font-size: 1.15rem !important;
  font-weight: 700 !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h4,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h5,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h6 {
  margin: 1.15em 0 .4em !important;
  border-bottom: 0;
  font-weight: 680 !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h4 { color: var(--md-heading-4) !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h5 { color: var(--md-heading-5) !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) h6 { color: var(--md-heading-6) !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) :is(h1, h2, h3, h4, h5, h6) strong { color: inherit !important; font-weight: inherit !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) p { margin: 0 0 1em !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) strong { color: var(--md-heading-1) !important; font-weight: 750 !important; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) a,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) .fileLink { color: var(--md-accent) !important; text-decoration: none; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) a:hover,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) a:focus,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) .fileLink:hover,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) .fileLink:focus { text-decoration: underline; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) :is(ul, ol) { margin: 1em 0 !important; padding-left: 1.55em; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) li { margin: .38em 0; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) li::marker { color: var(--md-accent); font-weight: 700; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) blockquote {
  margin: 1.1em 0 !important;
  padding: .75em 16px;
  border-left: 1.5px solid var(--md-accent);
  border-radius: 0 var(--md-radius-sm) var(--md-radius-sm) 0;
  background: var(--md-accent-soft);
  color: var(--md-text-muted) !important;
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) .tableScroll { width: 100%; margin: 1.2em 0; }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) table {
  width: 100% !important;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  border-spacing: 0;
  background: var(--md-table-bg);
  table-layout: auto;
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) thead { background: var(--md-table-head-bg); }
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) th,
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) td {
  padding: .65em .8em !important;
  border-right: 1px solid var(--md-border);
  border-bottom: 1px solid var(--md-border);
  text-align: left;
  vertical-align: middle;
  white-space: normal;
  overflow-wrap: anywhere;
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) th { color: var(--md-text-strong); font-weight: 720; }
/* Fenced code blocks.
 *
 * The app marks every fence with the stable md-code-block class, which is what this
 * hangs on: the previous rules guessed the nesting with :has() and, inside a side
 * chat, matched an ancestor instead of the block, so the card there kept its own
 * 16px radius, a 42px banner and a second frame around the code.
 *
 * Structure inside the block: banner wrapper, header row, content box, pre. Only the
 * block itself may draw a frame; the surfaces inside it contribute fill and radii
 * from the app's tokens and would otherwise read as nested panels.
 */
.md-code-block {
  margin: 1.15em 0 !important;
  border: 1px solid var(--md-border, rgb(0 0 0 / 12%)) !important;
  border-radius: 10px !important;
  background: var(--md-code-bg, #f6f8fa) !important;
  overflow: hidden !important;
}

/* The banner wrapper and the content box: no frame, no radius, no fill of their own. */
.md-code-block > div,
.md-code-block > div > div:not(:has(pre)) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
}

/* The header row takes the card fill and is separated by a rule, so the banner reads
   as part of one surface. It is also tightened: the app pads it 10px/8px around an
   18px line, which is a 42px cap over a two-line block. */
.md-code-block > div > div:has(.md-code-block-copy),
.md-code-block > div > div:has(button) {
  padding: 4px 10px !important;
  min-height: 0 !important;
  background: var(--md-code-bg, #f6f8fa) !important;
  border: 0 !important;
  border-bottom: 1px solid var(--md-border, rgb(0 0 0 / 12%)) !important;
  border-radius: 0 !important;
}

.md-code-block pre {
  margin: 0 !important;
  padding: 14px 16px !important;
  overflow-x: auto;
  border: 0 !important;
  border-radius: 0 !important;
  background: var(--md-code-bg, #f6f8fa) !important;
}

:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) pre code {
  background: none;
  border: 0;
  padding: 0;
  color: var(--md-code-text);
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) :not(pre) > code {
  padding: .16em .4em;
  border: 1px solid var(--md-border);
  border-radius: 5px;
  background: var(--md-code-bg);
  color: var(--md-code-text);
  font-size: .9em !important;
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) hr {
  height: 1px;
  margin: 1.8em 0;
  border: 0;
  background: var(--md-border-strong);
}
:is([data-chat-flow-kind="assistant-step"], [class*="_markdown"]) img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.1em auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
}
`
