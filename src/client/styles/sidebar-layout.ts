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
/* One indent for both row kinds.
 *
 * Session rows and workspace rows previously used different start insets, which
 * made the tree look ragged: the folder title sat further right than the session
 * titles under it. Both now start at 5px.
 *
 * A negative margin on the workspace row was tried and reverted: it dragged the
 * whole row — glyph included — past the sidebar's left edge, so every triangle
 * disappeared. The indent is the only lever that stays inside the column. */
[role="treeitem"][data-row-key^="session:"],
[role="treeitem"][data-row-key^="workspace:"] {
  padding-inline-start: 5px !important;
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
  width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  justify-content: center !important;
  gap: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
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
 * gap, no padding, one icon size for the whole row.
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
  width: 36px !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
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
