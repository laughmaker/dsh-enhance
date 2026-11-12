/** Global presentation sheets this plugin owns for the lifetime of its fiber. */
import type { Context } from '@deepseek-ai/cordis'
import { css as documentPreview } from './styles/document-preview.ts'
import { css as chatMarkdown } from './styles/chat-markdown.ts'
import { css as rightbarHandle } from './styles/rightbar-handle.ts'
import { css as runningSpinner } from './styles/running-spinner.ts'
import { css as sidebarDensity } from './styles/sidebar-density.ts'
import { css as sidebarLayout } from './styles/sidebar-layout.ts'
import { css as toolbar } from './styles/toolbar.ts'
import { css as fileMenu } from './styles/file-menu.ts'
import { css as dsBotChrome } from './surfaces/ds-bot/chrome.ts'
import { css as dsBotMarkdownAnchors } from './surfaces/ds-bot/markdown-anchors.ts'
import { currentSurface, stylePluginId, type Surface } from './surface.ts'

/** Stable plugin identity stamped onto every injected style tag. */
export const PLUGIN_ID = 'dsh-enhance'

/** DSH sheet name to CSS, in cascade order: later sheets win ties against earlier ones. */
export const SHEETS: readonly (readonly [string, string])[] = [
  ['document-preview.css', documentPreview],
  ['chat-markdown.css', chatMarkdown],
  ['rightbar-handle.css', rightbarHandle],
  ['running-spinner.css', runningSpinner],
  ['sidebar-density.css', sidebarDensity],
  ['sidebar-layout.css', sidebarLayout],
  ['toolbar.css', toolbar],
  ['file-menu.css', fileMenu],
]

/** Rules both apps share verbatim: markdown, annotation chrome, context menus. */
const SHARED_SHEETS: readonly (readonly [string, string])[] = [
  ['document-preview.css', documentPreview],
  ['chat-markdown.css', chatMarkdown],
  ['toolbar.css', toolbar],
  ['file-menu.css', fileMenu],
]

/** DS Bot mounts the shared rules plus its own chrome and md anchors; no DSH chrome. */
export const DS_BOT_SHEETS: readonly (readonly [string, string])[] = [
  ...SHARED_SHEETS,
  ['ds-bot-chrome.css', dsBotChrome],
  ['ds-bot-markdown-anchors.css', dsBotMarkdownAnchors],
]

/**
 * The sheet set for one surface. The two sets never mount together.
 * @param surface - the decided surface.
 * @returns that surface's sheets.
 */
export function sheetsFor(surface: Surface): readonly (readonly [string, string])[] {
  return surface === 'ds-bot' ? DS_BOT_SHEETS : SHEETS
}

/**
 * Mount one surface's sheets for exactly the owning plugin lifetime.
 *
 * The tags carry `data-plugin`, so the client module system's entry lifecycle
 * evicts them when this plugin unloads even if the fiber is torn down abruptly.
 * @param ctx - owning plugin context.
 */
export function installStyles(ctx: Context): void {
  if (typeof document === 'undefined') return
  const surface = currentSurface()
  const pluginId = stylePluginId(surface)
  for (const [name, css] of sheetsFor(surface)) {
    ctx.effect(() => {
      const tag = document.createElement('style')
      tag.dataset.plugin = pluginId
      tag.dataset.pluginCss = `${pluginId}/${name}`
      tag.textContent = css
      document.head.appendChild(tag)
      return () => { tag.remove() }
    }, `${pluginId}: ${name} stylesheet`)
  }
}
