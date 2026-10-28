/**
 * Node half of dsh-enhance.
 *
 * The plugin is almost entirely browser-side, but one thing cannot be: the
 * macOS Dock badge. The page's Badging API (`navigator.setAppBadge`) is not
 * implemented by Electron's renderer, so the call that used to paint the tile
 * was a silent no-op — the sidebar showed its unread dots while the icon showed
 * nothing. The native surface lives in the main process (`app.dock.setBadge`),
 * so this half exposes one tiny route the browser half reports the count to.
 *
 * Nothing else runs here: the row exists so the Host serves the browser bundle
 * and so the two halves share one lifecycle.
 */
import type { Context } from '@deepseek-ai/cordis'
import { BADGE_ROUTE } from './badge-route.ts'

/** Request face the route reads (structural subset of `IncomingMessage`). */
interface BadgeRequest {
  url?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array>
}

/** Response face the route writes (structural subset of `ServerResponse`). */
interface BadgeResponse {
  statusCode: number
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string): void
}

/** The named-route registration the Host's web server exposes. */
interface BadgeWebServer {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: BadgeRequest, res: BadgeResponse) => void | Promise<void>
  }): () => void
}

/** Host/Origin and authentication policy, read per request. */
interface BadgeConnection {
  requestRejection(request: { headers: Record<string, string | string[] | undefined> }): 401 | 403 | undefined
}

/** The slice of Electron's `app` this module touches. */
interface ElectronApp {
  dock?: { setBadge(text: string): void }
  setBadgeCount?(count: number): boolean
}

/** Largest request body this route reads; the payload is one small number. */
const MAX_BODY = 2048

/**
 * Read the count out of a request body.
 * @param req - the incoming request.
 * @returns a clamped count, or undefined when the body is unusable.
 */
async function readCount(req: BadgeRequest): Promise<number | undefined> {
  const decoder = new TextDecoder()
  let text = ''
  for await (const chunk of req) {
    text += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
    if (text.length > MAX_BODY) return undefined
  }
  try {
    const parsed = JSON.parse(text) as { count?: unknown }
    const count = parsed.count
    if (typeof count !== 'number' || !Number.isFinite(count)) return undefined
    return Math.max(0, Math.min(999, Math.trunc(count)))
  } catch {
    return undefined
  }
}

/**
 * Paint the native badge for one count.
 *
 * `electron` is imported at call time, never at module load: the same bundle
 * also runs in hosts that are not Electron shells (a `dsh web` server, a test
 * harness), where the import is unavailable and the badge simply stays off.
 * @param count - unread completions; 0 clears the tile.
 * @returns whether a native badge was painted.
 */
async function paintDockBadge(count: number): Promise<boolean> {
  try {
    const electron = await import('electron')
    const app = (electron as { app?: ElectronApp }).app
    if (app === undefined) return false
    if (typeof app.dock?.setBadge === 'function') {
      app.dock.setBadge(count > 0 ? String(count) : '')
      return true
    }
    if (typeof app.setBadgeCount === 'function') {
      return app.setBadgeCount(count)
    }
    return false
  } catch {
    return false
  }
}

/**
 * Mount the badge route on the Host's web server.
 * @param ctx - host context carrying `webServer` and `connection`.
 */
export function apply(ctx: Context): void {
  const scope = ctx as unknown as {
    inject?: (deps: string[], callback: (ctx: Context) => void) => void
  }

  /** Register the route once the services it needs are present. */
  const install = (host: Context): void => {
    const webServer = (host as unknown as { webServer?: BadgeWebServer }).webServer
    const connection = (host as unknown as { connection?: BadgeConnection }).connection
    if (webServer === undefined || connection === undefined) return
    /** One route: read the reported count and paint the native tile. */
    const register = (): (() => void) => webServer.register({
      kind: 'exact',
      path: BADGE_ROUTE,
      async handler(req, res): Promise<void> {
        // Connection owns trust and authentication; never infer it here.
        const rejection = connection.requestRejection(req)
        if (rejection !== undefined) {
          res.writeHead(rejection)
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json' })
          res.end('{"ok":false}')
          return
        }
        const count = await readCount(req)
        if (count === undefined) {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end('{"ok":false}')
          return
        }
        const painted = await paintDockBadge(count)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, painted }))
      },
    })
    // Own the route for exactly the plugin's lifetime: an unloaded row must not
    // keep a handler that paints a badge for a plugin that is gone.
    const effect = (host as unknown as {
      effect?: (body: () => () => void, label: string) => void
    }).effect
    if (typeof effect === 'function') {
      effect(register, 'dsh-enhance: dock badge route')
      return
    }
    register()
  }

  if (typeof scope.inject === 'function') {
    scope.inject(['webServer', 'connection'], install)
    return
  }
  install(ctx)
}
