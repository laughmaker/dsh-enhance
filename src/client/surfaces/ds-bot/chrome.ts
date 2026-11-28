/** DS Bot-only chrome. Shared Markdown and annotation sheets are unchanged.
 * The desktop preload sets data-windows-titlebar, caption height 40px and
 * --dsh-frame-chrome-top:0px: the viewport reaches the native window top.
 * material.css pads the chat column by the caption height; remove that padding
 * so the host's absolute header can keep its horizontal layout at top:20px.
 */
const CORNER_ROW = ':is(.bt-pane, .bt-panel) .bt-drawer-top'
const PILL_HEADER = 'header[class*="_header"]:has(.bt-head)'

const NATIVE_PILL_HEADER = '.dsb-head:has(.bt-head)'

const sidebarProfileCss = `
/* Custom avatar images in the sidebar use the host crop without its inset ring. */
.bt-leftcol :is(.bt-tile, .bt-row) > .bt-mark > .bt-mark[data-shape="image"] > .bt-mark-img {
  box-shadow: none;
}

/* Keep the host profile above the scrollport so it can show the native sidebar
   material and the scrollport still clips every conversation row. */
.bt-leftcol > .bt-side:not(.bt-rail):has(> .bt-list > .bt-tile-wrap:first-child) {
  position: relative;
  /* Host tile: 60px avatar, 18px name, 4px gap, 10px button padding. */
  --ds-profile-padding-top: 6px;
  --ds-profile-task-height: 0px;
  --ds-profile-height: calc(107px + var(--ds-profile-padding-top) + var(--ds-profile-task-height));
}
.bt-leftcol > .bt-side:not(.bt-rail):has(> .bt-list > .bt-tile-wrap:first-child > .bt-tile > .bt-task-pill) {
  /* The optional task count adds an 18px pill, 4px margin and 4px gap. */
  --ds-profile-task-height: 26px;
}
.bt-leftcol > .bt-side:not(.bt-rail) > .bt-list:has(> .bt-tile-wrap:first-child) {
  margin-top: var(--ds-profile-height);
}
.bt-leftcol > .bt-side:not(.bt-rail) > .bt-list > .bt-tile-wrap:first-child {
  /* The static block position is the scrollport's top. Anchor inline sizing
     to the sidebar so the tile stays centred outside the scroll clip. */
  position: absolute;
  inset-inline: 0;
  translate: 0 -100%;
  box-sizing: border-box;
  padding-top: var(--ds-profile-padding-top);
  height: var(--ds-profile-height);
  z-index: 2;
}
.bt-leftcol > .bt-side:not(.bt-rail) > .bt-list > .bt-tile-wrap:first-child > .bt-tile {
  width: 127px;
  max-width: 100%;
  background: transparent;
  -webkit-app-region: no-drag !important;
}
.bt-leftcol > .bt-side:not(.bt-rail) > .bt-list > .bt-tile-wrap:first-child > .bt-tile > .bt-chip {
  display: none;
}
`

