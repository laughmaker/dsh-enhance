// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installSidebarBounce } from '../src/client/surfaces/ds-bot/sidebar-bounce.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.replaceChildren()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

function setup(motion = true, electron = true) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(electron ? 'Mozilla/5.0 Electron/40.0.0' : 'Mozilla/5.0 Chrome/144.0.0.0')
  const animate = vi.fn(function (this: Element, _frames: Keyframe[], _duration: number) {
    return { target: this, cancel: vi.fn(), onfinish: null }
  })
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate })
  vi.stubGlobal('matchMedia', () => ({ matches: motion, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  let frame: FrameRequestCallback | undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => { frame = undefined })
  const tick = () => { const callback = frame; frame = undefined; callback?.(performance.now()) }
  document.body.innerHTML = '<aside class="bt-leftcol"><div class="bt-side"><div class="bt-list"><button></button></div></div></aside><main></main>'
  const list = document.querySelector<HTMLElement>('.bt-list')!
  const height = vi.fn(() => 800)
  const setGeometry = (element: HTMLElement) => {
    Object.defineProperties(element, {
      scrollHeight: { get: height },
      clientHeight: { value: 300 },
    })
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 240, 300))
    vi.spyOn(element.firstElementChild!, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 20, 240, 36))
  }
  setGeometry(list)
  const wheel = (target: Element, deltaY: number, options: WheelEventInit = {}) => {
    const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true, ...options })
    target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  }
  return { list, height, setGeometry, wheel, animate, tick, dispose: installSidebarBounce(document) }
}

it('reads geometry at most once per frame and leaves mid-list reversals and other input native', () => {
  const { list, height, wheel, animate, tick, dispose } = setup()
  try {
    list.scrollTop = 250
    for (const delta of [-48, 48, -48, 48]) wheel(list, delta)
    expect(height).not.toHaveBeenCalled()
    tick()
    expect(height).toHaveBeenCalledOnce()
    expect(animate).not.toHaveBeenCalled()
    expect(list.scrollTop).toBe(250)
    list.scrollTop = 0
    wheel(document.querySelector('main')!, -60)
    wheel(list, -60, { ctrlKey: true })
    wheel(list, -60, { buttons: 1 })
    tick()
    expect(height).toHaveBeenCalledOnce()
    expect(animate).not.toHaveBeenCalled()
  } finally { dispose() }
})

it.each([
  { edge: 'top', start: 8, end: 0, delta: -120, displacement: '0 9px' },
  { edge: 'bottom', start: 492, end: 500, delta: 120, displacement: '0 -9px' },
])('bounces content at the $edge without moving the list or cancelling on reversal', ({ start, end, delta, displacement }) => {
  const { list, wheel, animate, tick, dispose } = setup()
  try {
    list.scrollTop = start
    wheel(list, delta)
    tick()
    expect(animate).not.toHaveBeenCalled()
    list.scrollTop = end
    list.dispatchEvent(new Event('scroll'))
    tick()
    expect(animate).toHaveBeenCalledOnce()
    expect(animate.mock.calls[0][0].map(frame => frame.translate)).toEqual(['0 0', displacement, '0 0'])
    expect(animate.mock.results[0].value.target).toBe(list.firstElementChild)
    expect(list.scrollTop).toBe(end)
    wheel(list, -delta)
    list.scrollTop = start
    list.dispatchEvent(new Event('scroll'))
    tick()
    wheel(list, delta)
    list.scrollTop = end
    list.dispatchEvent(new Event('scroll'))
    tick()
    expect(animate).toHaveBeenCalledOnce()
    expect(animate.mock.results[0].value.cancel).not.toHaveBeenCalled()
  } finally { dispose() }
})

it('animates visible rows inside a tall group without growing the scroll range', () => {
  const { list, wheel, animate, tick, dispose } = setup()
  try {
    const group = document.createElement('div')
    group.className = 'bt-sec-ungrouped'
    const visible = list.firstElementChild!
    const offscreen = document.createElement('button')
    list.append(group)
    group.append(visible, offscreen)
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 240, 800))
    vi.spyOn(offscreen, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 764, 240, 36))
    wheel(list, -120)
    tick()
    expect(animate).toHaveBeenCalledOnce()
    expect(animate.mock.results[0].value.target).toBe(visible)
  } finally { dispose() }
})

it.each([-120, 120])('keeps the sticky tile and covered rows out of the bounce (%i)', delta => {
  const { list, wheel, animate, tick, dispose } = setup()
  try {
    const tile = document.createElement('div')
    tile.className = 'bt-tile-wrap'
    const visible = document.createElement('button')
    list.prepend(tile)
    list.append(visible)
    vi.spyOn(tile, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 240, 100))
    vi.spyOn(visible, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 120, 240, 36))
    list.scrollTop = delta < 0 ? 0 : 500
    wheel(tile, delta)
    tick()
    expect(animate).toHaveBeenCalledOnce()
    expect(animate.mock.results[0].value.target).toBe(visible)
  } finally { dispose() }
})

it('follows list replacement and cancels the active animation on disposal', () => {
  const { list, setGeometry, wheel, animate, tick, dispose } = setup()
  const replacement = list.cloneNode(true) as HTMLElement
  setGeometry(replacement)
  wheel(list, -60)
  list.replaceWith(replacement)
  wheel(replacement, -60)
  tick()
  expect(animate).toHaveBeenCalledOnce()
  dispose()
  expect(animate.mock.results[0].value.cancel).toHaveBeenCalledOnce()
  wheel(replacement, -60)
  tick()
  expect(animate).toHaveBeenCalledOnce()
})

it.each([
  { mode: 'reduced motion', motion: false, electron: true },
  { mode: 'standalone browsers', motion: true, electron: false },
])('leaves scrolling to the browser on $mode', ({ motion, electron }) => {
  const { list, wheel, animate, tick, dispose } = setup(motion, electron)
  try {
    wheel(list, -60)
    tick()
    expect(animate).not.toHaveBeenCalled()
  } finally { dispose() }
})
