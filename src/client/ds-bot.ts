import { installStyleSheets } from './styles.ts'
import { nativeChatMarkdownCss, nativeDocumentPreviewCss } from './surfaces/ds-bot/appearance.ts'
import { nativeCss } from './surfaces/ds-bot/chrome.ts'
import { css as markdownAnchors } from './surfaces/ds-bot/markdown-anchors.ts'
import { installLiquidGlass } from './surfaces/ds-bot/liquid-glass.ts'
import { installNativeHistory } from './surfaces/ds-bot/native-history.ts'
import { installPanelWidths } from './surfaces/ds-bot/panel-widths.ts'
import { installSidebarBounce } from './surfaces/ds-bot/sidebar-bounce.ts'

interface NativePluginContext {
  effect(mount: () => () => void): unknown
}

const nativeSheets = [
  ['document-preview.css', nativeDocumentPreviewCss],
  ['chat-markdown.css', nativeChatMarkdownCss],
  ['ds-bot-chrome.css', nativeCss],
  ['ds-bot-markdown-anchors.css', markdownAnchors],
] as const

/** Standalone DS Bot ESM entry for the host's UI plugin runtime. */
export function apply(ctx: NativePluginContext): void {
  if (typeof document === 'undefined') return
  installStyleSheets(ctx, document, 'ds-bot', nativeSheets)
  ctx.effect(() => installSidebarBounce(document))
  ctx.effect(() => installLiquidGlass(document))
  ctx.effect(() => installPanelWidths(document))
  ctx.effect(() => installNativeHistory(document))
}
