/**
 * The two components of a side-chat tab: the tab body that binds the tab's
 * retained conversation into a Session scope, and the conversation host that
 * re-mounts the shared `conversation.content` factory inside it.
 */
import type { ReactNode } from 'react'
import type {
  PropsRenderFactories, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { UseResource } from '@deepseek-ai/dsh-client-resources/client'
import type { UseSidebarRightTabInfo } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SideChatResource } from './side-chat.ts'

/** Props a side-chat tab body receives from the slot kit. */
export type SideChatBodyProps =
  PropsRuntime<'sidebar.right.pane.tab'>
  & PropsRenderSlots<'dshEnhance.sideChat.conversation'>
  & {
    /** Live resource value for this tab's address. */
    readonly useResource: UseResource
    /** Tab record and lifecycle hooks. */
    readonly useTabInfo: UseSidebarRightTabInfo
    /** Scope provider for an explicitly named conversation. */
    readonly SessionProvider: (props: { session: SessionReference; children: ReactNode }) => ReactNode
  }

/**
 * Bind the tab's retained conversation around its slot.
 * @param props - slot shares for this tab occurrence.
 * @returns the conversation host, or nothing while the resource opens.
 */
export function SideChatBody(props: SideChatBodyProps): ReactNode {
  const { tab } = props.useTabInfo()
  const resource = props.useResource<'dshenhancechat'>(tab.contentId)
  const value = resource.value as SideChatResource | undefined
  if (value === undefined) return null
  // The marker is what tells this plugin's composer seat that it lives in a
  // Sidebar conversation. It is rendered here, not inferred from the DOM above,
  // so it survives a reload that restores the tab from the saved layout.
  return (
    <div className="dsh-enhance-side-chat" data-dsh-enhance-side-chat="">
      <props.SessionProvider session={value.reference as SessionReference}>
        {props.renderSlot('dshEnhance.sideChat.conversation', {})}
      </props.SessionProvider>
    </div>
  )
}

/** Local Chat-only view selection for the embedded conversation occurrence. */
function FixedChatConversationView(props: {
  readonly renderSlot: (name: 'conversation.session', props: { view: string }) => ReactNode
}): ReactNode {
  return <>{props.renderSlot('conversation.session', { view: 'chat' })}</>
}

/** Props of the conversation host inside one side-chat tab. */
export type SideChatConversationProps =
  PropsRuntime<'dshEnhance.sideChat.conversation'>
  & PropsRenderFactories

/**
 * Mount the shared Conversation content for the Session scope around this slot.
 * @param props - factory-rendering share for this occurrence.
 * @returns the conversation surface.
 */
export function SideChatConversation(props: SideChatConversationProps): ReactNode {
  return props.renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, {
    slots: { views: FixedChatConversationView },
  })
}
