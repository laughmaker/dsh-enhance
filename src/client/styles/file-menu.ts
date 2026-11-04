/** Right-click file menu: a small native-looking panel over the transcript. */
export const css = String.raw`/* The menu is appended to body, outside every chat container, so it needs
   its own type scale and surface. The dark variant keys off the same theme
   attribute the other sheets use, which the app sets on html or body. */
.dsh-file-menu {
  position: fixed !important;
  z-index: 2147483000 !important;
  box-sizing: border-box !important;
  min-width: 232px !important;
  max-width: 320px;
  max-height: calc(100vh - 16px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px !important;
  border: 1px solid rgb(0 0 0 / 10%) !important;
  border-radius: 12px !important;
  background: rgb(250 250 252 / 94%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
  box-shadow: 0 18px 48px rgb(0 0 0 / 22%), 0 2px 8px rgb(0 0 0 / 12%) !important;
  color: #1c1c1e !important;
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  text-align: left !important;
}

[data-ds-dark-theme] .dsh-file-menu {
  border-color: rgb(255 255 255 / 12%) !important;
  background: rgb(38 38 40 / 92%) !important;
  box-shadow: 0 18px 48px rgb(0 0 0 / 45%), 0 2px 8px rgb(0 0 0 / 30%) !important;
  color: #f2f2f4 !important;
}

.dsh-file-menu__header {
  padding: 6px 10px 8px !important;
  color: rgb(0 0 0 / 45%) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: .01em;
  cursor: default;
}

[data-ds-dark-theme] .dsh-file-menu__header {
  color: rgb(255 255 255 / 55%) !important;
}

.dsh-file-menu__item {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 7px 10px !important;
  border: 0 !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: inherit !important;
  font: inherit !important;
  text-align: left !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  appearance: none;
  -webkit-appearance: none;
}

.dsh-file-menu__item:hover,
.dsh-file-menu__item:focus-visible {
  background: rgb(0 0 0 / 8%) !important;
  outline: none !important;
}

[data-ds-dark-theme] .dsh-file-menu__item:hover,
[data-ds-dark-theme] .dsh-file-menu__item:focus-visible {
  background: rgb(255 255 255 / 12%) !important;
}

.dsh-file-menu__chevron {
  font-size: 15px !important;
  line-height: 1 !important;
  opacity: .55;
}

.dsh-file-menu__separator {
  height: 1px !important;
  margin: 5px 6px !important;
  background: rgb(0 0 0 / 10%) !important;
}

[data-ds-dark-theme] .dsh-file-menu__separator {
  background: rgb(255 255 255 / 12%) !important;
}

.dsh-file-menu__submenu {
  min-width: 190px !important;
  max-height: 320px;
  padding: 6px !important;
}

.dsh-file-menu__empty {
  padding: 8px 10px !important;
  color: rgb(0 0 0 / 45%) !important;
  font-size: 12px !important;
}

[data-ds-dark-theme] .dsh-file-menu__empty {
  color: rgb(255 255 255 / 55%) !important;
}

.dsh-file-menu__toast {
  position: fixed !important;
  right: 20px !important;
  bottom: 20px !important;
  z-index: 2147483001 !important;
  box-sizing: border-box !important;
  max-width: 320px;
  padding: 10px 14px !important;
  border: 1px solid rgb(0 0 0 / 10%) !important;
  border-radius: 10px !important;
  background: rgb(250 250 252 / 96%) !important;
  box-shadow: 0 10px 30px rgb(0 0 0 / 18%) !important;
  color: #1c1c1e !important;
  font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

[data-ds-dark-theme] .dsh-file-menu__toast {
  border-color: rgb(255 255 255 / 12%) !important;
  background: rgb(38 38 40 / 96%) !important;
  box-shadow: 0 10px 30px rgb(0 0 0 / 40%) !important;
  color: #f2f2f4 !important;
}
`
