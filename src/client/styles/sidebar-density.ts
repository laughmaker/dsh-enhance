/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`/* Light-surface sidebar text scale. The app's own de-emphasised label tokens
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

[class*="sidebarCol"] [role="treeitem"][data-row-key^="workspace:"] span,
[class*="sidebarCol"] [role="treeitem"][data-row-key^="session:"] span {
  font-size: 11px !important;
  line-height: 15px !important;
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

`
