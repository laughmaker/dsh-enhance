/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`/* Workspace rows: swap the folder icon for the disclosure triangle in every
   state, not only on hover.

   The row already renders both slots — a folder span followed by a chevron span
   that holds a right-pointing filled triangle rotated 90deg when expanded. The
   app's own rules are:
     .projectRow .chevron { display: none }
     .projectRow:hover .chevron { display: inline-flex }
     .projectRow:hover .folder { display: none }
   so the triangle exists all along and only the hover swap is what the folder
   icon wins on. Reversing those two declarations permanently is the whole
   change: the folder is hidden at rest, the chevron shows at rest. Both rows
   keep their own reveal on hover, so the hover state needs no rule of its own.
   Class names are hashed per build, hence the substring selectors. */
[role="treeitem"][data-row-key^="workspace:"] [class*="folder"] {
  display: none !important;
}

[role="treeitem"][data-row-key^="workspace:"] [class*="chevron"] {
  display: inline-flex !important;
  color: var(--dsw-alias-label-secondary) !important;
}

/* The triangle is the row's only leading glyph now, so it takes the 16px slot
   the folder used to occupy. */
[role="treeitem"][data-row-key^="workspace:"] [class*="chevron"] svg {
  width: 16px !important;
  height: 16px !important;
}

/* Light-surface sidebar text scale. The app's own de-emphasised label tokens
   resolve to bluish-600 (3.58:1) against the light sidebar, which reads as dim.
   Titles and labels move up to label-primary, and the one step below them
   (section headings, timestamps, key caps) to label-secondary (5.6:1). Both
   tokens already flip per theme, so dark mode keeps its existing palette. */
[role="treeitem"][data-row-key^="workspace:"] [class*="_title"],
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"],
[role="treeitem"][data-row-key^="session:"] [class*="_title"] {
  color: var(--dsw-alias-label-primary) !important;
}

[class*="sidebarCol"] [class*="newSessionLabel"],
[class*="sidebarCol"] [class*="panelTitle"],
[class*="sidebarCol"] [class*="_label"] {
  color: var(--dsw-alias-label-primary) !important;
}

[class*="sidebarCol"] [class*="sectionLabel"] {
  color: var(--dsw-alias-label-secondary) !important;
}

[role="treeitem"][data-row-key^="session:"] [class*="_time"],
[class*="sidebarCol"] kbd {
  color: var(--dsw-alias-label-secondary) !important;
}

[role="treeitem"][data-row-key^="workspace:"] { height: 27.2px !important; }
[role="treeitem"][data-row-key^="session:"] { height: 25.6px !important; }
[role="treeitem"][data-row-key^="workspace:"] span,
[role="treeitem"][data-row-key^="session:"] span { line-height: 16px !important; }

/* Dark mode: the app's label tokens resolve to near-white (label-primary #f9fafb,
   label-secondary #cfd3d6), which reads as glare against the dark sidebar surface.
   Redefining the two tokens inside the sidebar subtree dims only its text; the centre
   column, the right panel and the app's own dark palette keep their values. Measured
   against the dark sidebar surface this takes label-primary from ~16.6:1 to ~11:1 and
   label-secondary from ~11.5:1 to ~7.3:1, so both stay above WCAG AA. The variable
   override needs no !important: every rule above resolves through these tokens. */
body[data-ds-dark-theme] [class*="sidebarCol"] {
  --dsw-alias-label-primary: #c9ced6;
  --dsw-alias-label-secondary: #a2a8b0;
}

/* Text scale for a sidebar this plugin allows to be much narrower than upstream's
   264px. Sizes are one step below the app's own (14/18 -> 11/16) so a 168px rail
   still fits a full session title, and they use the same tokens so both themes
   follow. Specificity is deliberately high: the app sets these on hashed module
   classes, and this sheet must win without depending on load order. */
[class*="sidebarCol"] {
  font-size: 11px !important;
}

/* One type scale for both row kinds.
 *
 * The folder title is a span inside projectText and the session title is a bare
 * span; both carry the app's hashed class, and that class rule (14px) outranks a
 * plain descendant selector. The folder name therefore kept 14px while session
 * titles had shrunk — the mismatch that reads as the two titles not being the
 * same size.
 *
 * Each selector below repeats both the sidebar and row attributes, putting
 * specificity at (0,3,x), and the declaration is marked important: together they
 * beat the app's hashed class whatever order the sheets load in. The nested
 * "span span" form covers the projectText > title wrapper. */
[class*="sidebarCol"] [role="treeitem"][data-row-key^="workspace:"] span,
[class*="sidebarCol"] [role="treeitem"][data-row-key^="workspace:"] span span,
[class*="sidebarCol"] [role="treeitem"][data-row-key^="workspace:"] [class*="projectText"] span,
[class*="sidebarCol"] [role="treeitem"][data-row-key^="session:"] span,
[class*="sidebarCol"] [role="treeitem"][data-row-key^="session:"] span span {
  font-size: 12px !important;
  line-height: 16px !important;
}

[class*="sidebarCol"] [class*="brandName"] {
  font-size: 16px !important;
}

[class*="sidebarCol"] [class*="fallbackBrandName"],
[class*="sidebarCol"] [class*="localBuildBrand"] {
  font-size: 14px !important;
}

[class*="sidebarCol"] [class*="panelTitle"] {
  font-size: 15px !important;
}

[class*="sidebarCol"] [class*="newSessionLabel"] {
  font-size: 12px !important;
}


/* Fold the folder title in beside its triangle.
 *
 * The row spends a 16px glyph lane plus its gap before the title, so the folder
 * name starts well right of the session titles underneath it even though both
 * now use the same type scale. Only the text container moves — the triangle
 * keeps its native size, its lane, and its position — which closes most of the
 * visible step without dragging the row past the sidebar edge (an earlier
 * row-level negative margin did exactly that and hid every glyph).
 *
 * Percentage-free: -8px reclaims the row gap and part of the lane, leaving the
 * glyph clear of the first letter at both 11px and the app's default scales. */
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"] {
  /* Measured in the browser against the live DOM: the session title starts at
     37px (row 12 + padding 5 + its own 4px margin + the workspace indent), the
     folder title at 39px before this shift. -2px lands the folder title on the
     same 37px edge while keeping the 16px triangle lane untouched. */
  margin-inline-start: -2px !important;
}

/* Same-row attribute, same proven selector shape as the rule above (which does
   take effect), applied to the text itself. The folder title's own hashed class
   sets 14px and wins over an inherited value, so the size is set on every
   descendant rather than on the container. Matching the session titles is what
   removes the "two or three pixel" step the reader sees between the two rows. */
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"] * {
  font-size: 12px !important;
  line-height: 16px !important;
}

/* Force the folder title onto the session titles' type scale.
 *
 * The folder title is projectText > span, and the span carries the app's own
 * hashed class whose 14px rule wins against inherited values. The rows also live
 * in a hashed container class, so this selector keys off the row attribute only,
 * with no assumption about the sidebar wrapper. Measured against a screenshot:
 * the folder title rendered at 14px while session titles rendered at 11px, which
 * is the "two or three pixels" size step the reader reports. */
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"],
[role="treeitem"][data-row-key^="workspace:"] [class*="projectText"] span,
[role="treeitem"][data-row-key^="workspace:"] [class*="_title"] {
  font-size: 12px !important;
  line-height: 16px !important;
}
`
