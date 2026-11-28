// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { installNativeHistory } from '../src/client/surfaces/ds-bot/native-history.ts'

it('requests one native page per upward gesture and leaves retry and scrolling to the host', () => {
  document.body.innerHTML = '<div class="dsb-scroll" data-conversation-scroll><div class="dsb-column"><div class="bt-earlier-top"><button class="bt-soft">加载更早的消息</button></div></div></div>'
  const scroll = document.querySelector<HTMLElement>('.dsb-scroll')!
  const button = scroll.querySelector('button')!
  const click = vi.fn()
  button.addEventListener('click', click)
  let frame: FrameRequestCallback | undefined
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1 })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { frame = undefined })
  let now = 0
  const clock = vi.spyOn(window.performance, 'now').mockImplementation(() => now)
  const tick = () => { const next = frame; frame = undefined; next?.(now) }
  const wheel = (deltaY: number) => {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
    scroll.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  }
  const dispose = installNativeHistory(document)
  try {
    scroll.scrollTop = 500
    wheel(-120)
    tick()
    expect(click).not.toHaveBeenCalled()
    scroll.scrollTop = 120
    scroll.dispatchEvent(new Event('scroll'))
    tick()
    expect(click).toHaveBeenCalledOnce()
    expect(scroll.scrollTop).toBe(120)
    wheel(-120)
    tick()
    expect(click).toHaveBeenCalledOnce()
    now += 300
    button.textContent = 'Couldn’t load earlier messages · Retry'
    wheel(-120)
    tick()
    expect(click).toHaveBeenCalledOnce()
    button.textContent = 'Load earlier'
    wheel(-120)
    dispose()
    tick()
    expect(click).toHaveBeenCalledOnce()
  } finally {
    dispose()
    clock.mockRestore()
    cancel.mockRestore()
    raf.mockRestore()
    document.body.replaceChildren()
  }
})
