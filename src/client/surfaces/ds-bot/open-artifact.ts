import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

const PANEL_ID = 'open-artifact'
const FOOTER_SELECTOR = '.bt-leftcol > .bt-side > .bt-leftcol-foot'
const BUTTON_ATTRIBUTE = 'data-ds-bot-enhance-open-artifact'

/** Add the registered Open Artifact page to DS Bot's custom sidebar footer. */
export function installOpenArtifactButton(ctx: Context, root: Document): () => void {
  const { slots, layout, locale } = ctx
  const panel = () => slots.entriesOfSlot('main').find(({ options }) => options.key === PANEL_ID)
  const label = () => {
    const entry = slots.entriesOfSlot('sidebar.panellist').find(({ options }) => options.id === PANEL_ID)
    const value = entry?.options.label
    return (typeof value === 'function' ? value() : value) || 'Open Artifact'
  }

  const button = root.createElement('button')
  button.type = 'button'
  button.className = 'bt-account'
  button.setAttribute(BUTTON_ATTRIBUTE, '')
  const disc = root.createElement('span')
  disc.className = 'bt-you'
  disc.setAttribute('aria-hidden', 'true')
  const icon = root.createElement('span')
  icon.className = 'ds-open-artifact-icon'
  disc.append(icon)
  button.append(disc)

  const open = () => {
    if (panel()) layout.selectPanel(PANEL_ID)
  }
  button.addEventListener('click', open)

  let footer: Element | null = null
  const sync = () => {
    footer = root.querySelector(FOOTER_SELECTOR)
    if (!footer || !panel()) {
      button.remove()
      return
    }
    const name = label()
    // Let a native entry take over if a future DS Bot release adds it here.
    const native = Array.from(footer.querySelectorAll('button')).some(candidate =>
      candidate !== button && candidate.getAttribute('aria-label') === name,
    )
    if (native) {
      button.remove()
      return
    }
    button.title = name
    button.setAttribute('aria-label', name)
    if (button.parentElement !== footer) footer.append(button)
  }
  const syncSelection = () => {
    if (layout.panelInfo.getSnapshot().activePanelId === PANEL_ID) button.setAttribute('aria-current', 'page')
    else button.removeAttribute('aria-current')
  }

  // DS Bot can replace the footer when the sidebar folds or switches surface.
  const observer = new MutationObserver(records => {
    if (!footer?.isConnected || records.some(record => footer?.contains(record.target))) sync()
  })
  observer.observe(root.documentElement, { childList: true, subtree: true })
  const stopMain = slots.subscribe('main', sync)
  const stopEntries = slots.subscribe('sidebar.panellist', sync)
  const stopLocale = locale.subscribe(sync)
  const stopSelection = layout.panelInfo.subscribe(syncSelection)
  sync()
  syncSelection()

  return () => {
    observer.disconnect()
    stopMain()
    stopEntries()
    stopLocale()
    stopSelection()
    button.removeEventListener('click', open)
    button.remove()
  }
}
