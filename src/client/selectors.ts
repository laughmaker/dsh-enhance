/**
 * Host anchors, one map per app.
 *
 * The shared rules (markdown measure, annotation chrome) stay in the DSH
 * stylesheets and are not rewritten. Where a host hashes a class, or DS Bot
 * wraps a bubble in an extra node, the map carries the anchor. DSH keeps the
 * hashes those sheets already name. DS Bot carries the hashes in
 * `@deepseek-ai/dsh` 0.2.2-rc.1 as shipped in DS Bot 0.3.5.
 *
 * Two DS Bot anchors are deliberately absent: the old split-button hash has
 * two successors, and the GenUI trigger has none. They are not guessed here.
 */

/** Anchors a surface needs. Empty string means "the host has no such node". */
export interface SelectorMap {
  sendButton: string
  fish: string
  headline: string
  previewBadge: string
  titleGroup: string
  workspace: string
  seat: string
  modelTrigger: string
  permissionTrigger: string
  worktreeToggle: string
  /** Extra wrapper around a chat bubble. DS Bot only. */
  bubble: string
  /** Steps from `[data-slot="conversation.chat.node"]` down to the body. */
  markdownBody: string
}

/** Anchors named by the DSH stylesheets. */
export const DSH_SELECTORS: SelectorMap = {
  sendButton: '.JZLxKW_primary',
  fish: '._8tPydW_fish',
  headline: '._8tPydW_headline',
  previewBadge: '._8tPydW_previewBadge',
  titleGroup: '._8tPydW_titleGroup',
  workspace: '._8tPydW_workspace',
  seat: '.ufIuna_seat',
  modelTrigger: '.htuFrW_trigger',
  permissionTrigger: '.SJRB_q_trigger',
  worktreeToggle: '.ZTF-0q_toggle',
  bubble: '',
  markdownBody: '> div > div > div',
}

/**
 * Anchors in DS Bot's dsh-web.
 *
 * `modelTrigger` and `permissionTrigger` are the `trigger` exports of
 * `ModelSelect.module.css` and `PermissionSelect.module.css`.
 */
export const DS_BOT_SELECTORS: SelectorMap = {
  sendButton: '.uV2eYG_primary',
  fish: '.pXSMma_fish',
  headline: '.pXSMma_headline',
  previewBadge: '.pXSMma_previewBadge',
  titleGroup: '.pXSMma_titleGroup',
  workspace: '.pXSMma_workspace',
  seat: '.cubgiG_seat',
  modelTrigger: '._7KE1Ra_trigger',
  permissionTrigger: '.ddpbLW_trigger',
  worktreeToggle: '.aL4l1a_toggle',
  bubble: '.bt-bubble',
  markdownBody: '> div > div > div > div',
}

/**
 * The map for one surface.
 * @param surface - `'dsh'` or `'ds-bot'`.
 * @returns that surface's anchors.
 */
export function selectorsFor(surface: 'dsh' | 'ds-bot'): SelectorMap {
  return surface === 'ds-bot' ? DS_BOT_SELECTORS : DSH_SELECTORS
}
