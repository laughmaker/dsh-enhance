/**
 * The path the browser half and the Host half share for the Dock badge.
 *
 * The two halves are separate bundles (node ESM for the Host, a module-table
 * factory for the page) and cannot call each other directly, so the count
 * travels over the Host's own HTTP surface: the page POSTs it, the Host paints
 * the Dock tile. Each surface owns its own path, so the two apps never share a
 * badge route and a count cannot leak between them.
 */
import type { Surface } from './client/surface.ts'

/** Return the badge route for one surface. */
export function badgeRouteFor(surface: Surface): string {
  return surface === 'ds-bot' ? '/ds-bot-enhance/badge' : '/dsh-enhance/badge'
}

/** DSH route, kept for callers and tests that predate surfaces. */
export const BADGE_ROUTE = badgeRouteFor('dsh')
