// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { installOpenArtifactButton } from '../src/client/surfaces/ds-bot/open-artifact.ts'

const footer = (rail = false) => `<aside class="bt-leftcol"><div class="bt-side"><div class="bt-leftcol-foot${rail ? ' bt-leftcol-foot-rail' : ''}"><button class="bt-account" aria-label="Account"></button></div></div></aside>`

it('follows the registered panel and keeps one working button when the footer changes', async () => {
  let registered = false
  let activePanelId: string | null = null
  const listeners = new Map<string, () => void>()
  const subscribe = (name: string, listener: () => void) => {
    listeners.set(name, listener)
    return () => { listeners.delete(name) }
  }
  const selectPanel = vi.fn((id: string) => {
    activePanelId = id
    listeners.get('selection')?.()
  })
  const ctx = {
    slots: {
      entriesOfSlot: (name: string) => {
        if (!registered) return []
        if (name === 'main') return [{ options: { key: 'open-artifact' } }]
        return [{ options: { id: 'open-artifact', label: () => '作品' } }]
      },
      subscribe,
    },
    layout: {
      selectPanel,
      panelInfo: {
        getSnapshot: () => ({ activePanelId }),
        subscribe: (listener: () => void) => subscribe('selection', listener),
      },
    },
    locale: { subscribe: (listener: () => void) => subscribe('locale', listener) },
  } as unknown as Parameters<typeof installOpenArtifactButton>[0]

  const selector = '[data-ds-bot-enhance-open-artifact]'
  const button = () => document.querySelector<HTMLButtonElement>(selector)
  const dispose = installOpenArtifactButton(ctx, document)
  try {
    document.body.innerHTML = footer()
    await Promise.resolve()
    expect(button()).toBeNull()
    registered = true
    listeners.get('main')?.()
    const entry = button()!
    expect(entry.className).toBe('bt-account')
    expect(entry.title).toBe('作品')
    entry.click()
    expect(selectPanel).toHaveBeenCalledWith('open-artifact')
    expect(entry.getAttribute('aria-current')).toBe('page')

    document.body.innerHTML = footer(true)
    await Promise.resolve()
    expect(document.querySelector('.bt-leftcol-foot-rail')?.contains(entry)).toBe(true)
    expect(document.querySelectorAll(selector)).toHaveLength(1)

    const native = document.createElement('button')
    native.setAttribute('aria-label', '作品')
    entry.parentElement!.append(native)
    await Promise.resolve()
    expect(button()).toBeNull()
    native.remove()
    await Promise.resolve()
    expect(button()).toBe(entry)

    registered = false
    listeners.get('main')?.()
    expect(button()).toBeNull()
  } finally {
    dispose()
    document.body.replaceChildren()
  }
  expect(listeners.size).toBe(0)
})
