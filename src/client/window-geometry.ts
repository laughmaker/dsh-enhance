/**
 * Fill the screen on the first desktop launch, then remember the geometry.
 *
 * The Electron shell creates its main window at a fixed 1280x820 and records
 * nothing about where it was left, so every launch re-centres it. The bundle
 * cannot be patched here: `/Applications/DeepSeek Harness.app` ships a signed,
 * integrity-fused `app.asar`, and its preload exposes no window API to plugins.
 * The renderer half of that same window, however, is allowed to call
 * `window.resizeTo` / `window.moveTo` — verified to drive a sandboxed,
 * context-isolated Electron 44 window whose size is then reported as
 * maximized by the main process.
 *
 * So this module owns the geometry from the page: first launch (nothing saved)
 * fills the work area, later launches restore what the last one closed with.
 * Only the dimensions and the maximized flag are stored; the position is kept
 * so a window left on a second display reopens there. A saved frame that no
 * longer fits — monitor unplugged, resolution changed — is clamped into the
 * work area rather than restored off-screen.
 *
 * A plain browser tab has no work area of its own and `resizeTo` is a no-op
 * there, so the whole module stays inert outside the Electron shell.
 */

/** localStorage key holding the last close's frame. */
export const STORAGE_KEY = 'dsh-enhance.window-geometry.v1'

/** A window frame in screen coordinates. */
export interface Frame {
  x: number
  y: number
  width: number
  height: number
}

/** The work area `window.screen` reports: the display minus menu bar and Dock. */
export interface WorkArea {
  left: number
  top: number
  width: number
  height: number
}

/** The `window.screen` fields this module reads, in the platform's own naming. */
export interface ScreenLike {
  /** Origin of the work area; absent from the DOM typings, present in Chromium. */
  readonly availLeft?: number
  readonly availTop?: number
  readonly availWidth: number
  readonly availHeight: number
}

/** What is persisted between launches. */
export interface SavedGeometry {
  normal: Frame
  maximized: boolean
}

/** The storage face this module reads and writes (localStorage satisfies it). */
export interface GeometryStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The subset of `window` this module drives, kept structural for tests. */
export interface DesktopWindow {
  readonly screen: ScreenLike
  readonly document: { readonly visibilityState: string }
  readonly outerWidth: number
  readonly outerHeight: number
  readonly screenX: number
  readonly screenY: number
  resizeTo(width: number, height: number): void
  moveTo(x: number, y: number): void
  addEventListener(type: string, listener: (event: Event) => void): void
  removeEventListener(type: string, listener: (event: Event) => void): void
}

/**
 * Read the work area out of a window's screen.
 *
 * `availLeft` / `availTop` exist in Chromium (they are how a maximized window
 * knows where the menu bar is), but not in the DOM typings, so they are read
 * defensively and default to the origin.
 * @param win - the driven window.
 * @returns the area a maximized window would fill.
 */
export function workAreaOf(win: DesktopWindow): WorkArea {
  return {
    left: win.screen.availLeft ?? 0,
    top: win.screen.availTop ?? 0,
    width: win.screen.availWidth,
    height: win.screen.availHeight,
  }
}

/** How long a resize or move must settle before the frame is written. */
const SAVE_DELAY_MS = 400

/** How long the startup paint must settle before its own events stop counting. */
const RESTORE_SETTLE_MS = 600

/**
 * A window within this many pixels of the work area counts as filled.
 *
 * Measured on macOS: a maximized window settles at exactly the work area, but
 * reports a few pixels less for the frame between the resize and the next
 * layout pass (1420x923 for a 1424x923 area). The tolerance covers that
 * transient without letting an ordinary window pass as maximized — 8px is
 * under 0.6% of the width on any display this app runs on.
 */
const MAXIMIZED_TOLERANCE = 8

/**
 * Whether the page runs inside the Electron shell.
 *
 * The desktop preload has no window-geometry bridge to probe, and `resizeTo`
 * exists in every browser while doing nothing for a tab, so the user agent is
 * the discriminator: only the packaged shell reports `Electron/`.
 * @returns true when the module may drive its own window.
 */
export function isDesktopShell(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes('Electron/')
}

/**
 * Read a persisted frame, ignoring anything that is not a sane rectangle.
 * @param raw - the stored JSON string, or null.
 * @returns the parsed record, or undefined when absent or malformed.
 */
export function readSavedGeometry(raw: string | null): SavedGeometry | undefined {
  if (raw === null || raw === '') return undefined
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return undefined }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as { normal?: unknown, maximized?: unknown }
  if (!isFrame(record.normal)) return undefined
  return { normal: record.normal, maximized: record.maximized === true }
}

/**
 * Whether a value is a frame with positive dimensions.
 * @param value - candidate record.
 * @returns true when it can be restored.
 */
function isFrame(value: unknown): value is Frame {
  if (typeof value !== 'object' || value === null) return false
  const frame = value as Record<string, unknown>
  return ['x', 'y', 'width', 'height'].every((key) => typeof frame[key] === 'number' && Number.isFinite(frame[key]))
    && (frame.width as number) > 0 && (frame.height as number) > 0
}

/**
 * Keep a frame inside the work area, without shrinking it below a usable size.
 *
 * A frame is never enlarged here: a window saved small stays small. It only
 * ensures enough of the title bar is on screen to grab, and that the whole
 * window fits when the display got smaller than the window.
 * @param frame - the frame to restore.
 * @param area - the work area it must live in.
 * @returns a frame that can be painted on screen.
 */
