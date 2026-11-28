import { css as chatMarkdown } from '../../styles/chat-markdown.ts'
import { css as documentPreview } from '../../styles/document-preview.ts'
import { appearanceChromeCss } from './chrome.ts'

export const nativeDocumentPreviewCss = documentPreview.replaceAll('[data-document-markdown]', '.dsb-pv-md')

const legacyAssistant = '[data-chat-flow-kind="assistant-step"]'
const legacyMarkdown = '[class*="_markdown"]'
const nativeAssistant = '.dsb-dsh-asst-body'

export const nativeChatMarkdownCss = chatMarkdown.replaceAll(legacyAssistant, `${nativeAssistant}, ${legacyAssistant}`)

export function buildAppearanceStylesheet(): string {
  // The Bot and Classic transcripts both render md_markdown inside their own assistant body.
  const markdown = ':is(.bt-bubble, .dsb-dsh-asst-body) .md_markdown'
  const appearanceChatCss = chatMarkdown
    .replaceAll(`:is(${legacyAssistant}, ${legacyMarkdown})`, markdown)
    .replaceAll(legacyMarkdown, markdown)
    .replace(/^\.md-code-block\b/gm, `${markdown} .md-code-block`)
  return `/* BEGIN dsh-enhance DS Bot 0.4.1 appearance */
${appearanceChromeCss().trim()}

${appearanceChatCss.trim()}

${nativeDocumentPreviewCss.trim()}
/* END dsh-enhance DS Bot 0.4.1 appearance */
`
}
