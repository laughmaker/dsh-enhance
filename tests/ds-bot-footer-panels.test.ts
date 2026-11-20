// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { installFooterPanels } from '../src/client/surfaces/ds-bot/footer-panels.ts'

const footer = (rail = false) => `<aside class="bt-leftcol"><div class="bt-side"><div class="bt-leftcol-foot${rail ? ' bt-leftcol-foot-rail' : ''}"><button class="bt-account" aria-label="Account"></button></div></div></aside>`

it('follows the registered panels and keeps their buttons working when the footer changes', async () => {
  let registered = false
  let skillsRegistered = false
  const skillsIcon = () => null
  const removeSkillsIcon = vi.fn()
  const mountIcon = vi.fn(() => removeSkillsIcon)
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
        if (name === 'main') return [
          ...(registered ? [{ options: { key: 'open-artifact' } }] : []),
          ...(skillsRegistered ? [{ options: { key: 'skills-manager' } }] : []),
        ]
        return [
          ...(registered ? [{ options: { id: 'open-artifact', label: () => '作品' } }] : []),
          ...(skillsRegistered ? [{ options: { id: 'skills-manager', label: () => '技能' }, component: skillsIcon }] : []),
        ]
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
  } as unknown as Parameters<typeof installFooterPanels>[0]

  const selector = '[data-ds-bot-enhance-open-artifact]'
  const button = () => document.querySelector<HTMLButtonElement>(selector)
  const skillsButton = () => document.querySelector<HTMLButtonElement>('[data-ds-bot-enhance-skills-manager]')
  const dispose = installFooterPanels(ctx, document, mountIcon)
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
    expect(skillsButton()).toBeNull()

    skillsRegistered = true
    listeners.get('sidebar.panellist')?.()
    const skills = skillsButton()!
    expect(skills.getAttribute('aria-label')).toBe('技能')
    expect(mountIcon).toHaveBeenCalledWith(skills.querySelector('.ds-footer-panel-icon'), skillsIcon)
    skills.click()
    expect(selectPanel).toHaveBeenLastCalledWith('skills-manager')
    expect(skills.getAttribute('aria-current')).toBe('page')
    expect(entry.hasAttribute('aria-current')).toBe(false)

    document.body.innerHTML = footer(true)
    await Promise.resolve()
    const railFooter = document.querySelector('.bt-leftcol-foot-rail')
    expect(railFooter?.contains(entry)).toBe(true)
    expect(railFooter?.contains(skills)).toBe(true)
    expect(document.querySelectorAll(selector)).toHaveLength(1)
    expect(mountIcon).toHaveBeenCalledTimes(1)

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
    expect(skillsButton()).toBe(skills)

    skillsRegistered = false
    listeners.get('main')?.()
    expect(skillsButton()).toBeNull()
    expect(removeSkillsIcon).toHaveBeenCalledOnce()
  } finally {
    dispose()
    document.body.replaceChildren()
  }
  expect(listeners.size).toBe(0)
})
