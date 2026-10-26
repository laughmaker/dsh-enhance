/** Copy for the transcript selection toolbar, in every shipped locale. */

/** Locale namespace this plugin owns. */
export const LOCALE_NS = 'dshEnhance'

/** Toolbar copy; the Chinese dictionary is the reference shape. */
export const zh = {
  'toolbar.label': '添加批注',
  'toolbar.placeholder': '这段内容要说明什么？',
  'toolbar.confirm': '添加批注',
  'toolbar.confirmHint': '确认，回车即可',
  'toolbar.sideChat': '侧边提问',
  'toolbar.sideChat.hint': '在右侧栏新开一个会话，从这段内容开始',
  'toolbar.sideChat.busy': '正在打开…',
  'tray.count': '{count} 条批注',
  'tray.hint': '查看已添加的批注，发送时自动附带',
  'tray.noNote': '（仅引用，无说明）',
  'tray.remove': '删除这条批注',
  'tray.edit': '编辑这条批注',
  'tray.reveal': '点击定位到原文',
  'tray.selectedText': '选中文本',
  'tray.comment': '说明',
  'tray.save': '保存',
  'tray.clearAll': '清除全部批注',
  'error.sideChat': '无法打开侧边会话：{message}',
  'error.noWorkspace': '当前没有可用的工作区，无法新建会话。',
} as const

/** Toolbar copy, English. */
export const en: Record<keyof typeof zh, string> = {
  'toolbar.label': 'Add annotation',
  'toolbar.placeholder': 'What should this passage say?',
  'toolbar.confirm': 'Add annotation',
  'toolbar.confirmHint': 'Confirm — or press Enter',
  'toolbar.sideChat': 'Ask in side chat',
  'toolbar.sideChat.hint': 'Open a side conversation seeded with this passage',
  'toolbar.sideChat.busy': 'Opening…',
  'tray.count': '{count} annotations',
  'tray.hint': 'Show the annotations — they are sent with your message',
  'tray.noNote': '(quote only, no note)',
  'tray.remove': 'Remove this annotation',
  'tray.edit': 'Edit this annotation',
  'tray.reveal': 'Click to reveal the passage',
  'tray.selectedText': 'Selected text',
  'tray.comment': 'Comment',
  'tray.save': 'Save',
  'tray.clearAll': 'Clear all annotations',
  'error.sideChat': 'Could not open the side conversation: {message}',
  'error.noWorkspace': 'No workspace is available to open a conversation in.',
}

/** The key set every dictionary must cover. */
export type Key = keyof typeof zh
