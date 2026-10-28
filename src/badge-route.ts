/**
 * The one path the browser half and the Host half share for the Dock badge.
 *
 * The two halves are separate bundles (node ESM for the Host, a module-table
 * factory for the page) and cannot call each other directly, so the count
 * travels over the Host's own HTTP surface: the page POSTs it, the Host paints
 * the Dock tile. Keeping the path in one module is what stops the two halves
 * from drifting apart silently — a mismatch would look exactly like a badge
 * that never appears.
 */

/** Host route that paints the Dock badge; also the URL the page POSTs to. */
export const BADGE_ROUTE = '/dsh-enhance/badge'
