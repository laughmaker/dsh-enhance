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
  width: 18px !important;
  height: 18px !important;
}

/* The visible inner corner belongs to the chat column, not .bt-leftcol.
   Removing its caption padding also keeps the header inside its clipping root. */
html[data-windows-titlebar] div[class*="_centerCol"] {
  padding-top: 0 !important;
  border-top-left-radius: 0 !important;
}

/* Desktop material.css reserves a second caption band on the host's right
   column using a 40px top border. File, browser and terminal tabs share this
   column; let their own tab-strip padding supply the top clearance instead. */
html[data-windows-titlebar] div[class*="_rightbarCol"] {
  border-top: 0 !important;
}

/* With that 40px band gone the dockkit tab strip sits inside the native
   title-bar drag region. The host marks the strip itself as a window drag
   handle (data-window-drag → app-region: drag), so the strip's own padding,
   the gap between tabs and the empty span beside the buttons all drag the
   window: a click there moves the window instead of reaching the bar, and the
   whole row reads as dead. Make the entire strip — tabs, close, +, split,
   fullscreen, collapse and the space around them — one no-drag island.
   Nothing is repositioned, so the removed 40px blank band stays gone. */
html[data-windows-titlebar] [class*="_tabStrip_"],
html[data-windows-titlebar] [class*="_tabStrip_"] *,
html[data-windows-titlebar] [class*="_stripTabs_"],
html[data-windows-titlebar] [class*="_stripChrome_"],
html[data-windows-titlebar] [class*="_tab_"],
html[data-windows-titlebar] [class*="_tabClose_"],
html[data-windows-titlebar] [class*="_addTab_"] {
  -webkit-app-region: no-drag !important;
}

/* The composer's "/" command menu is nested inside the composer card, which
   sets its own backdrop-filter. A backdrop-filter turns its element into a
   backdrop root, so the menu material's own backdrop-filter (the host declares
   blur(40px)) has nothing to sample and never paints: the conversation text
   behind the menu reads straight through it. Drop the card's blur only while
   one of the composer's trigger menus is open, so the menu can sample the page
   again and its declared blur finally frosts out the text behind it. The card's
   blur returns as soon as the menu closes; the title pill and every menu that
   is not rendered inside the composer card are untouched. */
[data-composer-card]:has([data-trigger-menu]) {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* Keep the user's settled 12px top offset. Absolute positioning preserves
   the host's horizontal centring as the sidebar and detail panel resize. */
${PILL_HEADER} {
  top: 12px !important;
  padding: 0 !important;
}

/* The host's fading header backdrop must not paint a horizontal light band,
   and its 60px-tall ::before band also intercepted clicks over the pill's top
   half (only the bottom sliver stayed hittable). Remove it entirely. */
${PILL_HEADER}::before {
  content: none !important;
  background: none !important;
  height: 0 !important;
  pointer-events: none !important;
}

/* Keep the pill fully clickable: the header/head pass clicks through except on
   the pill itself, and the pill is never a window-drag handle. */
${PILL_HEADER} .bt-head {
  height: 50px !important;
  pointer-events: none !important;
}
${PILL_HEADER} .bt-pill,
${PILL_HEADER} .bt-pill * {
  pointer-events: auto !important;
  -webkit-app-region: no-drag !important;
}

/* Liquid glass on the session-title pill, ported from
   lucasromerodb/liquid-glass-effect-macos (the source behind the user's
   CodeSandbox reference nn5q2y; that repo ships no LICENSE and is used as an
   effect reference only). The reference layers one clipped shape as:
     effect layer  - backdrop-filter: blur(3px) AND filter: url(#glass-distortion)
                     on the SAME element, so the backdrop is softened first and
                     bent afterwards by the turbulence displacement map;
     tint layer    - a flat white 25% film over the bend;
     shine layer   - two inset white shadows that draw the lit lip;
     text layer    - the content, above every layer.
   Here the effect layer is ::before, the tint and the shine share ::after, and
   the pill's own box clips both to the capsule. The pill carries no border: the
   reference has none, and its only outline is the shine. The soft drop shadow
   is kept light. Padding grows by 5px on each side; height grows accordingly
   so the avatar and title keep the same space inside the capsule. */
${PILL_HEADER} .bt-pill {
  position: relative !important;
  height: 50px !important;
  padding: 12.5px 18.5px 12.5px 12.5px !important;
  /* Own the silhouette instead of inheriting a host/theme corner radius. */
  border-radius: 9999px !important;
  corner-shape: round !important;
  overflow: hidden !important;
  background: transparent !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  --dsh-lg-tint: rgba(255, 255, 255, .25);
  /* No border: the reference draws the edge with the shine layer alone. */
  border: none !important;
  box-shadow:
    0 2px 5px rgba(0, 0, 0, .10),
    0 0 8px rgba(0, 0, 0, .04) !important;
}

/* Dark glass takes a much lighter white tint: the backdrop is already dark, and
   the reference's 25% film over it turns the pill into a grey card. */
body[data-ds-dark-theme] ${PILL_HEADER} .bt-pill {
  --dsh-lg-tint: rgba(255, 255, 255, .08);
  box-shadow:
    0 3px 3px rgba(0, 0, 0, .34),
    0 0 10px rgba(0, 0, 0, .18) !important;
}

/* The glass itself: the softening pass and the bend ride the same element, as
   in the reference. The bend uses the plain filter property because Chromium
   drops a url() from backdrop-filter; the unset variable keeps this at none, so
   the frosted fallback still works. */
${PILL_HEADER} .bt-pill::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  border-radius: inherit !important;
  corner-shape: round !important;
  overflow: hidden !important;
  isolation: isolate !important;
  -webkit-backdrop-filter: var(--dsh-lg-backdrop, blur(3px)) !important;
  backdrop-filter: var(--dsh-lg-backdrop, blur(3px)) !important;
  -webkit-filter: var(--dsh-lg-filter, none) !important;
  filter: var(--dsh-lg-filter, none) !important;
  pointer-events: none !important;
}

