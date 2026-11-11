/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`[class*="sidebarCol"] [class*="_root"] { position: relative !important; }
[class*="sidebarCol"] [class*="logoRow"] { display: none !important; }
/* New Session bar removed by local preference: hides it in both the expanded
   sidebar and the collapsed rail. Sessions are still created with the app's
   own Cmd+N shortcut (and the per-workspace + hover control). */
[class*="sidebarCol"] button[class*="newSession"] { display: none !important; }
[class*="sidebarCol"] [class*="sectionLabel"] {
  margin-left: 4px !important;
}

/* The section heading gives up its words for two icon counts.
 *
 * The host renders the words ("Workspaces", or "Sessions" in the flat
 * grouping) and re-renders them, so the node stays put and only its text is
 * hidden. The counts row is inserted right after it by section-stats.ts and
 * takes the same line: the heading collapses to nothing, and the row is the
 * heading's flex sibling, so it lands where the words were.
 *
 * One of the two groups shows. The row carries data-active once a session is
 * running or a finished one is still unread, and that group replaces the idle
 * one — totals for sessions and workspaces — rather than sitting beside it.
 * Four numbers on one line would no longer fit the heading's width.
 */
[class*="sidebarCol"] [class*="sectionHeader"]:has([data-dsh-enhance-stats]) [class*="sectionLabel"] {
  display: none !important;
}

/* The row starts on the sidebar's content edge, the line the reader marked in
 * red. The heading's own padding puts it past that line, so the margin pulls
 * the first icon back onto it. The tree rows below are pulled to the same
 * line, which is what keeps the icons, the arrows and the folder names flush. */
[data-dsh-enhance-stats] {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  min-width: 0 !important;
  margin-left: -2px !important;
  color: var(--dsw-alias-label-secondary) !important;
  font-size: 12px !important;
  line-height: 16px !important;
  font-variant-numeric: tabular-nums !important;
}

[data-dsh-enhance-stats] [data-group] {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
}

[data-dsh-enhance-stats]:not([data-active="true"]) [data-group="active"],
[data-dsh-enhance-stats][data-active="true"] [data-group="idle"] {
  display: none !important;
}

/* The heading row is a fixed 36px tall and clips its overflow, so a 16px icon
 * leaves a dead band above and below it where the pointer lands on the row
 * instead of the count and the tip never shows. Stretching the count to the
 * row's height makes the whole band the hover target; the icon stays centred. */
[data-dsh-enhance-stats] .dsh-enhance-stat {
  display: inline-flex !important;
  align-items: center !important;
  gap: 1px !important;
  height: 36px !important;
  margin-top: -10px !important;
  margin-bottom: -10px !important;
}

[data-dsh-enhance-stats] svg {
  flex: none !important;
  width: 14px !important;
  height: 14px !important;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 2 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

/* The bell's notification dot is a filled disc in the lucide glyph; the bell
 * itself stays an outline. Filling only the circle keeps both. */
[data-dsh-enhance-stats] [data-count="unread"] svg circle {
  fill: currentColor !important;
  stroke: none !important;
}

/* The running mark is a filled silhouette, not a stroked outline like the
 * other three, so it opts out of the stroke treatment above. The glyph faces
 * right; the row reads left to right, so it is mirrored to run towards the
 * counts that follow it. */
[data-dsh-enhance-stats] [data-count="running"] svg {
  fill: currentColor !important;
  stroke: none !important;
  transform: scaleX(-1) !important;
}
/* One indent for both row kinds, and that indent is the content edge.
 *
 * The list pulls its rows back 4px and the rows themselves add a start inset,
 * which left the disclosure arrows and the folder names short of the sidebar's
 * content edge. Zeroing the inset lands both on that edge, the same line the
 * counts row above is pulled to. A negative margin was tried instead and
 * reverted: it dragged the whole row past the column, so the arrows vanished. */
[role="treeitem"][data-row-key^="session:"],
[role="treeitem"][data-row-key^="workspace:"] {
  padding-inline-start: 4px !important;
}



/* Panel shortcuts open the sidebar, above the workspace tree.
 *
 * The sidebar's own DOM already puts this nav between the (hidden) New Session
 * bar and the region tree, so the top placement needs no move at all: upstream
 * simply starts the nav wherever its flex column lands, and releasing it from
 * the bottom-right absolute position (this plugin's earlier choice) leaves it
 * above WORKSPACES.
 *
 * The row is kept — upstream stacks these icons in a column, which costs one
 * row per shortcut at the top of the tree.
 *
 * How many fit on a line follows the sidebar's own width: the row takes the
 * full content width and the wrap does the counting, so a wider sidebar shows
 * more icons on the first line and the narrowest one (214px) still fits five
 * 36px buttons and four 2px gaps.
 *
 * Every hover and active fill is that same square. The host paints the fill on
 * the padding box and keeps a 3px transparent border on each side, the inset
 * it uses to line labelled rows up. On a 36px button that leaves a 30×36
 * painted background, a rectangle, while a plugin button in the same row has
 * no such border and paints a 36px square. The border is dropped here, and the
 * fill is clipped to the border box, so both kinds cover the whole square.
 *
 * Scope excludes the collapsed rail: there the column is the app's 56px icon
 * strip (0px on macOS), a row of 36px buttons cannot fit it, and the host's own
 * vertical layout is the right shape. The rail is not reachable on macOS
 * desktop, but this plugin also loads in the web profile.
 */
[class*="sidebarCol"] [class*="_root"]:not([class*="collapsed"]) [class*="panelList"] {
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 2px !important;
  margin: 0 0 6px 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

[class*="sidebarCol"] [class*="panelList"] [class*="panelTitle"] { display: none !important; }
[class*="sidebarCol"] [class*="panelList"] button[class*="panelRow"] {
  box-sizing: border-box !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  justify-content: center !important;
  gap: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  background-clip: border-box !important;
  border-radius: 12px !important;
}

/* Plugin icons that the host renders in the sidebar footer join the same row.
 *
 * The footer keeps its own flex layout, which is why the moved container is
 * dissolved rather than laid out: display:contents drops its box, and every
 * wrapper up to the actual button is dissolved the same way, so each plugin's
 * button becomes a direct item of the panel row and takes its turn in the
 * five-per-line count. The buttons keep their own look; only size and shape
 * are normalised to the row's rhythm.
 *
 * One level of wrapper is dissolved generically (every non-button child), one
 * more by the host's own entry-row class: the installed plugins wrap their
 * button in an entry row, and a future plugin that omits it still lands as a
 * direct child.
 */
[class*="sidebarCol"] [class*="panelList"] > [data-dsh-enhance-entries],
[class*="sidebarCol"] [class*="panelList"] > [data-dsh-enhance-entries] > :not(button),
[class*="sidebarCol"] [class*="panelList"] [class*="entryRow"] {
  display: contents !important;
}
/* The plugin's own "wide" variant is built for the footer row: it turns the
 * trigger into an icon+label pill that fills that row's width, which means
 * justify-content:flex-start and a gap. In a 36px square that reads as an icon
 * glued to the left edge, so the box model is normalised here: centred, no
 * gap, no padding, no border, one icon size for the whole row. The border goes
 * too: a plugin border would inset the fill the same way the host's side
 * border does, and the row would be back to mixed shapes.
 *
 * Only a trigger that carries an icon is normalised: a plugin may also put a
 * text-only control in the same slot (the Remote plugin's Exit link), and
 * squeezing that into a 36px square would clip the word instead of showing it.
 *
 * The font size goes to zero as well: a trigger that puts bare text next to
 * its icon (no element around it) has no box to hide, and the text would
 * otherwise spill out of the square. The icon keeps its own size — the sheet
 * pins the svg to 16px below, in pixels, not in em. */
[class*="sidebarCol"] [class*="panelList"] > [data-dsh-enhance-entries] button:has(svg, img) {
  flex: none !important;
  display: inline-flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 0 !important;
  box-sizing: border-box !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  background-clip: border-box !important;
  border-radius: 12px !important;
  font-size: 0 !important;
}
[class*="sidebarCol"] [class*="panelList"] > [data-dsh-enhance-entries] button svg {
  flex: none !important;
  width: 16px !important;
  height: 16px !important;
}
/* The row is a strip of glyphs: every entry shows its icon and nothing else.
 *
 * A plugin that joins the row brings its footer markup with it, and that
 * markup is written for a wide footer row — the Remote plugin's entry is an
 * icon+label pill, so in the 36px square its label spilled out as a clipped
 * "R…". The label is dropped by shape rather than by name, because the markup
 * is the plugin's own: inside the relocated container an element that carries
 * no icon is text. The has() selector keeps an icon wrapper (a span around an
 * svg) alive, and the empty check keeps the plugin's own badge dots.
 *
 * The trigger keeps its title and aria-label, so the icon still names the
 * plugin on hover and to a screen reader; only the visible text goes.
 */
[class*="sidebarCol"] [class*="panelList"] > [data-dsh-enhance-entries] :where(span, label, p, div):not(:empty):not(:has(svg)):not(:has(img)) {
  display: none !important;
}
/* The rail keeps the host's own treatment: the footer action block is hidden
   there exactly as the host hides it, so the strip keeps only the app's icons. */
[class*="sidebarCol"] [class*="_root"][class*="collapsed"] [data-dsh-enhance-entries] {
  display: none !important;
}

/* The right sidebar's Start page lists its tools as one centred column of
 * 380px rounded rectangles (the host's guide entries). Two per row, wrapping,
 * matches the host's own tool grid, and the column stops being a fixed width
 * so the pair fills the pane. */
[class*="_guide"]:has([data-sidebar-right-guide-entry]) {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  align-content: center !important;
  justify-items: stretch !important;
}
[class*="_guide"]:has([data-sidebar-right-guide-entry]) [class*="entryCell"],
[class*="_guide"]:has([data-sidebar-right-guide-entry]) [class*="moreAnchor"] {
  width: auto !important;
  max-width: none !important;
}
/* The entry sizes to its label, so it would sit as a short pill at the left of
 * its cell. Stretching it makes each card fill its half of the row. The More
 * tools card is the same entry class but carries no data attribute, so it is
 * named alongside the attributed ones. */
[data-sidebar-right-guide-entry],
[class*="_guide"] [class$="_entry"] {
  width: 100% !important;
  max-width: none !important;
  box-sizing: border-box !important;
}

/* The compass mark above the list is decoration; the entries name themselves. */
[class*="_guide"]:has([data-sidebar-right-guide-entry]) [class*="hero"] {
  display: none !important;
}

/* The entries become pills, a third shorter than the host's 56px floor. The
 * radius supplies the curve and the superellipse decides its shape: 1.5
 * flattens the ends toward a rounded rectangle and higher values go squarer,
 * so 1 — a plain ellipse — is the capsule. The attribute is the host's own
 * marker on a guide entry, so no other button is touched. */
[data-sidebar-right-guide-entry],
[class*="_guide"] [class$="_entry"] {
  border-radius: 999px !important;
  corner-shape: superellipse(1) !important;
  min-height: 0 !important;
  height: 37px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

/* Two more chips that paint a small rounded rectangle: the preset picker in
 * the composer (its hover fill shows the 8px radius) and the background-job
 * count in the session header. Named exactly, because "_seat" and "_trigger"
 * also occur inside the account menu, the access-mode picker and the model
 * picker, which keep their own shape. */
.ufIuna_seat,
._4iHfma_trigger {
  border-radius: 999px !important;
  corner-shape: superellipse(1) !important;
}

/* The composer's plain chips grow a rounded-rectangle hover fill: the
 * workspace picker, the new-worktree toggle, the access-mode picker and the
 * model picker. Only the hover fill changes shape, so the resting chip stays
 * as the host drew it. */
._8tPydW_workspace:hover,
.ZTF-0q_toggle:hover,
.SJRB_q_trigger:hover,
.htuFrW_root:hover .htuFrW_trigger {
  border-radius: 999px !important;
  corner-shape: unset !important;
}

/* The send button only looks solid while the pointer is over it: the host
 * fades it while disabled and swaps its fill for a darker one on hover. It keeps
 * the solid fill whenever it can be clicked, and stays faded when it cannot.
 *
 * While it can be clicked it is a solid disc of the deep blue with a white
 * arrow. The host's dark theme paints it in the pale accent instead, which
 * reads as a washed-out pill; the light theme already uses the deep blue, so
 * naming the static token makes the button look the same in both. */
.JZLxKW_primary:not(:disabled) {
  background: var(--dsw-static-deepseek-500) !important;
  color: #fff !important;
}
.JZLxKW_primary:not(:disabled):hover {
  background: var(--dsw-static-deepseek-400) !important;
}

/* The Preview chip and the "Into the Unknown" line are labels, not controls.
 * The whale stays. */
._8tPydW_previewBadge,
._8tPydW_titleGroup {
  display: none !important;
}

.ga5fXW_split {
  border-radius: var(--dsw-radius-xl) !important;
}

/* The whale swims the way a whale swims: one long, unhurried passage across
 * the open water of the headline row, a slow rise and fall, and two wide turns
 * at the ends of the row. The previous version darted between the edges every
 * few hundred milliseconds, which read as a fish being startled rather than one
 * making its way.
 *
 * Travel and body share one element and one transform. With the scale on a
 * parent, the parent's scale also scales the child's translation, so the
 * whale collapsed back to the start of the row while it turned. Here the turn
 * is a dip to edge-on inside the same transform as the swim, and the fish
 * never leaves the path it is swimming.
 *
 * The host draws the fish facing left, so the sign of the scale carries the
 * facing: mirrored while it swims right, upright while it swims left. The
 * rotations are negated in the mirrored stretch, because a mirrored element
 * turns the other way on screen. */
@keyframes dsh-enhance-whale-travel {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(-1.05, 0.96);
  }
  8% {
    transform: translate(66px, -14px) rotate(3deg) scale(-1.05, 0.96);
  }
  16% {
    transform: translate(140px, -6px) rotate(-2deg) scale(-0.97, 1.04);
  }
  24% {
    transform: translate(212px, -18px) rotate(3deg) scale(-1.05, 0.96);
  }
  32% {
    transform: translate(280px, -8px) rotate(-2deg) scale(-0.97, 1.04);
  }
  40% {
    transform: translate(336px, 8px) rotate(-5deg) scale(-1.05, 0.96);
  }
  47% {
    transform: translate(368px, 30px) rotate(-11deg) scale(-0.97, 1.04);
  }
  50% {
    transform: translate(378px, 42px) rotate(-13deg) scale(-0.5, 1);
  }
  52% {
    transform: translate(372px, 48px) rotate(-12deg) scale(-0.06, 1.05);
  }
  54% {
    transform: translate(358px, 52px) rotate(-8deg) scale(0.06, 1.05);
  }
  57% {
    transform: translate(330px, 56px) rotate(4deg) scale(1.05, 0.96);
  }
  63% {
    transform: translate(272px, 58px) rotate(3deg) scale(0.97, 1.04);
  }
  71% {
    transform: translate(196px, 54px) rotate(5deg) scale(1.05, 0.96);
  }
  78% {
    transform: translate(134px, 44px) rotate(7deg) scale(0.97, 1.04);
  }
  86% {
    transform: translate(58px, 26px) rotate(8deg) scale(1.05, 0.96);
  }
  93% {
    transform: translate(10px, 4px) rotate(6deg) scale(0.97, 1.04);
  }
  95% {
    transform: translate(-14px, -12px) rotate(4deg) scale(0.2, 1.02);
  }
  98% {
    transform: translate(-8px, -10px) rotate(-3deg) scale(-0.2, 1.02);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(-1.05, 0.96);
  }
}
/* The bubbles the whale leaves behind. Each one is let go at the fish, rises,
 * swells on the way up, and pops: the last stretch of the keyframe opens the
 * ring and fades it out. */
.dsh-enhance-bubble {
  position: fixed;
  border-radius: 50%;
  border: 1px solid rgba(72, 132, 180, 0.42);
  background: radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.98), rgba(186, 220, 242, 0.42) 72%);
  pointer-events: none;
  z-index: 30;
  animation: dsh-enhance-bubble 2.6s cubic-bezier(0.2, 0.6, 0.35, 1) forwards;
}
body[data-ds-dark-theme] .dsh-enhance-bubble {
  border-color: rgba(186, 224, 255, 0.5);
  background: radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.52), rgba(200, 230, 255, 0.08) 72%);
}
@keyframes dsh-enhance-bubble {
  0% {
    transform: translate(0, 0) scale(0.3);
    opacity: 0;
  }
  14% {
    opacity: 0.85;
  }
  60% {
    transform: translate(2px, -30px) scale(1);
    opacity: 0.8;
  }
  80% {
    transform: translate(-2px, -48px) scale(1.14);
    opacity: 0.75;
  }
  100% {
    transform: translate(1px, -62px) scale(2.1);
    opacity: 0;
  }
}
/* The headline row is only as wide as its contents, which leaves the whale
 * nowhere to swim but across the letters. Stretching the row gives it open
 * water on both sides; the input card below keeps its own width. */
._8tPydW_headline {
  width: calc(100vw - 520px) !important;
  max-width: 960px !important;
}

/* The GenUI prompt toggle paints an inset ring and a fill while a mode is on.
 * It rests plain and only shows its fill under the pointer. */
.aG4Rta_trigger[data-active] {
  box-shadow: none !important;
  background: transparent !important;
}
.aG4Rta_trigger[data-active]:hover {
  background: var(--dsw-alias-interactive-bg-hover) !important;
}

/* The host rounds every corner with a superellipse, which flattens a pill
 * back into a rounded rectangle. The variable is what that rule reads. */
:root {
  --dsw-corner-shape: superellipse(1) !important;
}
@media (prefers-reduced-motion: no-preference) {
  ._8tPydW_fish {
    animation: dsh-enhance-whale-travel 24s linear infinite !important;
    transform-origin: 50% 60% !important;
  }
}
`
