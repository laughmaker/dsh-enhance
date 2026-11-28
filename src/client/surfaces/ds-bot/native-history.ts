import { TOP_THRESHOLD } from './auto-load-earlier.ts'

const SCROLLER = '.dsb-scroll[data-conversation-scroll]'
const EARLIER = ':scope > .dsb-column > .bt-earlier-top > button.bt-soft'
const GESTURE_GAP = 250
// The installed native UI uses the same button markup for loading and retry.
// Match its shipped load labels and keep failures and unknown labels manual.
const LOAD_LABELS = new Set([
  'Load earlier', '加载更早的消息', '以前のメッセージを読み込む', '이전 메시지 불러오기',
  'Cargar anteriores', 'Charger les messages précédents', 'Frühere Nachrichten laden',
])

/** Trigger native paging while leaving its scroll position and loading UI to the host. */
export function installNativeHistory(root: Document): () => void {
  const win = root.defaultView as (Window & typeof globalThis) | null
  if (!win) return () => {}
  const events = new win.AbortController()
  const options = { signal: events.signal, passive: true }
  let scroller: HTMLElement | null = null
  let lastInput = -Infinity
  let triggered = false
  let frame = 0

  const inspect = () => {
    frame = 0
    if (!scroller?.isConnected || triggered || win.performance.now() - lastInput > GESTURE_GAP) return
    if (scroller.scrollTop > TOP_THRESHOLD) return
    const button = scroller.querySelector<HTMLButtonElement>(EARLIER)
    if (!button || button.disabled || !LOAD_LABELS.has(button.textContent.trim())) return
    triggered = true
    button.click()
  }
  const schedule = () => { if (!frame) frame = win.requestAnimationFrame(inspect) }
  const onInput = (target: EventTarget | null) => {
    if (!(target instanceof win.Element)) return
    const candidate = target.closest<HTMLElement>(SCROLLER)
    if (!candidate) return
    const now = win.performance.now()
    if (scroller !== candidate || now - lastInput >= GESTURE_GAP) triggered = false
    scroller = candidate
    lastInput = now
    if (!triggered) schedule()
  }
  root.addEventListener('wheel', event => {
    if (event.defaultPrevented || event.ctrlKey || event.shiftKey || event.buttons || event.deltaY >= -Math.abs(event.deltaX)) return
    onInput(event.target)
  }, options)
  root.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !['ArrowUp', 'PageUp', 'Home'].includes(event.key)) return
    if (event.target instanceof win.Element && event.target.closest('input, textarea, select, [contenteditable]')) return
    onInput(event.target)
  }, options)
  root.addEventListener('scroll', event => {
    if (event.target === scroller && !triggered && win.performance.now() - lastInput <= GESTURE_GAP) schedule()
  }, { ...options, capture: true })
  return () => { events.abort(); if (frame) win.cancelAnimationFrame(frame) }
}
