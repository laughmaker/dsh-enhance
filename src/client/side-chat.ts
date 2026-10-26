/**
 * Side chat: a conversation created from a transcript selection and shown in
 * the right Sidebar without disturbing the conversation on screen.
 *
 * The tab is a resource tab, not a page: the address carries the conversation
 * id, a provider retains that conversation for the lifetime of the tab (so
 * switching Sessions or reloading the layout keeps the side conversation
 * alive), and the body re-mounts the shared `conversation.content` factory
 * inside a `SessionProvider` — the same composition the subagent chat tab
 * uses, which keeps one conversation implementation in the product.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { LOCALE_NS } from './locales.ts'
import { SideChatBody, SideChatConversation } from './SideChatBody.tsx'

/** Stable implementation identity for this plugin's tab type and body. */
export const SIDE_CHAT_TAB_ID = 'dsh-enhance'

/** Resource scheme for one side conversation. */
export const SIDE_CHAT_PROTOCOL = 'dshenhancechat'

/** Address prefix of every side conversation tab. */
export const SIDE_CHAT_ADDRESS = `dsh-resource://${SIDE_CHAT_PROTOCOL}/session/`

/** Child slot hosting the conversation of one side-chat tab. */
export const SIDE_CHAT_SLOT = 'dshEnhance.sideChat.conversation'

/** Value one live side-chat occurrence retains. */
export interface SideChatResource {
  /** The conversation the tab shows. */
  readonly sessionId: SessionId
  /** The retained conversation reference, released with the tab. */
  readonly reference: unknown
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /** One side conversation hosted by a right-Sidebar tab. */
    dshenhancechat: SideChatResource
  }

  interface SlotMap {
    /** Session-scoped Conversation occurrence hosted by a side-chat tab. */
    'dshEnhance.sideChat.conversation': { kind: 'single'; scope: 'session' }
  }
}

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    /** A right-Sidebar side conversation tab holding its reference. */
    dshEnhanceSideChat: unknown
  }
}

/** Session id → the title its tab was opened with. */
const titles = new Map<string, string>()

/**
 * Build the Sidebar address of one side conversation.
 * @param sessionId - the conversation to show.
 * @returns a `dsh-resource://` address.
 */
export function sideChatAddress(sessionId: SessionId): string {
  return `${SIDE_CHAT_ADDRESS}${encodeURIComponent(sessionId)}`
}

/**
 * Read the conversation id out of a side-chat address.
 * @param address - a resource address.
 * @returns the session id, or undefined when the address is not ours.
 */
export function parseSideChatAddress(address: string): SessionId | undefined {
  if (!address.startsWith(SIDE_CHAT_ADDRESS)) return undefined
  const raw = address.slice(SIDE_CHAT_ADDRESS.length)
  if (raw.length === 0 || raw.includes('/') || raw.includes('?')) return undefined
  try {
    const decoded = decodeURIComponent(raw)
    return decoded.length === 0 ? undefined : decoded as SessionId
  } catch {
    return undefined
  }
}

/**
 * Remember the title a side chat was opened with.
 * @param sessionId - the side conversation.
 * @param title - first line of the seeded passage.
 */
export function rememberTitle(sessionId: SessionId, title: string): void {
  titles.set(sessionId, title)
}

/**
 * Read a remembered side-chat title.
 * @param sessionId - the side conversation.
 * @returns the remembered title, when this page opened it.
 */
export function rememberedTitle(sessionId: string): string | undefined {
  return titles.get(sessionId)
}

/**
 * Register the side-chat resource owner and its right-Sidebar presentation.
 * @param ctx - client root carrying Sessions, resources, Slots, and the registry.
 * @param t - this plugin's translator.
 */
export function registerSideChat(ctx: Context, t: TranslateNS<typeof LOCALE_NS>): void {
  ctx.effect(() => ctx.resources.register({
    protocol: SIDE_CHAT_PROTOCOL,
    async *open(address, { signal }) {
      const sessionId = parseSideChatAddress(address)
      if (sessionId === undefined) throw new Error(`dsh-enhance: invalid side-chat address "${address}"`)
      if (signal.aborted) return
      const reference = ctx.sessions.retain(sessionId, { source: 'dshEnhanceSideChat', signal })
      try {
        yield { ok: true, value: { sessionId, reference } }
        await new Promise<void>((resolve) => {
          if (signal.aborted) { resolve(); return }
          signal.addEventListener('abort', () => { resolve() }, { once: true })
        })
      } finally {
        reference.release()
      }
    },
  }), 'dsh-enhance: side chat resource')

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: SIDE_CHAT_TAB_ID,
    kind: SIDE_CHAT_PROTOCOL,
    patterns: [`${SIDE_CHAT_ADDRESS}**`],
    priority: 'extension',
    multiple: true,
    canOpen: address => parseSideChatAddress(address) !== undefined,
    title: (address) => {
      const sessionId = parseSideChatAddress(address)
      return sessionId === undefined ? t('toolbar.sideChat') : rememberedTitle(sessionId) ?? t('toolbar.sideChat')
    },
  }), 'dsh-enhance: side chat tab type')

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: SIDE_CHAT_TAB_ID,
    locale: LOCALE_NS,
    children: { 'dshEnhance.sideChat.conversation': { kind: 'single', scope: 'session' } },
  }, SideChatBody)), 'dsh-enhance: side chat tab body')

  ctx.effect(() => ctx.slots.inject(SIDE_CHAT_SLOT, () => ctx.slots.register({
    name: SIDE_CHAT_SLOT,
    locale: LOCALE_NS,
  }, SideChatConversation)), 'dsh-enhance: side chat conversation')
}
