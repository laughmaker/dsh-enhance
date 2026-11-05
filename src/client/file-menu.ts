/**
 * Right-click menu on conversation content: file references and web links.
 *
 * The app renders a file mention as a button whose `title` carries the path
 * (both the markdown-link form and the inline-code form do this), and an HTTP(S)
 * link as an ordinary anchor. A delegated `contextmenu` listener catches both,
 * suppresses the native menu and shows this plugin's own menu with the actions
 * from the reference designs. Everything else keeps the app's native menu.
 *
 * File actions use the Session Remote the app itself uses for file previews:
 * `openWorkspacePath` opens/reveals/launches, `workspacePathApplications` lists
 * the "Open with" handlers, and the authenticated `api/file` route serves the
 * bytes for copy and Save As. Link actions are browser gestures (`window.open`,
 * clipboard, fetch). No Host-side route is added, so the whole feature lives in
 * the browser bundle and reloads with the plugin.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { ASSISTANT_FLOW_SELECTOR, CHAT_NODE_SELECTOR } from './selection.ts'
import { LOCALE_NS } from './locales.ts'

/** Hashed CSS-module classes still contain these stable substrings. */
export const FILE_MENTION_SELECTOR = 'button[class*="fileMention"][title], button[class*="fileLink"][title]'

/** Web links rendered inside chat messages (file mentions are buttons, not anchors). */
export const WEB_LINK_SELECTOR = 'a[href]'

/** A file mention counts only inside rendered chat content. */
export const TRANSCRIPT_ROOT_SELECTOR = `${CHAT_NODE_SELECTOR}, ${ASSISTANT_FLOW_SELECTOR}, [class*="_markdown"]`

/** Marks both the menu and its submenu, so outside clicks can be recognised. */
export const MENU_ATTRIBUTE = 'data-dsh-enhance-file-menu'

/** Approximate footprint used to place the menu before measuring it. */
const MENU_WIDTH = 248
const MENU_HEIGHT = 268
const SUBMENU_WIDTH = 210
const SUBMENU_ROW = 30

/** Link menu footprint: header, three open rows, a separator, two copy/save rows. */
const LINK_MENU_WIDTH = 232
const LINK_MENU_HEIGHT = 292

/** One native-open request as the Session Remote accepts it. */
export interface OpenPathRequest {
  path: string
  action?: 'reveal'
  application?: string
}

/** One application offered by "Open with". */
interface AppEntry {
  id: string
  name: string
}

/** The slice of `ctx.remote.session` this menu calls. */
interface RemoteSession {
  openWorkspacePath(request: OpenPathRequest): Promise<{ ok: boolean; value?: unknown }>
  workspacePathApplications(request: { path: string }): Promise<{
    ok: boolean
    value?: Array<{ id?: unknown; name?: unknown }>
  }>
}

/** Shape of the menu's translated copy. */
type MenuText = TranslateNS<typeof LOCALE_NS>

/** Optional seams, overridable in tests. */
export interface FileMenuDeps {
  /** Open or reveal a path. Returns whether the Host acknowledged it. */
  openPath?: (request: OpenPathRequest) => Promise<boolean>
  /** Installed handlers for one file. */
  applications?: (path: string) => Promise<AppEntry[]>
  /** Read the file through the authenticated route. */
  fetchFile?: (path: string) => Promise<Response>
  /** Copy text to the clipboard. */
  copy?: (text: string) => Promise<void>
}

/**
 * Turn a mention's `title` into a usable path.
 * Handles `file://` URLs and the `#L12` / `#L12-L20` line anchors the markdown
 * renderer strips before it stores the path.
 * @param raw - raw title attribute.
 * @returns the path, or undefined when it is empty or control-ridden.
 */
export function normalizeMentionPath(raw: string): string | undefined {
  let value = raw.trim()
  if (value === '') return undefined
  if (/^file:\/\//i.test(value)) {
    try {
      value = decodeURIComponent(new URL(value).pathname)
    } catch {
      return undefined
    }
  }
  value = value.replace(/#L\d+(?:-L\d+)?$/, '')
  if (value === '' || /[\u0000-\u001f\u007f]/.test(value)) return undefined
  return value
}

/**
 * Whether a path is already absolute (including a leading tilde and Windows drives).
 * @param path - normalised path.
 */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || path === '~' || path.startsWith('~/') || /^[A-Za-z]:[\\/]/.test(path)
}

/**
 * Resolve a relative mention against the conversation's working directory.
 * @param path - normalised path.
 * @param cwd - current session's working directory, when known.
 * @returns an absolute-ish path, or undefined when resolution is impossible.
 */
