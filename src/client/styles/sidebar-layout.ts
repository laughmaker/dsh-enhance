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
[role="treeitem"][data-row-key^="session:"] {
  padding-left: 10px !important;
}
[class*="sidebarCol"] [class*="panelList"] {
  position: absolute !important;
  right: 12px !important;
  bottom: 14px !important;
  z-index: 5;
  /* Upstream stacks the Plugins and Automation icons in a column. A row keeps
     both reachable on one line beside the account name instead. */
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 0 !important;
  margin: 0 !important;
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
`
