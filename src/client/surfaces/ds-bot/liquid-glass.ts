/** Liquid-glass refraction for the DS Bot session pill.
 *
 * Ported from `lucasromerodb/liquid-glass-effect-macos`
 * (https://github.com/lucasromerodb/liquid-glass-effect-macos) — the source
 * behind the user's CodeSandbox reference (nn5q2y). That repository ships no
 * LICENSE file, so it is used here as an effect reference only.
 *
 * The reference does not build a displacement map by hand. It generates a
 * low-frequency fractal noise, blurs it, and bends the element's backdrop with
 * feDisplacementMap; the element that carries the refraction also carries the
 * backdrop-filter, so the backdrop is softened first and bent afterwards. The
 * visible distortion comes from that chain. feComponentTransfer and
 * feSpecularLighting are part of the original markup and are kept verbatim,
 * even though the reference's own chain never reads their results back.
 *
 * The filter is written once and needs no per-frame work: the turbulence is a
 * pure function of user space, and `filterUnits="objectBoundingBox"` lets the
 * region follow the pill's box, so the filter survives the pill growing when
 * the back arrow appears.
 *
 * chrome.ts carries the layering: `::before` is the effect layer (softening
 * pass plus the bend on the same element, exactly like the reference), `::after`
 * is the tint and the lip, and the pill's own box clips both to the capsule.
 */

const NS = 'http://www.w3.org/2000/svg'

/** The one filter id this module owns on the page. */
export const FILTER_ID = 'dsh-lg-pill'
/** CSS variable chrome.ts reads for the softening pass; unset means "frosted fallback". */
export const BACKDROP_VAR = '--dsh-lg-backdrop'
/** CSS variable chrome.ts reads for the SVG distortion. */
export const FILTER_VAR = '--dsh-lg-filter'
/** Page attribute that says which look is live, for tests and inspection. */
export const MODE_ATTR = 'data-dsh-lg'
/** The element the refraction is drawn on. */
export const PILL_SELECTOR = '.bt-pill'

/** The reference's softening pass on the effect layer: `blur(3px)`. The
 * backdrop is blurred before it is bent, which is what keeps the bend reading
 * as glass instead of as a smeared copy of the text behind. */
export const GLASS_SOFTEN = { blur: 3 } as const

/** Keep the CodeSandbox reference's turbulence and displacement unchanged.
 * Scaling the displacement down and increasing blur erased the visible glass
 * effect in earlier revisions. The capsule clips the reference effect; only
 * its text/content is excluded from filtering. */
export const GLASS_DISTORTION = {
  baseFrequencyX: 0.001,
  baseFrequencyY: 0.005,
  numOctaves: 1,
  seed: 17,
  stdDeviation: 3,
  scale: 200,
  surfaceScale: 5,
  specularConstant: 1,
  specularExponent: 100,
  lightX: -200,
  lightY: -200,
  lightZ: 300,
} as const

/** The value published to `--dsh-lg-backdrop`: the softening pass only. It
 * intentionally carries no url() — Chromium ignores the whole declaration when
 * backdrop-filter references an SVG filter, which is why the bend rides the
 * plain `filter` property, exactly like the reference does. */
export const BACKDROP_VALUE = `blur(${GLASS_SOFTEN.blur}px)`
/** The value published to `--dsh-lg-filter`: the reference's distortion. */
export const FILTER_VALUE = `url(#${FILTER_ID})`

const inert = () => {}

interface FilterParts {
  svg: SVGSVGElement
  filter: SVGFilterElement
}

/** Build the reference's filter: turbulence → component transfer → blur →
 * specular lighting → composite → displacement. */