export function resolvePath(path: string, cwd?: string): string | undefined {
  if (isAbsolutePath(path)) return path
  if (cwd === undefined || cwd === '') return undefined
  const base = cwd.replace(/[\\/]+$/, '')
  const relative = path.replace(/^\.[\\/]+/, '').replace(/\\/g, '/')
  return `${base}/${relative}`
}

/**
 * Clamp a menu's top-left into the viewport, keeping an 8px margin.
 * @param x - pointer x.
 * @param y - pointer y.
 * @param width - menu width.
 * @param height - menu height.
 * @param viewport - viewport size.
 * @returns fixed-position coordinates.
 */
export function placeMenu(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: { width: number; height: number },
): { left: number; top: number } {
  return {
    left: Math.min(Math.max(8, x), Math.max(8, viewport.width - width - 8)),
    top: Math.min(Math.max(8, y), Math.max(8, viewport.height - height - 8)),
  }
}

/** The fields read from one Session list row. */
interface CwdRow {
  cwd?: string
  retainedBy?: { mainView?: number }
}

/**
 * Working directory of the conversation in the main column.
 * `uiSession.current` names the main binding; when it is unavailable, the row
 * retained by the main view is the same answer. A last-resort first cwd keeps
 * relative mentions usable before the list has loaded.
 * @param ctx - client root.
 * @returns the cwd, or undefined.
 */
function cwdFor(ctx: Context): string | undefined {
  const sessions = (ctx as unknown as {
    sessions?: { list?: { getSnapshot?: () => { byId?: Record<string, CwdRow> } } }
  }).sessions
  const byId = sessions?.list?.getSnapshot?.()?.byId
  if (byId === undefined) return undefined
  const ui = (ctx as unknown as {
    uiSession?: { current?: { getSnapshot?: () => unknown; value?: unknown } }
  }).uiSession?.current
  const current = (ui?.getSnapshot?.() ?? ui?.value) as {
    key?: string
    props?: { sessionId?: string }
  } | undefined
  const currentId = current?.key ?? current?.props?.sessionId
  const rows = Object.values(byId)
  const row = (currentId !== undefined ? byId[currentId] : undefined)
    ?? rows.find(candidate => (candidate.retainedBy?.mainView ?? 0) > 0)
    ?? rows.find(candidate => typeof candidate.cwd === 'string')
  return row?.cwd
}

/**
 * Find the file mention a context-menu event landed on.
 * @param node - event target.
 * @returns the mention button, or undefined for any other element.
 */
export function fileTargetFrom(node: Node | null): HTMLElement | undefined {
  const element = node instanceof Element ? node : node?.parentElement ?? undefined
  if (element === undefined) return undefined
  const mention = element.closest(FILE_MENTION_SELECTOR)
  if (!(mention instanceof HTMLElement)) return undefined
  if (mention.closest(TRANSCRIPT_ROOT_SELECTOR) === null) return undefined
  return mention
}

/**
 * Accept an HTTP(S) URL and nothing else.
 * @param href - raw href attribute.
 * @returns the URL string, or undefined for other schemes or empties.
 */