/* The body of the glass and its lip: the reference's flat white film plus its
   two inset shines, one catching the light on the top-left curve and one
   holding the bottom-right edge. That pair is what makes the outline read as
   a thin bright lip at 1x; a single top highlight only brightens the top. */
${PILL_HEADER} .bt-pill::after {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 2 !important;
  border-radius: inherit !important;
  corner-shape: round !important;
  background: var(--dsh-lg-tint) !important;
  box-shadow:
    inset .5px .5px .75px 0 rgba(255, 255, 255, .45),
    inset -.5px -.5px .75px 0 rgba(255, 255, 255, .28) !important;
  pointer-events: none !important;
}

/* Avatar, name and back arrow sit above both layers so the text stays crisp
   instead of getting washed by the tint. */
${PILL_HEADER} .bt-pill > * {
  position: relative !important;
  z-index: 3 !important;
}

/* A single gentle squash-and-stretch on entry, then settle at the original
   size. The outer header stays still, preserving centring and hit geometry. */
@keyframes dsh-pill-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.045, .96); }
  65% { transform: scale(.985, 1.025); }
  100% { transform: scale(1); }
}
${PILL_HEADER} .bt-pill:hover {
  --dsh-lg-tint: rgba(255, 255, 255, .32);
  animation: dsh-pill-pop 440ms cubic-bezier(.22, .61, .36, 1) both !important;
}
body[data-ds-dark-theme] ${PILL_HEADER} .bt-pill:hover {
  --dsh-lg-tint: rgba(255, 255, 255, .12);
}
${PILL_HEADER} .bt-pill:active {
  animation: none !important;
  transform: scale(.97) !important;
}
@media (prefers-reduced-motion: reduce) {
  ${PILL_HEADER} .bt-pill:hover,
  ${PILL_HEADER} .bt-pill:active {
    animation: none !important;
    transform: none !important;
  }
}

/* The settled panel starts at chrome-top. Absolute positioning also follows
   its entrance animation instead of changing fixed containing blocks midway.
   Top-aligned with the 14px traffic lights (their top sits at 13px in the 40px
   band), as requested — the row's own top edge matches the lights' top edge. */
