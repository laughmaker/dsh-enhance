/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`[data-side="rightbar"] {
  width: 18px !important;
  margin-left: -9px !important;
  cursor: col-resize;
  -webkit-app-region: no-drag;
}

[data-side="rightbar"]::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 42px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  opacity: .8;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: height 120ms ease, width 120ms ease, background-color 120ms ease;
}

[data-side="rightbar"]:hover::after,
[data-side="rightbar"][data-dragging]::after {
  width: 3px;
  height: 60px;
  background: #8ab4ff;
  opacity: 1;
}
`