function titlePillCss(pillHeader: string, useDisplacement = true): string {
  return `
/* Keep the pill fully clickable: the header/head pass clicks through except on
   the pill itself, and the pill is never a window-drag handle. */
${pillHeader} .bt-head {
  height: 50px !important;
  pointer-events: none !important;
}
${pillHeader} .bt-pill,
${pillHeader} .bt-pill * {
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
${pillHeader} .bt-pill {
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
body[data-ds-dark-theme] ${pillHeader} .bt-pill {
  --dsh-lg-tint: rgba(255, 255, 255, .08);
  box-shadow:
    0 3px 3px rgba(0, 0, 0, .34),
    0 0 10px rgba(0, 0, 0, .18) !important;
}

/* The glass itself: the softening pass and the bend ride the same element, as
   in the reference. The bend uses the plain filter property because Chromium
   drops a url() from backdrop-filter; the unset variable keeps this at none, so
   the frosted fallback still works. */
${pillHeader} .bt-pill::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  border-radius: inherit !important;
  corner-shape: round !important;
  overflow: hidden !important;
  isolation: isolate !important;
  -webkit-backdrop-filter: ${useDisplacement ? 'var(--dsh-lg-backdrop, blur(3px))' : 'blur(3px)'} !important;
  backdrop-filter: ${useDisplacement ? 'var(--dsh-lg-backdrop, blur(3px))' : 'blur(3px)'} !important;
  ${useDisplacement ? `-webkit-filter: var(--dsh-lg-filter, none) !important;
  filter: var(--dsh-lg-filter, none) !important;` : 'filter: none !important;'}
  pointer-events: none !important;
}

/* The body of the glass and its lip: the reference's flat white film plus its
   two inset shines, one catching the light on the top-left curve and one
   holding the bottom-right edge. That pair is what makes the outline read as
   a thin bright lip at 1x; a single top highlight only brightens the top. */
${pillHeader} .bt-pill::after {
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
${pillHeader} .bt-pill > * {
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
${pillHeader} .bt-pill:hover {
  --dsh-lg-tint: rgba(255, 255, 255, .32);
  animation: dsh-pill-pop 440ms cubic-bezier(.22, .61, .36, 1) both !important;
}
body[data-ds-dark-theme] ${pillHeader} .bt-pill:hover {
  --dsh-lg-tint: rgba(255, 255, 255, .12);
}
${pillHeader} .bt-pill:active {
  animation: none !important;
  transform: scale(.97) !important;
}
@media (prefers-reduced-motion: reduce) {
  ${pillHeader} .bt-pill:hover,
  ${pillHeader} .bt-pill:active {
    animation: none !important;
    transform: none !important;
  }
}
`
}

export const css = chromeCss()
export const nativeCss = chromeCss(NATIVE_PILL_HEADER, false)

export function appearanceChromeCss(): string {
  return `
${sidebarProfileCss}
/* Keep the expanded Bot tools at the right and give them room to wrap. */
.bt-leftcol:is([data-left="open"], [data-left="drawer"]) > .bt-side > .bt-side-top {
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 3px;
  padding-bottom: 0;
}
.bt-leftcol > .bt-side > .bt-side-top > .bt-brand {
  display: none;
}

/* The independent macOS caption also holds a 28px sidebar toggle at x=88.
   Leave 4px after it, relative to the sidebar's 12px left padding. */
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-leftcol:is([data-left="open"], [data-left="drawer"]) {
  padding-top: max(0px, calc((var(--dsh-windows-titlebar-height, 40px) - 30px) / 2));
}
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-leftcol:is([data-left="open"], [data-left="drawer"]) > .bt-side > .bt-side-top {
  padding-top: 0;
  padding-inline-start: calc(var(--bt-caption-start, 76px) + 32px);
}
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-leftcol > .bt-side > .bt-side-top button {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

/* Four-button details view: place the row at the lights' top edge in normal
   flow. Leave the caption drag strip, right inset and tabbed panel intact. */
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-panel:not(:has(> .bt-ptabs)):has(> .bt-panel-view > .bt-drawer-top[data-window-drag]) {
  padding-top: max(0px, calc((var(--dsh-windows-titlebar-height, 40px) - 14px) / 2 - var(--dsh-frame-chrome-top, 0px)));
}
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-panel > .bt-panel-view > .bt-drawer-top[data-window-drag] {
  position: relative;
  padding-top: 0;
}
html[data-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-panel > .bt-panel-view > .bt-drawer-top[data-window-drag] :is(button, .bt-pmenu-pop) {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

${titlePillCss(NATIVE_PILL_HEADER, false)}
`
}

