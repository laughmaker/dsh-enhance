/** DS Bot-only chrome. Shared Markdown and annotation sheets are unchanged.
 * The desktop preload sets data-windows-titlebar, caption height 40px and
 * --dsh-frame-chrome-top:0px: the viewport reaches the native window top.
 * material.css pads the chat column by the caption height; remove that padding
 * so the host's absolute header can keep its horizontal layout at top:20px.
 */
const CORNER_ROW = ':is(.bt-pane, .bt-panel) .bt-drawer-top'
const PILL_HEADER = 'header[class*="_header"]:has(.bt-head)'

export const css = `
/* Keep user messages on the current theme's surface instead of an inverted
   black/white slab. Theme inks retain readable text and adapt to custom themes. */
body {
  --bt-user: color-mix(in srgb, var(--bt-ink) 7%, var(--bt-main)) !important;
  --bt-user-ink: var(--bt-ink) !important;
}
body[data-ds-dark-theme] {
  --bt-user: color-mix(in srgb, var(--bt-ink) 12%, var(--bt-main)) !important;
}

/* Shift the entire sidebar stack, including the list, with its action row.
   The native traffic-light/sidebar switch belongs to another shell element.
   The row sits in the 40px caption band: its buttons are 30px, starting at
   5px so their centre (20px) lines up with the 14px traffic lights. */
.bt-leftcol {
  padding-top: 5px !important;
}
.bt-leftcol .bt-side-top {
  padding-top: 0 !important;
  padding-right: 0 !important;
  gap: 3px !important;
  -webkit-app-region: no-drag !important;
}
.bt-leftcol .bt-side-top button {
  -webkit-app-region: no-drag !important;
  width: 30px !important;
  height: 30px !important;
}
.bt-leftcol .bt-side-top .bt-round svg {
  width: 20px !important;
  height: 20px !important;
}

/* The visible inner corner belongs to the chat column, not .bt-leftcol.
   Removing its caption padding also keeps the header inside its clipping root. */
html[data-windows-titlebar] div[class*="_centerCol"] {
  padding-top: 0 !important;
  border-top-left-radius: 0 !important;
}

/* Keep the host's conversation-column centring, including panel resizing. */
${PILL_HEADER} {
  position: absolute !important;
  top: 20px !important;
  padding: 0 !important;
}

/* The host's fading header backdrop must not paint a horizontal light band. */
${PILL_HEADER}::before {
  content: none !important;
  background: none !important;
}

/* The settled panel starts at chrome-top. Absolute positioning also follows
   its entrance animation instead of changing fixed containing blocks midway. */
${CORNER_ROW} {
  position: absolute !important;
  top: calc(20px - var(--dsh-frame-chrome-top, 0px)) !important;
  right: 20px !important;
  margin: 0 !important;
  padding: 0 !important;
  z-index: 50 !important;
  justify-content: flex-end !important;
}

/* Buttons inside the native caption band must remain interactive. The host
   already exempts the pill; also exempt the relocated panel controls. */
${CORNER_ROW},
${CORNER_ROW} button,
.bt-panel .bt-subhead button {
  -webkit-app-region: no-drag !important;
}

/* Reserve the detached buttons' 36px height down to viewport y=56. The
   caption band and optional panel tabs already contribute to this clearance. */
.bt-panel-view:has(> .bt-drawer-top) {
  padding-top: max(0px, calc(56px - var(--bt-caption-band, 0px))) !important;
}

/* The settings view uses an in-flow subheader instead of .bt-drawer-top.
   Without a tab strip, replace the inherited 40px band with the 20px inset
   (10px panel clearance plus the subheader's existing 10px padding). */
html[data-windows-titlebar] .bt-panel:not(:has(> .bt-ptabs)):has(> .bt-panel-view > .bt-subhead) {
  padding-top: 10px !important;
}

/* Only expanded columns have an expanded minimum; the width module owns the
   actual drag. This keeps the static floor below the host's 264px. */
.bt-leftcol:is([data-left="open"], [data-left="drawer"]) {
  min-width: 220px !important;
}
.bt-leftcol[data-left="rail"] {
  min-width: 0 !important;
  /* With the toggle removed, keep the first avatar below native window controls.
     The live inline width still owns both the rail and its resize boundary. */
  padding-top: max(20px, calc(var(--bt-lc-clear, 0px) + 8px)) !important;
}

/* The three sidebar actions read as normal tools, not filled buttons:
   secondary ink on the surface, with the shared hover treatment. */
.bt-side-top .bt-round {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--bt-ink-2) !important;
}
.bt-side-top .bt-round:hover {
  background: color-mix(in srgb, var(--bt-hover) 60%, transparent) !important;
  color: var(--bt-ink) !important;
}

/* Sidebar visibility is controlled by the host shortcut and the existing grip.
   Hide the Bot controls and the shell fallback, which is exposed after the Bot
   column unmounts. Otherwise hiding the sidebar reveals another open button. */
.bt-title-toggle,
.bt-side-collapse,
button[data-sidebar-toggle],
button[data-sidebar-opener] {
  display: none !important;
}

.bt-leftcol,
.bt-leftcol > :first-child {
  border-top-right-radius: 0 !important;
}

.bt-side-top .bt-brand {
  display: none !important;
}
`
