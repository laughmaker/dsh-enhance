/**
 * Small bubbles trailing the whale on the empty page.
 *
 * The whale is the host's own hero illustration, and the plugin drives it with
 * a stylesheet animation. A stylesheet cannot put a bubble where the fish
 * happens to be: the bubble has to be let go at the fish's current position
 * and then left behind, and only a script can do that. The bubble itself is
 * drawn and animated by the stylesheet — this module only decides where and
 * when one appears.
 *
 * The fish is found through the plugin's own travel animation rather than
 * through the host's hashed CSS-module class, so the lookup survives a host
 * release that renames that module. Under reduced motion the animation never
 * runs, no fish is found and no bubbles appear, which is the right outcome.
 */

/** Name of the animation the plugin gives the whale; it identifies the fish. */
const TRAVEL_ANIMATION = 'dsh-enhance-whale-travel'

/** Class the stylesheet draws the bubble with. */
const BUBBLE_CLASS = 'dsh-enhance-bubble'

/** How often a bubble is let go, in milliseconds. */
const INTERVAL = 620

/** Bubbles alive at once. Each lives about 2.6s, so the trail stays short. */
const MAX_LIVE = 16

/** Smallest and largest bubble, in pixels. */
const MIN_SIZE = 5
const MAX_SIZE = 9

/**
 * Find the whale.
 *
 * The travel animation is applied to the fish by the plugin's own stylesheet,
 * so the animation is a stable handle on it: the host's class names are
 * hashed per release and change without notice.
 * @param root - document the plugin is mounted in.
 * @returns the whale element, or null when the page has no whale.
 */
function findWhale(root: Document): HTMLElement | null {
  for (const animation of root.getAnimations()) {
    const name = (animation as CSSAnimation).animationName
    if (name !== TRAVEL_ANIMATION) continue
    const target = animation.effect?.target
    // The plugin's bundle can be evaluated in another realm than the page's,
    // where `instanceof HTMLElement` is false for the page's own elements.
    // Duck typing on the node itself is the realm-safe test.
    if (target === null || target === undefined) continue
    const node = target as HTMLElement
    if (node.nodeType === 1 && typeof node.getBoundingClientRect === 'function') return node
  }
  return null
}

/**
 * Let go one bubble at the whale.
 * @param root - document the plugin is mounted in.
 * @param whale - the fish to bubble from.
 * @returns the bubble element, or null when the fish is not on screen.
 */
function spawn(root: Document, whale: HTMLElement): HTMLElement | null {
  const rect = whale.getBoundingClientRect()
  if (rect.width === 0) return null
  const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)
  const bubble = root.createElement('div')
  bubble.className = BUBBLE_CLASS
  bubble.style.width = `${size}px`
  bubble.style.height = `${size}px`
  bubble.style.marginLeft = `${-size / 2}px`
  bubble.style.marginTop = `${-size / 2}px`
  // Let it go from the fish's back, a little off centre so a trail does not
  // read as a straight line.
  bubble.style.left = `${rect.left + rect.width * 0.5 + (Math.random() * 8 - 4)}px`
  bubble.style.top = `${rect.top + rect.height * 0.3}px`
  bubble.style.animationDuration = `${2.2 + Math.random() * 0.8}s`
  root.body.appendChild(bubble)
  return bubble
}

/**
 * Install the bubble trail.
 * @param root - document the plugin is mounted in.
 * @returns disposer that stops the trail and clears the bubbles still up.
 */
export function installWhaleBubbles(root: Document): () => void {
  let live = 0
  const timer = window.setInterval(() => {
    const whale = findWhale(root)
    if (whale === null) return
    if (live >= MAX_LIVE) return
    const bubble = spawn(root, whale)
    if (bubble === null) return
    live += 1
    // The bubble pops at the end of its own animation; take it off the page
    // then, so a trail never accumulates.
    bubble.addEventListener('animationend', () => {
      live -= 1
      bubble.remove()
    })
  }, INTERVAL)

  return () => {
    window.clearInterval(timer)
    live = 0
    root.querySelectorAll(`.${BUBBLE_CLASS}`).forEach((bubble) => { bubble.remove() })
  }
}
