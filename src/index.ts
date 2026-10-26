/**
 * Node half of dsh-enhance.
 *
 * The plugin is browser-only: its row exists so the host's client module
 * system serves the bundle, and so the bundle can be switched on and off as
 * one unit. Nothing runs on the host.
 */

/** Loader entry for the local enhancement bundle. */
export function apply(): void {}