function buildFilter(root: Document): FilterParts {
  const svg = root.createElementNS(NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('data-plugin', 'ds-bot-enhance-liquid-glass')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'

  const filter = root.createElementNS(NS, 'filter')
  filter.setAttribute('id', FILTER_ID)
  // The region follows the element's box, as in the reference.
  filter.setAttribute('x', '0%')
  filter.setAttribute('y', '0%')
  filter.setAttribute('width', '100%')
  filter.setAttribute('height', '100%')
  filter.setAttribute('filterUnits', 'objectBoundingBox')

  const turbulence = root.createElementNS(NS, 'feTurbulence')
  turbulence.setAttribute('type', 'fractalNoise')
  turbulence.setAttribute(
    'baseFrequency',
    `${GLASS_DISTORTION.baseFrequencyX} ${GLASS_DISTORTION.baseFrequencyY}`,
  )
  turbulence.setAttribute('numOctaves', String(GLASS_DISTORTION.numOctaves))
  turbulence.setAttribute('seed', String(GLASS_DISTORTION.seed))
  turbulence.setAttribute('result', 'turbulence')

  const transfer = root.createElementNS(NS, 'feComponentTransfer')
  transfer.setAttribute('in', 'turbulence')
  transfer.setAttribute('result', 'mapped')
  const funcR = root.createElementNS(NS, 'feFuncR')
  funcR.setAttribute('type', 'gamma')
  funcR.setAttribute('amplitude', '1')
  funcR.setAttribute('exponent', '10')
  funcR.setAttribute('offset', '0.5')
  const funcG = root.createElementNS(NS, 'feFuncG')
  funcG.setAttribute('type', 'gamma')
  funcG.setAttribute('amplitude', '0')
  funcG.setAttribute('exponent', '1')
  funcG.setAttribute('offset', '0')
  const funcB = root.createElementNS(NS, 'feFuncB')
  funcB.setAttribute('type', 'gamma')
  funcB.setAttribute('amplitude', '0')
  funcB.setAttribute('exponent', '1')
  funcB.setAttribute('offset', '0.5')
  transfer.append(funcR, funcG, funcB)

  const blur = root.createElementNS(NS, 'feGaussianBlur')
  blur.setAttribute('in', 'turbulence')
  blur.setAttribute('stdDeviation', String(GLASS_DISTORTION.stdDeviation))
  blur.setAttribute('result', 'softMap')

  const specular = root.createElementNS(NS, 'feSpecularLighting')
  specular.setAttribute('in', 'softMap')
  specular.setAttribute('surfaceScale', String(GLASS_DISTORTION.surfaceScale))
  specular.setAttribute('specularConstant', String(GLASS_DISTORTION.specularConstant))
  specular.setAttribute('specularExponent', String(GLASS_DISTORTION.specularExponent))
  specular.setAttribute('lighting-color', 'white')
  specular.setAttribute('result', 'specLight')
  const pointLight = root.createElementNS(NS, 'fePointLight')
  pointLight.setAttribute('x', String(GLASS_DISTORTION.lightX))
  pointLight.setAttribute('y', String(GLASS_DISTORTION.lightY))
  pointLight.setAttribute('z', String(GLASS_DISTORTION.lightZ))
  specular.append(pointLight)

  const composite = root.createElementNS(NS, 'feComposite')
  composite.setAttribute('in', 'specLight')
  composite.setAttribute('operator', 'arithmetic')
  composite.setAttribute('k1', '0')
  composite.setAttribute('k2', '1')
  composite.setAttribute('k3', '1')
  composite.setAttribute('k4', '0')
  composite.setAttribute('result', 'litImage')

  const bend = root.createElementNS(NS, 'feDisplacementMap')
  bend.setAttribute('in', 'SourceGraphic')
  bend.setAttribute('in2', 'softMap')
  bend.setAttribute('scale', String(GLASS_DISTORTION.scale))
  bend.setAttribute('xChannelSelector', 'R')
  bend.setAttribute('yChannelSelector', 'G')

  filter.append(turbulence, transfer, blur, specular, composite, bend)
  svg.appendChild(filter)
  return { svg, filter }
}

/**
 * Publish the reference's liquid-glass distortion for the session pill on this
 * document.
 * @param root - the document the plugin runs in.
 * @returns the dispose function; a no-op when the shell cannot refract.
 */
export function installLiquidGlass(root: Document): () => void {
  const win = root.defaultView as (Window & typeof globalThis) | null
  if (!win || !root.body || typeof win.CSS?.supports !== 'function') return inert
  // The bend rides the plain filter property (a url() in backdrop-filter is
  // dropped by Chromium); without filter url() support there is nothing to
  // publish, and chrome.ts keeps its frosted fallback.
  if (!win.CSS.supports('filter', `url(#${FILTER_ID})`)) return inert

  root.getElementById?.(FILTER_ID)?.remove()
  const { svg } = buildFilter(root)
  root.body.appendChild(svg)

  root.documentElement.style.setProperty(BACKDROP_VAR, BACKDROP_VALUE)
  root.documentElement.style.setProperty(FILTER_VAR, FILTER_VALUE)
  root.documentElement.setAttribute(MODE_ATTR, 'refract')

  return () => {
    svg.remove()
    root.documentElement.style.removeProperty(BACKDROP_VAR)
    root.documentElement.style.removeProperty(FILTER_VAR)
    root.documentElement.removeAttribute(MODE_ATTR)
  }
}
