// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { apply } from '../src/client/ds-bot.ts'
import { installPanelWidths } from '../src/client/surfaces/ds-bot/panel-widths.ts'

it('mounts standalone DS Bot styles before the sidebar exists and releases them on unload', () => {
  const cleanups: (() => void)[] = []
  const ctx = { effect: (mount: () => () => void) => { cleanups.push(mount()) } }
  try {
    expect(document.querySelector('.bt-leftcol')).toBeNull()
    apply(ctx)
    const sheets = [...document.head.querySelectorAll('style[data-plugin="ds-bot-enhance"]')]
    expect(sheets.map(sheet => sheet.getAttribute('data-plugin-css'))).toEqual([
      'ds-bot-enhance/document-preview.css',
      'ds-bot-enhance/chat-markdown.css',
      'ds-bot-enhance/ds-bot-chrome.css',
      'ds-bot-enhance/ds-bot-markdown-anchors.css',
    ])
    const [preview, markdown, chrome] = sheets.map(sheet => sheet.textContent)
    expect(preview).toContain('.dsb-pv-md')
    expect(markdown).toContain('.dsb-dsh-asst-body')
    expect(chrome).toContain('.dsb-head:has(.bt-head) .bt-pill')
    expect(chrome).not.toContain('.bt-side-collapse,')
    expect(chrome).not.toContain('.dsb-head:has(.bt-head)::before')
  } finally {
    for (const dispose of cleanups.reverse()) dispose()
  }
  expect(document.head.querySelector('[data-plugin="ds-bot-enhance"]')).toBeNull()
})

it('resizes the native bot column and its chat inset together and restores the preference', () => {
  document.body.innerHTML = `<div class="dsb-frame" data-surface="bot"><main class="dsb-main dsb_centerCol" style="margin-left: 280px"></main></div>
    <div class="bt-leftcol" data-left="open" style="width: 280px"><div class="bt-leftcol-grip"></div></div>`
  const center = document.querySelector<HTMLElement>('.dsb-main')!
  const aside = document.querySelector<HTMLElement>('.bt-leftcol')!
  const grip = aside.querySelector('.bt-leftcol-grip')!
  aside.getBoundingClientRect = () => new DOMRect(0, 0, 280, 500)
  const pointer = (target: EventTarget, type: string, clientX: number, buttons: number) => {
    const event = new MouseEvent(type, { clientX, buttons, bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerId', { value: 1 })
    target.dispatchEvent(event)
  }
  let dispose = installPanelWidths(document)
  try {
    pointer(grip, 'pointerdown', 280, 1)
    pointer(document, 'pointermove', 230, 1)
    expect(aside.style.width).toBe('230px')
    expect(center.style.marginLeft).toBe('230px')
    pointer(document, 'pointerup', 230, 0)
    dispose()
    expect(aside.style.width).toBe('280px')
    expect(center.style.marginLeft).toBe('280px')
    dispose = installPanelWidths(document)
    expect(aside.style.width).toBe('230px')
    expect(center.style.marginLeft).toBe('230px')
  } finally {
    dispose()
    localStorage.clear()
    document.body.replaceChildren()
  }
})
