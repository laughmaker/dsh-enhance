import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ComponentType } from 'react'

const FOOTER_SELECTOR = '.bt-leftcol > .bt-side > .bt-leftcol-foot'
const PANELS = [
  { id: 'open-artifact', fallbackLabel: 'Open Artifact', useRegisteredIcon: false },
  { id: 'skills-manager', fallbackLabel: 'Skills Manager', useRegisteredIcon: true },
] as const

type PanelIcon = ComponentType<{ size: number }>
type MountIcon = (target: HTMLElement, icon: PanelIcon) => () => void

/** Mount shortcuts to registered pages in DS Bot's custom sidebar footer. */
export function installFooterPanels(ctx: Context, root: Document, mountIcon: MountIcon): () => void {
  const { slots, layout, locale } = ctx
  const mainExists = (id: string) => slots.entriesOfSlot('main').some(({ options }) => options.key === id)
  const panels = PANELS.map(panel => {
    const button = root.createElement('button')
    button.type = 'button'
    button.className = 'bt-account'
    button.setAttribute(`data-ds-bot-enhance-${panel.id}`, '')
    const disc = root.createElement('span')
    disc.className = 'bt-you'
    disc.setAttribute('aria-hidden', 'true')
    const icon = root.createElement('span')
    icon.className = panel.useRegisteredIcon ? 'ds-footer-panel-icon' : 'ds-open-artifact-icon'
    disc.append(icon)
    button.append(disc)

    const open = () => {
      if (mainExists(panel.id)) layout.selectPanel(panel.id)
    }
    button.addEventListener('click', open)
    return { ...panel, button, icon, open, component: undefined as PanelIcon | undefined, stopIcon: undefined as (() => void) | undefined }
  })

  const updateIcon = (panel: typeof panels[number], component: PanelIcon | undefined) => {
    if (panel.component === component) return
    panel.stopIcon?.()
    panel.stopIcon = component ? mountIcon(panel.icon, component) : undefined
    panel.component = component
  }

  let footer: Element | null = null
  const sync = () => {
    footer = root.querySelector(FOOTER_SELECTOR)
    const entries = slots.entriesOfSlot('sidebar.panellist')
    for (const panel of panels) {
      const { id, button, useRegisteredIcon, fallbackLabel } = panel
      const entry = entries.find(({ options }) => options.id === id)
      if (!footer || !mainExists(id) || (useRegisteredIcon && !entry)) {
        button.remove()
        updateIcon(panel, undefined)
        continue
      }
      const label = entry?.options.label
      const name = (typeof label === 'function' ? label() : label) || fallbackLabel
      // Let a native entry take over if DS Bot adds it to this footer.
      const native = Array.from(footer.querySelectorAll('button')).some(candidate =>
        candidate !== button && candidate.getAttribute('aria-label') === name,
      )
      if (native) {
        button.remove()
        updateIcon(panel, undefined)
        continue
      }
      button.title = name
      button.setAttribute('aria-label', name)
      if (button.parentElement !== footer) footer.append(button)
      if (useRegisteredIcon) updateIcon(panel, entry?.component as PanelIcon | undefined)
    }
  }
  const syncSelection = () => {
    const activeId = layout.panelInfo.getSnapshot().activePanelId
    for (const { id, button } of panels) {
      if (activeId === id) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    }
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
    for (const panel of panels) {
      updateIcon(panel, undefined)
      panel.button.removeEventListener('click', panel.open)
      panel.button.remove()
    }
  }
}