export function normalizeWebLink(href: string): string | undefined {
  const value = href.trim()
  if (!/^https?:\/\//i.test(value)) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

/**
 * Find the web link a context-menu event landed on.
 * @param node - event target.
 * @returns the link URL, or undefined for non-links, other schemes, or outside chat.
 */
export function webLinkFrom(node: Node | null): { anchor: HTMLAnchorElement; url: string } | undefined {
  const element = node instanceof Element ? node : node?.parentElement ?? undefined
  if (element === undefined) return undefined
  const anchor = element.closest(WEB_LINK_SELECTOR)
  if (!(anchor instanceof HTMLAnchorElement)) return undefined
  if (anchor.closest(TRANSCRIPT_ROOT_SELECTOR) === null) return undefined
  const url = normalizeWebLink(anchor.getAttribute('href') ?? '')
  return url === undefined ? undefined : { anchor, url }
}

/**
 * Copy text with the async clipboard API, falling back to a hidden textarea.
 * @param text - text to copy.
 */
async function copyText(text: string): Promise<void> {
  if (typeof navigator.clipboard?.writeText === 'function') {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('clipboard is unavailable')
}

/** Writable face of the File System Access API's save picker. */
interface SaveWritable {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}
interface SaveHandle {
  createWritable(): Promise<SaveWritable>
}

/**
 * Install the delegated context-menu gesture.
 * @param ctx - client root, used for the Session Remote and the current cwd.
 * @param t - plugin translator.
 * @param deps - optional seams.
 * @returns disposer removing every listener and any open menu.
 */
export function installFileMenu(ctx: Context, t: MenuText, deps: FileMenuDeps = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const doc = document
  const session = (ctx as unknown as { remote?: { session?: RemoteSession } }).remote?.session

  const openPath = deps.openPath ?? (async request => {
    if (session === undefined) return false
    const result = await session.openWorkspacePath(request)
    return result?.ok === true
  })

  const applications = deps.applications ?? (async path => {
    if (session === undefined) return []
    try {
      const result = await session.workspacePathApplications({ path })
      if (result?.ok !== true || !Array.isArray(result.value)) return []
      return result.value.flatMap(entry =>
        typeof entry?.id === 'string' && typeof entry?.name === 'string'
          ? [{ id: entry.id, name: entry.name }]
          : [])
    } catch {
      return []
    }
  })

  const fetchFile = deps.fetchFile ?? (async path => {
    const url = new URL(`api/file?path=${encodeURIComponent(path)}`, doc.baseURI).href
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response
  })

  const copy = deps.copy ?? copyText

  /** Transient result bubble, so a failed action is never silent. */
  const toast = (text: string): void => {
    if (text === '') return
    const element = doc.createElement('div')
    element.className = 'dsh-file-menu__toast'
    element.setAttribute('role', 'status')
    element.textContent = text
    doc.body.appendChild(element)
    window.setTimeout(() => element.remove(), 2600)
  }

  let menu: HTMLElement | undefined
  let submenu: HTMLElement | undefined
  let appsRequest: Promise<AppEntry[]> | undefined
  let path = ''
  let withItem: HTMLElement | undefined
  /** Invalidates an in-flight catalog read when the menu or submenu closes. */
  let generation = 0

  /** Read the catalog once per menu, so the submenu never waits twice. */
  const loadApps = (): Promise<AppEntry[]> => {
    appsRequest ??= applications(path)
    return appsRequest
  }

  /** Remove both panels and forget their state. */
  const close = (): void => {
    generation += 1
    menu?.remove()
    submenu?.remove()
    menu = undefined
    submenu = undefined
    withItem = undefined
    appsRequest = undefined
  }

  /** Drop just the submenu, leaving the main menu open. */
  const hideSubmenu = (): void => {
    generation += 1
    submenu?.remove()
    submenu = undefined
  }

  /** Build and show the "Open with" panel next to its parent item. */
  const showSubmenu = async (): Promise<void> => {
    if (menu === undefined || withItem === undefined || submenu !== undefined) return
    const mine = generation + 1
    generation = mine
    const apps = await loadApps()
    if (generation !== mine || menu === undefined || withItem === undefined) return
    submenu?.remove()
    const sub = doc.createElement('div')
    sub.className = 'dsh-file-menu dsh-file-menu__submenu'
    sub.setAttribute(MENU_ATTRIBUTE, '')
    sub.setAttribute('role', 'menu')
    if (apps.length === 0) {
      const empty = doc.createElement('div')
      empty.className = 'dsh-file-menu__empty'
      empty.textContent = t('fileMenu.noApps')
      sub.append(empty)
    } else {
      for (const app of apps) {
        const item = doc.createElement('button')
        item.type = 'button'
        item.className = 'dsh-file-menu__item'
        item.setAttribute('role', 'menuitem')
        item.textContent = app.name
        item.addEventListener('click', event => {
          event.stopPropagation()
          void runOpenWith(app.id)
        })
        sub.append(item)
      }
    }
    const anchor = withItem.getBoundingClientRect()
    const main = menu.getBoundingClientRect()
    const height = Math.min(apps.length || 1, 10) * SUBMENU_ROW + 12
    let left = main.right + 4
    if (left + SUBMENU_WIDTH > window.innerWidth - 8) left = main.left - SUBMENU_WIDTH - 4
    const placed = placeMenu(left, anchor.top - 6, SUBMENU_WIDTH, height, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    sub.style.left = `${placed.left}px`
    sub.style.top = `${placed.top}px`
    sub.addEventListener('mouseleave', hideSubmenu)
    doc.body.appendChild(sub)
    submenu = sub
  }

  /** Run one action, then close the menu and report the outcome. */
  const act = async (work: () => Promise<string>): Promise<void> => {
    close()
    try {
      toast(await work())
    } catch (error) {
      toast(t('fileMenu.failed', { message: error instanceof Error ? error.message : String(error) }))
    }
  }

  /** A native open that must be acknowledged by the Host. */
  const mustOpen = async (request: OpenPathRequest, done: string): Promise<string> => {
    if (!await openPath(request)) throw new Error(t('fileMenu.noDesktop'))
    return t(done)
  }

  /** Open in one chosen application. */
  const runOpenWith = (application: string): Promise<void> => act(async () =>
    mustOpen({ path, application }, 'fileMenu.done.opened'))

  /** Copy the file's text to the clipboard. */
  const runCopyContents = async (): Promise<string> => {
    const text = await (await fetchFile(path)).text()
    if (text.includes('\u0000')) throw new Error(t('fileMenu.notText'))
    await copy(text)
    return t('fileMenu.done.copyContents')
  }

  /** Save the file through a native picker, or as a browser download. */
  const runSaveAs = async (): Promise<string> => {
    const blob = await (await fetchFile(path)).blob()
    const name = path.split(/[\\/]/).pop() || 'file'
    const picker = (window as unknown as {
      showSaveFilePicker?: (options: { suggestedName: string }) => Promise<SaveHandle>
    }).showSaveFilePicker
    if (typeof picker === 'function') {
      try {
        const handle = await picker.call(window, { suggestedName: name })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return t('fileMenu.done.saved')
      } catch (error) {
        // Cancelling the dialog is not a failure; anything else means the
        // picker is unavailable here, so fall through to a plain download.
        if ((error as { name?: string } | null)?.name === 'AbortError') return ''
      }
    }
    const href = URL.createObjectURL(blob)
    const anchor = doc.createElement('a')
    anchor.href = href
    anchor.download = name
    anchor.style.display = 'none'
    doc.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
    return t('fileMenu.done.saved')
  }

  /** Build one menu row. */
  const item = (label: string, action: string, chevron = false): HTMLButtonElement => {
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = 'dsh-file-menu__item'
    button.setAttribute('role', 'menuitem')
    button.dataset.action = action
    const text = doc.createElement('span')
    text.textContent = label
    button.append(text)
    if (chevron) {
      const arrow = doc.createElement('span')
      arrow.className = 'dsh-file-menu__chevron'
      arrow.textContent = '›'
      button.append(arrow)
    }
    button.addEventListener('click', event => {
      event.stopPropagation()
      switch (action) {
        case 'default':
          void act(() => mustOpen({ path }, 'fileMenu.done.opened'))
          break
        case 'with':
          void showSubmenu()
          break
        case 'save':
          void act(runSaveAs)
          break
        case 'copy-path':
          void act(async () => {
            await copy(path)
            return t('fileMenu.done.copyPath')
          })
          break
        case 'copy-contents':
          void act(runCopyContents)
          break
        case 'reveal':
          void act(() => mustOpen({ path, action: 'reveal' }, 'fileMenu.done.revealed'))
          break
      }
    })
    return button
  }

  /** Open the menu at the pointer for one file mention. */
  const open = (x: number, y: number, value: string): void => {
    close()
    path = value
    const root = doc.createElement('div')
    root.className = 'dsh-file-menu'
    root.setAttribute(MENU_ATTRIBUTE, '')
    root.setAttribute('role', 'menu')
    const header = doc.createElement('div')
    header.className = 'dsh-file-menu__header'
    header.textContent = t('fileMenu.header')
    const separator = doc.createElement('div')
    separator.className = 'dsh-file-menu__separator'
    withItem = item(t('fileMenu.openWith'), 'with', true)
    root.append(
      header,
      item(t('fileMenu.openDefault'), 'default'),
      withItem,
      separator,
      item(t('fileMenu.saveAs'), 'save'),
      item(t('fileMenu.copyPath'), 'copy-path'),
      item(t('fileMenu.copyContents'), 'copy-contents'),
      item(t('fileMenu.reveal'), 'reveal'),
    )
    const placed = placeMenu(x, y, MENU_WIDTH, MENU_HEIGHT, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    root.style.left = `${placed.left}px`
    root.style.top = `${placed.top}px`
    root.addEventListener('mouseover', event => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-action="with"]') !== null) {
        if (submenu === undefined) void showSubmenu()
      } else {
        hideSubmenu()
      }
    })
    doc.body.appendChild(root)
    menu = root
    // Start the catalog read now so the submenu opens without a network wait.
    void loadApps()
  }

  /** Open a web link in the app's in-app browser tab when one exists. */
  const openLinkInTab = (url: string): string => {
    const tabs = (ctx as unknown as {
      sidebarRightTabs?: { get?: (id: string) => unknown }
    }).sidebarRightTabs
    const right = (ctx as unknown as {
      sidebarRight?: { openTab?: (id: string, options: unknown) => void }
    }).sidebarRight
    if (tabs?.get?.('browser') !== undefined && typeof right?.openTab === 'function') {
      right.openTab('browser', { params: { url } })
      return t('linkMenu.done.opened')
    }
    // No in-app browser: a new window/tab is the closest equivalent.
    window.open(url, '_blank', 'noopener,noreferrer')
    return ''
  }

  /** Open a web link in a separate window (browser popup; the desktop shell
   * hands external URLs to the system browser). */
  const openLinkNewWindow = (url: string): string => {
    window.open(url, '_blank', 'noopener,noreferrer,popup=yes,width=1024,height=768')
    return ''
  }

  /** Hand a web link to the environment's default browser. */
  const openLinkDefault = (url: string): string => {
    window.open(url, '_blank', 'noopener,noreferrer')
    return ''
  }

  /** Save a web link's resource as a download, best-effort under CORS. */
  const saveLink = async (url: string): Promise<string> => {
    let blob: Blob
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      blob = await response.blob()
    } catch {
      throw new Error(t('linkMenu.saveFailed'))
    }
    let name = 'download'
    try {
      name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'download'
    } catch {
      /* keep the fallback name */
    }
    const href = URL.createObjectURL(blob)
    const anchor = doc.createElement('a')
    anchor.href = href
    anchor.download = name
    anchor.style.display = 'none'
    doc.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
    return t('linkMenu.done.saved')
  }

  /** Build and show the menu for a web link. */
  const openLinkMenu = (x: number, y: number, url: string): void => {
    close()
    const root = doc.createElement('div')
    root.className = 'dsh-file-menu'
    root.setAttribute(MENU_ATTRIBUTE, '')
    root.setAttribute('role', 'menu')
    const header = doc.createElement('div')
    header.className = 'dsh-file-menu__header'
    header.textContent = t('linkMenu.header')
    const separator = doc.createElement('div')
    separator.className = 'dsh-file-menu__separator'
    const row = (label: string, run: () => string | Promise<string>): HTMLButtonElement => {
      const button = doc.createElement('button')
      button.type = 'button'
      button.className = 'dsh-file-menu__item'
      button.setAttribute('role', 'menuitem')
      const text = doc.createElement('span')
      text.textContent = label
      button.append(text)
      button.addEventListener('click', event => {
        event.stopPropagation()
        void act(async () => run())
      })
      return button
    }
    root.append(
      header,
      row(t('linkMenu.newTab'), () => openLinkInTab(url)),
      row(t('linkMenu.newWindow'), () => openLinkNewWindow(url)),
      row(t('linkMenu.defaultBrowser'), () => openLinkDefault(url)),
      separator,
      row(t('linkMenu.copyLink'), async () => {
        await copy(url)
        return t('linkMenu.done.copied')
      }),
      row(t('linkMenu.saveLink'), () => saveLink(url)),
    )
    const placed = placeMenu(x, y, LINK_MENU_WIDTH, LINK_MENU_HEIGHT, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    root.style.left = `${placed.left}px`
    root.style.top = `${placed.top}px`
    doc.body.appendChild(root)
    menu = root
  }

  /** The gesture: only file mentions and web links inside chat content are claimed. */
  const onContextMenu = (event: MouseEvent): void => {
    const file = fileTargetFrom(event.target as Node)
    if (file !== undefined) {
      const mention = normalizeMentionPath(file.getAttribute('title') ?? '')
      if (mention === undefined) {
        close()
        return
      }
      const resolved = resolvePath(mention, cwdFor(ctx))
      event.preventDefault()
      event.stopPropagation()
      open(event.clientX, event.clientY, resolved ?? mention)
      return
    }
    const link = webLinkFrom(event.target as Node)
    if (link !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      openLinkMenu(event.clientX, event.clientY, link.url)
      return
    }
    close()
  }

  /** Close on any press that is not inside one of our panels. */
  const onPointerDown = (event: PointerEvent): void => {
    if (menu === undefined && submenu === undefined) return
    const target = event.target
    if (target instanceof Element && target.closest(`[${MENU_ATTRIBUTE}]`) !== null) return
    close()
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close()
  }
  const onScroll = (): void => close()

  doc.addEventListener('contextmenu', onContextMenu, true)
  doc.addEventListener('pointerdown', onPointerDown, true)
  doc.addEventListener('keydown', onKeyDown, true)
  doc.addEventListener('scroll', onScroll, true)
  window.addEventListener('blur', close)
  window.addEventListener('resize', close)

  return () => {
    doc.removeEventListener('contextmenu', onContextMenu, true)
    doc.removeEventListener('pointerdown', onPointerDown, true)
    doc.removeEventListener('keydown', onKeyDown, true)
    doc.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('blur', close)
    window.removeEventListener('resize', close)
    close()
  }
}
