/**
 * The sidebar width the shell opens with, and the one it is left at.
 *
 * The app keeps its sidebar width in an in-memory store created fresh on every
 * load (`sidebar: 280`), so a reload snaps the column back to 280 and nothing
 * outside the layout package can read or write that value. The one persistent
 * handle a plugin has is the painted px, which this plugin already owns through
 * the relaxed drag floor — so the width is remembered here instead: first run
 * opens at the narrowest width the gesture allows, later runs at whatever the
 * reader dragged it to.
 *
 * Only the drag that this plugin performs is recorded. The app's own collapse
 * (and any width it paints on its own) never reaches this module, so a rail or
 * a reset cannot overwrite the remembered value.
 */

/** localStorage key holding the last width this plugin settled on. */
export const STORAGE_KEY = 'dsh-enhance.sidebar-width.v1'

/** Narrowest width the sidebar may open at; matches the drag floor. */
export const DEFAULT_WIDTH = 214

/** Narrowest width that may be restored, so a corrupt value cannot hide the column. */
export const MIN_WIDTH = 214

/** Widest width the app's layout contract allows. */
export const MAX_WIDTH = 420

/** The storage face this module reads and writes (localStorage satisfies it). */
export interface WidthStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Read a remembered width, rejecting anything outside the contract range.
 * @param raw - the stored string, or null.
 * @returns the width in px, or undefined when absent or unusable.
 */
export function readSidebarWidth(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const width = Number(raw)
  if (!Number.isFinite(width) || width < MIN_WIDTH || width > MAX_WIDTH) return undefined
  return Math.round(width)
}

/**
 * The width the shell should open with.
 * @param store - storage to read, or null where storage is blocked.
 * @returns the remembered width, or the narrow default on a first run.
 */
export function startupSidebarWidth(store: WidthStore | null): number {
  if (store === null) return DEFAULT_WIDTH
  try {
    return readSidebarWidth(store.getItem(STORAGE_KEY)) ?? DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

/**
 * Remember the width a drag settled on.
 * @param store - storage to write, or null where storage is blocked.
 * @param width - the settled width in px.
 */
export function rememberSidebarWidth(store: WidthStore | null, width: number): void {
  if (store === null) return
  const bounded = Math.round(Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH))
  try {
    store.setItem(STORAGE_KEY, String(bounded))
  } catch {
    /* a preference that cannot be written must not break the gesture */
  }
}

/**
 * The page's localStorage, or null where storage is blocked.
 * @returns the storage face, or null.
 */
export function pageStorage(): WidthStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