${CORNER_ROW} {
  position: absolute !important;
  top: calc(13px - var(--dsh-frame-chrome-top, 0px)) !important;
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

/* Reserve the detached buttons' 36px height down to viewport y=49 (13 + 36). */
.bt-panel-view:has(> .bt-drawer-top) {
  padding-top: max(0px, calc(49px - var(--bt-caption-band, 0px))) !important;
}

/* The settings view uses an in-flow subheader instead of .bt-drawer-top.
   Without a tab strip, replace the inherited 40px band with the 20px inset
   (10px panel clearance plus the subheader's existing 10px padding). */
html[data-windows-titlebar] .bt-panel:not(:has(> .bt-ptabs)):has(> .bt-panel-view > .bt-subhead) {
  padding-top: 10px !important;
}

/* The host paints its whole --bt-caption-band as a positioned, drag-region
   ::before strip on the panel. This panel's top inset is only 10px, so that
   40px strip reached down over the subheader and swallowed clicks on the top
   half of the back/close buttons (their own no-drag is painted over by the
   strip, which sits above the static subheader). Clamp the strip to the same
   10px inset so it never overlaps the interactive row. */
html[data-windows-titlebar] .bt-panel:not(:has(> .bt-ptabs)):has(> .bt-panel-view > .bt-subhead)::before {
  height: 10px !important;
}

/* Also lift the whole subheader above any residual drag strip and make it and
   every descendant a no-drag island, so the back/close controls (Bot settings
   and Group settings share this in-flow subheader) stay clickable at every
   height, top edge included. */
html[data-windows-titlebar] .bt-panel:has(> .bt-panel-view > .bt-subhead) > .bt-panel-view > .bt-subhead {
  position: relative !important;
  z-index: 1 !important;
}
html[data-windows-titlebar] .bt-panel:has(> .bt-panel-view > .bt-subhead) > .bt-panel-view > .bt-subhead,
html[data-windows-titlebar] .bt-panel:has(> .bt-panel-view > .bt-subhead) > .bt-panel-view > .bt-subhead * {
  -webkit-app-region: no-drag !important;
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

/* ---- Sidebar section headers (DS Bot tree) ---- */

/* The disclosure chevron's glyph sits ~2.5px right of the hover guide line
   that descends through the child rows (the 14px chev box is centred at 25px,
   the guide at ~22.75px), so its tip misses the line. Nudge only the glyph
   left with a relative offset so the tip lands on the guide; the title row,
   its spacing and the button hit area stay exactly where they were. */
.bt-leftcol .bt-sec-chev {
  position: relative !important;
  left: -2.5px !important;
}

/* The "…" section action renders as three ~1px dots in a 13px svg and reads far
   fainter than the "+" beside it, although both share the same ink colour and
   opacity (so colour is not the cause — the glyph is). Give the dots a slightly
   larger glyph box (15px) and a heavier stroke so the three dots read at the
   same weight as the "+"; colour, opacity and the button hit area are unchanged. */
.bt-leftcol .bt-sec-acts .bt-sec-act:last-child svg {
  width: 15px !important;
  height: 15px !important;
}
.bt-leftcol .bt-sec-acts .bt-sec-act:last-child svg path {
  stroke-width: 2.8 !important;
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

/* The rail's + button carries the same disc as the account and plugins
   buttons: those wrap their icon in a 36px round bt-you disc, which is a
   #262626 fill with a 1px inner ring, and that ring reads as the button face.
   The host's .bt-round only fills the button, so paint the same disc here. */
.bt-leftcol-foot-rail .bt-round {
  width: 36px !important;
  height: 36px !important;
  border-radius: 50% !important;
  border-color: transparent !important;
  background: #262626 !important;
  box-shadow: inset 0 0 0 1px rgba(242, 242, 242, .08) !important;
  color: var(--bt-ink-2) !important;
}
.bt-leftcol-foot-rail .bt-round:hover {
  background: color-mix(in srgb, #262626 82%, var(--bt-hover)) !important;
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

/* ---- Account menu (bottom-left gear) — frostier, more opaque, larger radius ---- */

/* The host paints every pop menu as a 78% (light) / 74% (dark) glass tint with
   a 24px blur, so the sidebar's session titles still read through the bottom-left
   account menu. Deepen only this menu: a stronger blur plus a more opaque surface
   hide the text behind it, and a larger corner radius softens its edges. Scoped to
   .bt-account-menu so the other pop menus keep the host's look; corner-shape is
   left untouched so the curve stays consistent with the rest of the shell. */
.bt-account-menu {
  -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
  backdrop-filter: blur(40px) saturate(180%) !important;
  background: color-mix(in srgb, var(--bt-main) 92%, transparent) !important;
  border-radius: 16px !important;
}
body[data-ds-dark-theme] .bt-account-menu {
  background: color-mix(in srgb, var(--bt-main) 90%, transparent) !important;
}
`
