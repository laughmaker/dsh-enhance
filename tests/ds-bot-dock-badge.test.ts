// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installDsBotDockBadge } from '../src/client/turn-badge.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.replaceChildren()
})

it('repaints the visible unread count after host updates and sidebar commits', async () => {
  vi.useFakeTimers()
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList)
  const paint = vi.fn()
  let refresh!: () => void
  const unsubscribe = vi.fn()
  const dispose = installDsBotDockBadge(document, paint, listener => {
    refresh = listener
    return unsubscribe
  })
  const settle = async () => {
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(50)
  }
  try {
    document.body.innerHTML = '<aside class="bt-leftcol"><div class="bt-row"><i class="bt-unread"></i></div></aside>'
    await settle()
    expect(paint.mock.calls).toEqual([[1]])

    // The host may publish its own count even when our projection is unchanged.
    refresh()
    await settle()
    expect(paint.mock.calls).toEqual([[1], [1]])

    // Reading a row updates the DOM without requiring another store event.
    document.querySelector('.bt-unread')?.remove()
    await settle()
    expect(paint.mock.calls).toEqual([[1], [1], [0]])
  } finally {
    refresh()
    dispose()
  }
  await settle()
  expect(paint).toHaveBeenCalledTimes(3)
  expect(unsubscribe).toHaveBeenCalledOnce()
})
