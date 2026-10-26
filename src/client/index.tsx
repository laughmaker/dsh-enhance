/**
 * dsh-enhance browser half.
 *
 * Two responsibilities, both owned by this plugin's fiber:
 * 1. global presentation migrated out of the installer's injected styles;
 * 2. the transcript selection toolbar — carry a passage into the current draft,
 *    or open a side conversation seeded with it.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller'
import { installStyles } from './styles.ts'
import { installSidebarFloor } from './sidebar-floor.ts'
import { installTurnBadge } from './turn-badge.ts'
import { LOCALE_NS, en, zh } from './locales.ts'

/** The one side conversation this page opens; later requests add to it. */
let openSideChat: SessionId | undefined
import { AnnotationSeat, type AnnotationSeatInjected } from './AnnotationSeat.tsx'
import { addAnnotation, type AnnotationAnchor } from './annotations.ts'
import { registerSideChat, rememberTitle, sideChatAddress } from './side-chat.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Copy owned by the transcript selection toolbar. */
    'dshEnhance': keyof typeof zh
  }
}

/** Required services: slots, dictionaries, session status, the Workspace list, and the right Sidebar. */
export const inject = ['slots', 'locale', 'sessions', 'uiSession', 'workspaces', 'conversation', 'sidebarRight', 'resources', 'sidebarRightTabs']

/**
 * Mount the plugin.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const t: TranslateNS<typeof LOCALE_NS> = ctx.locale.bind(LOCALE_NS)
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-enhance: dictionaries')
  installStyles(ctx)
  // The sidebar's minimum width is a module constant in the layout package, so the
  // drag gesture is taken over to allow 50px below it.
  ctx.effect(() => installSidebarFloor(document), 'dsh-enhance: sidebar floor')
  // Finished-while-away conversations mark the Dock tile through the standard
  // Badging API; the module no-ops where the webview does not implement it.
  ctx.effect(() => installTurnBadge(ctx), 'dsh-enhance: turn badge')
  registerSideChat(ctx, t)

  /**
   * Open a side conversation beside the current one and hand it the passage as
   * an annotation, not as typed text.
   *
   * The side chat keeps the same interaction as the main composer: the passage
   * arrives as one entry in that conversation's annotation pill, so the reader
   * can see what was quoted, edit the instruction there, and fold it into the
   * message with the same gesture. Writing the quote straight into the draft
   * would bury the field they are about to type in.
   * @param passage - the marked passage.
   * @param note - the instruction typed in the popover, when present.
   * @param sourceSessionId - the transcript the passage was selected in.
   * @param anchor - where the passage sits in that transcript.
   * @returns completion once the tab carries the conversation.
   */
  const askInSideChat = async (
    passage: string,
    note = '',
    sourceSessionId?: string,
    anchor?: AnnotationAnchor,
  ): Promise<void> => {
    const workspaceId = ctx.workspaces.list.getSnapshot().items[0]?.workspaceId
    if (workspaceId === undefined) throw new Error(t('error.noWorkspace'))
    const sessionId = sideChatSession()
      ?? (await createSideChatSession(ctx, workspaceId))
    // Reuse the open tab: every request lands in the same side conversation, so a
    // second "Ask in side chat" adds to the panel that is already on screen
    // instead of stacking a new tab per click.
    rememberTitle(sessionId, firstLine(passage))
    // Filed under the side conversation, but pinned in the transcript it quotes:
    // the reader selected these words here, so the pin stays here.
    addAnnotation(sessionId, passage, note, anchor, sourceSessionId)
    // The tab owns the retained conversation, so opening it is what mounts the
    // composer the annotation pill renders into. `revealIfOpened` (the default)
    // focuses the existing tab for this address rather than duplicating it.
    ctx.sidebarRight.openResource(sideChatAddress(sessionId))
  }

  // The seat lives on the composer's overlay anchor: it renders the annotation
  // pill inside the card's own frame and portals the annotation popover next to
  // the live selection.
  ctx.effect(() => ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'dsh-enhance-annotations',
    order: 10,
    locale: LOCALE_NS,
    inject: (): AnnotationSeatInjected => ({ askInSideChat }),
  }, AnnotationSeat)), 'dsh-enhance: annotation seat')
}

/**
 * The side conversation this page keeps open, once one exists.
 * @returns the remembered session id, or undefined before the first request.
 */
function sideChatSession(): SessionId | undefined {
  return openSideChat
}

/**
 * Create the side conversation and remember it.
 * @param ctx - client root carrying the Session controller.
 * @param workspaceId - workspace the conversation belongs to.
 * @returns the new session id.
 */
async function createSideChatSession(ctx: Context, workspaceId: WorkspaceId): Promise<SessionId> {
  const created = await ctx.sessions.create({ workspaceId })
  openSideChat = created as SessionId
  return openSideChat
}

/**
 * First non-empty line of a passage, trimmed for a tab title.
 * @param text - the seeded prompt.
 * @returns a short title.
 */
function firstLine(text: string): string {
  const line = text.split('\n').find(candidate => candidate.trim().length > 0) ?? text
  const trimmed = line.replace(/^>\s?/, '').trim()
  return trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed
}