function chromeCss(pillHeader = PILL_HEADER, legacyChrome = true): string {
  return `
/* Keep user messages on the current theme's surface instead of an inverted
   black/white slab. Theme inks retain readable text and adapt to custom themes. */
body {
  --bt-user: color-mix(in srgb, var(--bt-ink) 7%, var(--bt-main)) !important;
  --bt-user-ink: var(--bt-ink) !important;
}
body[data-ds-dark-theme] {
  --bt-user: color-mix(in srgb, var(--bt-ink) 12%, var(--bt-main)) !important;
}

/* Centre the expanded toolbar in the 40px caption band. The rail's top
   clearance is set with its width rule below. */
.bt-leftcol:not([data-left="rail"]) {
  padding-top: 5px !important;
}
.bt-leftcol .bt-side-top {
  justify-content: flex-end;
  flex-wrap: wrap;
  padding-top: 0 !important;
  padding-right: 0 !important;
  gap: 3px !important;
  -webkit-app-region: no-drag !important;
}
/* Frameless shells may put native window controls at the left. Keep the
   toolbar out of their 88px area, including the sidebar's 12px left inset.
   Extra actions wrap within the remaining space at compact widths. */
${legacyChrome ? 'html[data-windows-titlebar]' : 'html[data-windows-titlebar][data-ds-enhance-mac]:not([data-fullscreen])'} .bt-leftcol .bt-side-top {
  padding-left: max(76px, var(--bt-caption-start, 0px));
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

/* Use the macOS caption space for the tab strip. DS Bot's preload omits the platform
   attribute used by the host drag styles, so use our macOS marker. */
html[data-ds-enhance-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-panel:has(> .bt-ptabs[data-window-drag]) {
  --bt-caption-band: 0px;
}
html[data-ds-enhance-mac][data-windows-titlebar]:not([data-fullscreen]) .bt-panel > .bt-ptabs[data-window-drag] {
  -webkit-app-region: drag;
}
html[data-ds-enhance-mac][data-windows-titlebar] .bt-panel > .bt-ptabs[data-window-drag] :is(button, a, [role="button"], [role="tab"]),
html[data-ds-enhance-mac][data-windows-titlebar] .bt-panel:has(> .bt-ptabs[data-window-drag]) > .bt-panel-grip {
  -webkit-app-region: no-drag;
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

/* Computer handoff renders the card and actions as siblings. Give them one
   column so the host's flex row cannot place the actions beside the card. */
:is(.bt-q-dock, .bt-q-inline):has(> .bt-handoff + .bt-q-foot) {
  display: grid;
  grid-template-areas: 'card' 'actions';
  grid-template-columns: minmax(0, min(550px, 86%));
  row-gap: 8px;
}
.bt-q-dock:has(> .bt-handoff + .bt-q-foot) {
  grid-template-columns: minmax(0, calc(min(var(--dsh-chat-content-width, 748px), 100%) - 32px));
  padding-bottom: 8px;
}
:is(.bt-q-dock, .bt-q-inline) > .bt-handoff:has(+ .bt-q-foot) {
  grid-area: card;
  width: 100%;
  max-width: none;
  margin: 0;
}
:is(.bt-q-dock, .bt-q-inline) > .bt-handoff + .bt-q-foot {
  grid-area: actions;
  flex-wrap: wrap;
}
@media (max-width: 640px) {
  .bt-q-inline:has(> .bt-handoff + .bt-q-foot) {
    grid-template-columns: minmax(0, 1fr);
  }
  :is(.bt-q-dock, .bt-q-inline) > .bt-handoff + .bt-q-foot > button {
    min-height: 44px;
  }
}

${legacyChrome ? `/* Keep the user's settled 12px top offset. Absolute positioning preserves
   the host's horizontal centring as the sidebar and detail panel resize. */
${pillHeader} {
  top: 12px !important;
  padding: 0 !important;
}

/* The host's fading header backdrop must not paint a horizontal light band,
   and its 60px-tall ::before band also intercepted clicks over the pill's top
   half (only the bottom sliver stayed hittable). Remove it entirely. */
${pillHeader}::before {
  content: none !important;
  background: none !important;
  height: 0 !important;
  pointer-events: none !important;
}

` : ''}

${titlePillCss(pillHeader)}

/* A group session with an active goal renders the same .bt-pill inside a
   .bt-island card (the pill row plus a goal bar below it). The host squares that
   card off — its own 20px, open 18px superellipse corners tuck inside the
   pill's 9999px capsule, so the outer card's top corners read squarer than the
   capsule they wrap. The pill is 50px tall, so its capsule resolves each corner
   to a 25px radius; give the island that exact radius and the same round
   corner-shape, and hand it to the goal bar / panel that paint the island's
   bottom edge, so the inner capsule and the outer card share one curve in both
   the collapsed (goal bar) and open (goal panel) states. Scoped to the session
   header island; the plain header pill (no island ancestor) is untouched, and
   the transition the host declares on the island keeps animating the change. */
${pillHeader} .bt-island {
  border-radius: 25px !important;
  corner-shape: round !important;
}
${pillHeader} .bt-island:not([data-open]) .bt-goal-bar {
  border-radius: 0 0 25px 25px !important;
}
${pillHeader} .bt-island .bt-goal-panel {
  border-radius: 0 0 25px 25px !important;
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

/* In the tabbed panel the details view follows the strip. Keep its actions
   in that flow so they never cover the tab labels or the panel close button. */
.bt-panel:has(> .bt-ptabs) > .bt-panel-view:has(> .bt-drawer-top) {
  padding-top: 0 !important;
}
.bt-panel:has(> .bt-ptabs) > .bt-panel-view > .bt-drawer-top {
  position: relative !important;
  inset: auto !important;
  padding: 6px 20px 0 12px !important;
  flex: none;
}

/* Match the dock's Files tab: a 28px chip with the shared hover and selected fills. */
.bt-panel > .bt-ptabs {
  --ds-tab-radius: var(--dsw-radius-sm, 6px);
  --ds-tab-hover: var(--dsw-alias-interactive-bg-hover, var(--bt-hover));
  --ds-tab-selected: var(--dsw-alias-markdown-tag, var(--bt-active));
}
.bt-panel > .bt-ptabs > .bt-ptabs-in > .bt-ptab-ind {
  display: none;
}
.bt-panel > .bt-ptabs :is(.bt-ptab, .bt-ptab-wrap, .bt-ptab-new, .bt-ptab-close) {
  height: 28px;
  border-radius: var(--ds-tab-radius);
}
.bt-panel > .bt-ptabs .bt-ptab-wrap { padding-right: 4px; }
.bt-panel > .bt-ptabs .bt-ptab-btn { padding-inline-start: 10px; }
.bt-panel > .bt-ptabs .bt-ptab-wrap:hover,
.bt-panel > .bt-ptabs :is(.bt-ptab-new, .bt-ptab-close):hover { background: var(--ds-tab-hover); }
.bt-panel > .bt-ptabs .bt-ptab-wrap[data-selected],
.bt-panel > .bt-ptabs .bt-ptab-bot[aria-selected="true"]:not(:has(+ .ds-panel-actions)) { background: var(--ds-tab-selected); }
.bt-panel > .bt-ptabs .bt-ptab-wrap:not([data-selected]) + .bt-ptab-wrap:not([data-selected])::before {
  content: ''; position: absolute; inset: 7px auto 7px -1px;
  width: 1px; background: var(--bt-line); pointer-events: none;
}
.bt-panel > .bt-ptabs .bt-ptabs-in:has(> .ds-panel-actions) {
  --ds-identity-width: 104px;
  scroll-padding-left: calc(var(--ds-identity-width) + 24px);
}
/* The opaque surface prevents scrolled labels showing through the pinned group.
   The separate rounded fill paints selection across the name and arrow once. */
.bt-panel > .bt-ptabs .bt-ptabs-in > .bt-ptab-bot:has(+ .ds-panel-actions) {
  width: var(--ds-identity-width); box-sizing: border-box;
  background: var(--bt-main); box-shadow: 22px 0 var(--bt-main);
  border-radius: 0; z-index: 3;
}
.bt-ptab-bot:has(+ .ds-panel-actions)::before {
  content: ''; position: absolute; inset: 0 -22px 0 0;
  border-radius: var(--ds-tab-radius); z-index: -1; pointer-events: none;
}
.bt-ptab-bot:is(:hover, :has(+ .ds-panel-actions:hover), :has(+ .ds-panel-actions[aria-expanded="true"]))::before {
  background: var(--ds-tab-hover);
}
.bt-ptab-bot[aria-selected="true"]:has(+ .ds-panel-actions)::before { background: var(--ds-tab-selected); }
.bt-ptab-bot:has(+ .ds-panel-actions):not(:has(.bt-ptab-name))::after {
  content: attr(title); overflow: hidden; text-overflow: ellipsis;
}
.bt-panel > .bt-ptabs .ds-panel-actions {
  position: sticky; left: calc(var(--ds-identity-width) + 2px); z-index: 4; flex: none;
  width: 20px; height: 28px; border: 0; border-radius: var(--ds-tab-radius); padding: 0;
  background: transparent; color: var(--bt-ink-2); cursor: pointer;
  display: inline-grid; place-items: center;
}
.bt-panel > .bt-ptabs .ds-panel-actions::before {
  content: '';
  width: 10px;
  height: 7px;
  background: currentColor;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.bt-panel > .bt-ptabs > .bt-pmenu > .bt-ptab-new { color: var(--bt-ink-2); }
.bt-panel > .bt-ptabs > .bt-pmenu > .bt-ptab-new:hover { color: var(--bt-ink); }
.bt-panel > .bt-ptabs > .bt-pmenu > .bt-ptab-new > svg path { stroke-width: 3.2px; }
.ds-panel-actions:hover, .ds-panel-actions[aria-expanded="true"] { color: var(--bt-ink); }
.bt-panel > .bt-ptabs :is(.ds-panel-actions, .bt-ptab-new, .bt-ptab-close):focus-visible {
  outline: 2px solid var(--bt-accent); outline-offset: -2px;
}
.bt-panel:has(> .bt-ptabs .ds-panel-actions) > .bt-panel-view > .bt-drawer-top:not(:popover-open) { display: none !important; }
.bt-panel:has(> .bt-ptabs .ds-panel-actions) > .bt-panel-view > .bt-drawer-top:popover-open {
  position: fixed !important; inset: var(--ds-actions-y) auto auto var(--ds-actions-x) !important;
  display: flex; flex-direction: column; align-items: stretch; gap: 2px;
  box-sizing: border-box; width: 192px; overflow: visible; margin: 0 !important; padding: 5px !important;
  border: .5px solid var(--bt-line); border-radius: 12px; color: var(--bt-ink);
  background: var(--bt-main); box-shadow: 0 8px 24px #0003; animation: none;
}
.bt-panel:has(> .bt-ptabs .ds-panel-actions) > .bt-panel-view > .bt-drawer-top:popover-open .bt-round {
  display: flex; justify-content: flex-start; gap: 8px; box-sizing: border-box;
  width: 100%; padding: 0 9px; border-radius: 7px; white-space: nowrap;
}
.bt-drawer-top:popover-open .bt-round::after { content: attr(aria-label); font: 13px system-ui; }
.bt-drawer-top:popover-open .bt-pmenu { display: block; }
.bt-drawer-top:popover-open .bt-pmenu-pop { position: static; margin: 3px 0; min-width: 0; }

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

${legacyChrome ? `/* Only expanded columns have an expanded minimum; the width module owns the
   actual drag. This keeps the static floor below the host's 264px. */
.bt-leftcol:is([data-left="open"], [data-left="drawer"]) {
  min-width: 220px !important;
}
.bt-leftcol[data-left="rail"] {
  min-width: 0 !important;
  /* With the toggle removed, keep the first avatar below native window controls.
     The live inline width still owns both the rail and its resize boundary. */
  padding-top: max(20px, calc(max(var(--bt-lc-clear, 0px), var(--dsh-windows-titlebar-height, 0px)) + 8px)) !important;
}
` : ''}

/* ---- Window drag from the sidebar background (desktop only) ---- */

/* The desktop shell is frameless, so the sidebar's empty background is the
   natural place to grab the window on the left. The host's base.css turns the
   data-window-drag marker into the sole darwin drag region and
   data-window-drag-recall into its no-drag carve-out; here the whole left
   column becomes that region, and every control inside it is carved back out.
   A drag region is the union of the drag boxes minus the no-drag boxes, so the
   empty space outside the list can still drag the window. The whole scrollport
   receives pointer events, including gaps between rows. A single no-drag box
   replaces the moving no-drag rectangles for each list control.
   The grip is carved out so panel-widths.ts keeps owning its resize gesture. */
html[data-windows-titlebar] .bt-leftcol {
  -webkit-app-region: drag !important;
}
html[data-windows-titlebar] .bt-leftcol > .bt-side > .bt-list,
html[data-windows-titlebar] .bt-leftcol :is(button, a, input, textarea, select,
  [contenteditable="true"], [role="menu"], [role="menuitem"], [role="menuitemcheckbox"]):not(.bt-list *),
html[data-windows-titlebar] .bt-leftcol-grip {
  -webkit-app-region: no-drag !important;
}

/* A sidebar popup (account menu, section/row context menu) is rendered as a
   body-level .bt-menu overlay, so the pointerdown that the host's outside-click
   handler needs to dismiss it lands on the sidebar background — which the rule
   above makes a window-drag handle. Electron's drag region swallows that
   pointerdown, so the outside click never reaches the handler and the menu looks
   stuck when the empty area is clicked. Hand the whole column back to pointer
   events while a sidebar .bt-menu is open; the :has() stops matching the moment
   the overlay is removed and dragging returns. A .bt-menu exists only while a
   popup is open (none is parked in the DOM), and any other popup also dismisses
   on the first background click, so widening the no-drag window for it is safe. */
html[data-windows-titlebar] body:has(> .bt-menu) .bt-leftcol {
  -webkit-app-region: no-drag !important;
}

${sidebarProfileCss}

/* The footer's native .bt-account/.bt-you styles provide the button and disc. */
.bt-leftcol-foot .ds-footer-panel-icon {
  display: inline-flex;
  line-height: 0;
}
.bt-leftcol-foot .ds-open-artifact-icon {
  position: relative;
  width: 16px;
  height: 16px;
}
.bt-leftcol-foot .ds-open-artifact-icon::before,
.bt-leftcol-foot .ds-open-artifact-icon::after {
  content: '';
  position: absolute;
  box-sizing: border-box;
  width: 10px;
  height: 12px;
  border: 1.5px solid currentColor;
  border-radius: 2.5px;
}
.bt-leftcol-foot .ds-open-artifact-icon::before {
  top: 0;
  right: 0;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 42% 100%, 42% 30%, 0 30%);
}
.bt-leftcol-foot .ds-open-artifact-icon::after {
  bottom: 0;
  left: 0;
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

${legacyChrome ? `/* Sidebar visibility is controlled by the host shortcut and the existing grip.
   Hide the Bot controls and the shell fallback, which is exposed after the Bot
   column unmounts. Otherwise hiding the sidebar reveals another open button. */
.bt-title-toggle,
.bt-side-collapse,
button[data-sidebar-toggle],
button[data-sidebar-opener] {
  display: none !important;
}

` : ''}

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
}
