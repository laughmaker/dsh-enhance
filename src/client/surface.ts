/**
 * Which app this process is enhancing.
 *
 * One plugin serves both DeepSeek Harness and DS Bot. Their chrome differs, so
 * the process decides once and only one branch mounts. Shared features
 * (annotations, markdown, menus, the badge mechanism) run on both.
 */

/** The two hosts this plugin knows. */
export type Surface = 'dsh' | 'ds-bot'

/** What a caller can tell the detector. Both fields are optional. */
export interface SurfaceProbe {
  /** Service or bundle names the host exposes, when the caller has them. */
  serviceNames?: readonly string[]
  /** DOM root used for the `.bt-leftcol` fallback. */
  root?: { querySelector?(selector: string): unknown } | null
}

/** DS Bot draws its own left column under this class. */
const DS_BOT_COLUMN = '.bt-leftcol'

/** A service id that names the ds-bot bundle, not a longer unrelated token. */
const DS_BOT_SERVICE = /(^|[\/.:])ds-bot($|[\/.:@])/

/**
 * Decide the surface from a probe.
 *
 * A `ds-bot` service or bundle name wins. Otherwise the host's own left column
 * means DS Bot. Anything else is DeepSeek Harness.
 * @param probe - names and an optional DOM root. Omit both for the page default.
 * @returns the surface this process should mount.
 */
export function detectSurface(probe: SurfaceProbe = {}): Surface {
  const names = probe.serviceNames ?? []
  if (names.some((name) => DS_BOT_SERVICE.test(name))) return 'ds-bot'
  try {
    if (probe.root?.querySelector?.(DS_BOT_COLUMN) != null) return 'ds-bot'
  } catch {
    /* a root that cannot be queried is not DS Bot's column */
  }
  return 'dsh'
}

let decided: Surface | undefined

/**
 * The surface for this process. The first call wins; later probes are ignored.
 * @param probe - optional probe used only while the surface is still undecided.
 * @returns the remembered surface.
 */
export function currentSurface(probe?: SurfaceProbe): Surface {
  if (decided !== undefined) return decided
  decided = detectSurface(probe ?? defaultProbe())
  return decided
}

/** Drop the remembered surface. Tests only. */
export function resetSurfaceForTests(): void {
  decided = undefined
}

/**
 * Probe the page: the boot graph first, then the DS Bot column.
 *
 * DS Boot injects `window.__DSH_BOOT__` as a manifest whose `entries` is an
 * array of `WebBootEntry` rows carrying an `id` (`"ds-bot"` for DS Bot's own
 * bundle). Older/alternate shapes expose `bundles` or `services` instead, so
 * every field is read. The DOM column is only a fallback: DS Bot mounts
 * `.bt-leftcol` after plugins have already been asked to decide.
 * @returns the probe `currentSurface` uses when the caller does not pass one.
 */
function defaultProbe(): SurfaceProbe {
  const names: string[] = []
  const boot = (globalThis as {
    __DSH_BOOT__?: {
      entries?: unknown
      bundles?: unknown
      services?: unknown
      batches?: unknown
    }
  }).__DSH_BOOT__
  collectNames(boot?.entries, names)
  collectNames(boot?.bundles, names)
  collectNames(boot?.services, names)
  collectNames(boot?.batches, names)
  const root = typeof document === 'undefined' ? null : document
  return { serviceNames: names, root }
}

/**
 * Pull string names out of a boot payload, recursing through nested rows.
 * @param value - a name, a list, or a map of boot entries.
 * @param into - the list being filled.
 */
function collectNames(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    into.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNames(item, into)
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      into.push(key)
      if (typeof item === 'string') into.push(item)
      else collectNames(item, into)
    }
  }
}

/** Which features mount on a surface. Chrome is DSH-only; shared work is both. */
export interface SurfaceFeatures {
  sidebarFloor: boolean
  sidebarTopRow: boolean
  sectionStats: boolean
  whale: boolean
  windowGeometry: boolean
  annotations: boolean
  sideChat: boolean
  fileMenu: boolean
  markdown: boolean
  documentPreview: boolean
  badge: boolean
}

/**
 * Feature switches for one surface.
 *
 * DS Bot draws its own sidebar, so the DSH chrome (width, icon row, section
 * counts, whale, window geometry) stays off there. Annotations, side chat,
 * both context menus, markdown, document preview, and the badge mechanism stay
 * on. The running-marker and send-button looks are part of the DSH chrome
 * sheets, so they stay off with those sheets.
 * @param surface - the decided surface.
 * @returns the switches `apply` reads.
 */
export function featuresFor(surface: Surface): SurfaceFeatures {
  const shared = {
    annotations: true,
    sideChat: true,
    fileMenu: true,
    markdown: true,
    documentPreview: true,
    badge: true,
  }
  if (surface === 'ds-bot') {
    return {
      ...shared,
      sidebarFloor: false,
      sidebarTopRow: false,
      sectionStats: false,
      whale: false,
      windowGeometry: false,
    }
  }
  return {
    ...shared,
    sidebarFloor: true,
    sidebarTopRow: true,
    sectionStats: true,
    whale: true,
    windowGeometry: true,
  }
}

/**
 * Style-tag identity. The two surfaces never share a prefix, so a page can
 * show which set is mounted.
 * @param surface - the decided surface.
 * @returns the `data-plugin` value.
 */
export function stylePluginId(surface: Surface): string {
  return surface === 'ds-bot' ? 'ds-bot-enhance' : 'dsh-enhance'
}