export function clampToArea(frame: Frame, area: WorkArea): Frame {
  const width = Math.min(frame.width, area.width)
  const height = Math.min(frame.height, area.height)
  const minVisible = 120
  const x = Math.min(Math.max(frame.x, area.left - width + minVisible), area.left + area.width - minVisible)
  const y = Math.min(Math.max(frame.y, area.top), area.top + area.height - 40)
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

/**
 * Whether the window currently fills its work area.
 * @param frame - the live frame.
 * @param area - the work area.
 * @returns true when the dimensions match the work area.
 */
export function isFilled(frame: Frame, area: WorkArea): boolean {
  return Math.abs(frame.width - area.width) <= MAXIMIZED_TOLERANCE
    && Math.abs(frame.height - area.height) <= MAXIMIZED_TOLERANCE
}

/**
 * The frame the window reports right now.
 * @param win - the driven window.
 * @returns its current outer frame.
 */
export function currentFrame(win: DesktopWindow): Frame {
  return {
    x: Math.round(win.screenX),
    y: Math.round(win.screenY),
    width: Math.round(win.outerWidth),
    height: Math.round(win.outerHeight),
  }
}

/**
 * Fill the work area.
 *
 * Resizing before moving keeps the final position exact: the platform clamps a
 * move against the *new* size, so moving a 1280-wide window to the work-area
 * origin first and then widening it would leave it offset.
 * @param win - the driven window.
 * @param area - the work area to fill.
 */
function fill(win: DesktopWindow, area: WorkArea): void {
  win.resizeTo(area.width, area.height)
  win.moveTo(area.left, area.top)
}

/**
 * Drive the window's startup geometry and keep the frame it closes with.
 *
 * The caller decides whether this applies at all — see {@link isDesktopShell}.
 * A plain browser tab ignores `resizeTo` / `moveTo`, so calling it there is
 * harmless, but a tab also has no work area of its own to fill.
 * @param win - the Electron window's renderer `window`.
 * @param store - storage to read and write; omit to use the page's localStorage.
 * @returns disposer that stops persisting further changes.
 */
export function installStartupGeometry(win: DesktopWindow, store?: GeometryStore | null): () => void {
  const storage = store ?? safeStorage()
  const area = workAreaOf(win)
  if (!(area.width > 0) || !(area.height > 0)) return () => {}

  /** The last frame seen while the window was not filling the area. */
  let normal = currentFrame(win)
  /** True while this module's own paint is still settling. */
  let restoring = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let settle: ReturnType<typeof setTimeout> | undefined

  /**
   * Paint the saved frame, or fill the screen when nothing was saved.
   * @param geometry - what the previous launch left behind.
   */
  const restore = (geometry: SavedGeometry | undefined): void => {
    restoring = true
    if (geometry === undefined || geometry.maximized) fill(win, area)
    else {
      const frame = clampToArea(geometry.normal, area)
      normal = frame
      win.resizeTo(frame.width, frame.height)
      win.moveTo(frame.x, frame.y)
    }
    // The resize event this paint causes arrives on a later task, so the flag
    // has to outlive this function: clearing it immediately would let the
    // restored frame be recorded as if the reader had chosen it. Recording the
    // settled state once afterwards is what makes a first launch that is never
    // resized still leave a frame for the next one.
    settle = setTimeout(() => {
      restoring = false
      save()
    }, RESTORE_SETTLE_MS)
  }

  /** Write the current state, keeping the last non-filled frame as "normal". */
  const save = (): void => {
    if (storage === null || restoring) return
    const frame = currentFrame(win)
    const maximized = isFilled(frame, area)
    if (!maximized) normal = frame
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ normal, maximized } satisfies SavedGeometry))
    } catch {
      /* geometry is a preference: a blocked quota must not break the window */
    }
  }

  const schedule = (): void => {
    if (restoring) return
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY_MS)
  }

  /** Persist as soon as the page is hidden, which is what a close looks like. */
  const onVisibilityChange = (): void => {
    if (win.document.visibilityState === 'hidden') save()
  }

  restore(storage === null ? undefined : readSavedGeometry(storage.getItem(STORAGE_KEY)))

  // `resize` is the only geometry event the renderer receives on macOS — a pure
  // `move` fires nothing — so the saved position is the one the window had at
  // the last size change, or at the last moment the page lost attention / went
  // away. Closing the desktop window hides it instead of unloading the page,
  // which is why `visibilitychange` and `blur` carry most of the signal here.
  win.addEventListener('resize', schedule)
  win.addEventListener('blur', schedule)
  win.addEventListener('visibilitychange', onVisibilityChange)
  win.addEventListener('pagehide', save)

  return () => {
    if (timer !== undefined) clearTimeout(timer)
    if (settle !== undefined) clearTimeout(settle)
    win.removeEventListener('resize', schedule)
    win.removeEventListener('blur', schedule)
    win.removeEventListener('visibilitychange', onVisibilityChange)
    win.removeEventListener('pagehide', save)
    restoring = false
    save()
  }
}

/**
 * The page's localStorage, or null where storage is blocked (a sandboxed
 * iframe, a privacy mode that throws on access).
 * @returns the storage face, or null.
 */
function safeStorage(): GeometryStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
