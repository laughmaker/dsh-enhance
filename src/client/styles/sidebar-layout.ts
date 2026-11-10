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
`
