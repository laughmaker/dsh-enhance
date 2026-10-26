/** Global presentation sheets this plugin owns for the lifetime of its fiber. */
import type { Context } from '@deepseek-ai/cordis'
import { css as documentPreview } from './styles/document-preview.ts'
import { css as chatMarkdown } from './styles/chat-markdown.ts'
import { css as rightbarHandle } from './styles/rightbar-handle.ts'
import { css as sidebarDensity } from './styles/sidebar-density.ts'
import { css as sidebarLayout } from './styles/sidebar-layout.ts'
import { css as toolbar } from './styles/toolbar.ts'

/** Stable plugin identity stamped onto every injected style tag. */
export const PLUGIN_ID = 'dsh-enhance'

/** Sheet name to CSS, in cascade order: later sheets win ties against earlier ones. */
const SHEETS: readonly (readonly [string, string])[] = [
  ['document-preview.css', documentPreview],
  ['chat-markdown.css', chatMarkdown],
  ['rightbar-handle.css', rightbarHandle],
  ['sidebar-density.css', sidebarDensity],
  ['sidebar-layout.css', sidebarLayout],
  ['toolbar.css', toolbar],
]

/**
 * Mount every global sheet for exactly the owning plugin lifetime.
 *
 * The tags carry `data-plugin`, so the client module system's entry lifecycle
 * evicts them when this plugin unloads even if the fiber is torn down abruptly.
 * @param ctx - owning plugin context.
 */
export function installStyles(ctx: Context): void {
  if (typeof document === 'undefined') return
  for (const [name, css] of SHEETS) {
    ctx.effect(() => {
      const tag = document.createElement('style')
      tag.dataset.plugin = PLUGIN_ID
      tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`
      tag.textContent = css
      document.head.appendChild(tag)
      return () => { tag.remove() }
    }, `dsh-enhance: ${name} stylesheet`)
  }
}
