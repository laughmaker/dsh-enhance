/**
 * Guards on the stylesheets this plugin injects.
 *
 * Every sheet is one `String.raw` template literal, and the CSS is large enough
 * that a stray backtick in a comment is easy to write and hard to notice: the
 * literal closes early, the rest of the file becomes JavaScript, and the whole
 * sheet silently disappears from the bundle (or fails the build with a parse
 * error pointing at an innocent line). These checks fail on that mistake, and
 * on a sheet that is authored but never registered.
 *
 * Run with this checkout's vitest binary:
 *   node_modules/.bin/vitest run tests/stylesheets.test.ts
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHEETS } from '../src/client/styles.ts'
import { ENTRIES_ATTRIBUTE } from '../src/client/sidebar-top-row.ts'

const STYLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client', 'styles')

/** Every stylesheet source file, by base name. */
const files = readdirSync(STYLES_DIR).filter((name) => name.endsWith('.ts'))

/**
 * Pull the CSS out of one stylesheet file.
 * @param file - base name, e.g. `toolbar.ts`.
 * @returns the template contents and the text after its closing backtick.
 */
function readSheet(file: string): { css: string, rest: string } {
  const source = readFileSync(join(STYLES_DIR, file), 'utf8')
  const from = source.indexOf('String.raw`') + 'String.raw`'.length
  const close = source.indexOf('`', from)
  return { css: source.slice(from, close), rest: source.slice(close + 1).trim() }
}

describe('stylesheet sources', () => {
  it('has at least one sheet', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s holds one unbroken template', (file) => {
    const source = readFileSync(join(STYLES_DIR, file), 'utf8')
    expect(source).toContain('String.raw`')
    const { css, rest } = readSheet(file)
    // A backtick inside the CSS closes the literal; what follows stops being CSS.
    expect(css).not.toContain('`')
    // Interpolation would be evaluated at module load, not shipped as CSS.
    expect(css).not.toContain('${')
    // Anything past the closing backtick has to be a comment or nothing.
    expect(rest === '' || rest.startsWith('//')).toBe(true)
    expect(css.trim().length).toBeGreaterThan(0)
  })

  it.each(files)('%s is balanced', (file) => {
    const { css } = readSheet(file)
    const open = (css.match(/\{/g) ?? []).length
    const close = (css.match(/\}/g) ?? []).length
    expect(open).toBe(close)
  })
})

describe('registered sheets', () => {
  it('names a stylesheet per registered sheet', () => {
    const registered = SHEETS.map(([name]) => name)
    const authored = files.map((file) => file.replace(/\.ts$/, '.css'))
    expect([...registered].sort()).toEqual([...authored].sort())
  })

  it('keeps the running spinner sheet last-wins capable', () => {
    expect(SHEETS.map(([name]) => name)).toContain('running-spinner.css')
  })

  it('tags every sheet with a distinct plugin-css id', () => {
    const ids = SHEETS.map(([name]) => name)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never ships an empty sheet', () => {
    for (const [name, css] of SHEETS) expect(css.length, name).toBeGreaterThan(0)
  })

  it('recolours the running marker without touching its motion', () => {
    const css = SHEETS.find(([name]) => name === 'running-spinner.css')?.[1] ?? ''
    // The colour arrives through currentColor; the host owns spin and dash.
    expect(css).toContain('data-state="ongoing"')
    expect(css).toContain('color:')
    expect(css).not.toMatch(/stroke:[^;]*!important/)
    expect(css).toContain('prefers-reduced-motion')
  })

  it('lets the top row fill the sidebar width instead of capping it', () => {
    const css = SHEETS.find(([name]) => name === 'sidebar-layout.css')?.[1] ?? ''
    // The count per line follows the sidebar's width: the row spans the full
    // content width and the wrap does the counting. A fixed cap would hold the
    // row at five icons even in a wider sidebar.
    expect(css).toContain('max-width: 100%')
    expect(css).toContain('flex-wrap: wrap')
    expect(css).not.toContain('calc(36px * 5')
  })

  it('merges the relocated footer actions with the marker the module sets', () => {
    const css = SHEETS.find(([name]) => name === 'sidebar-layout.css')?.[1] ?? ''
    // The stylesheet keys off the attribute the module writes; a rename on one
    // side only would leave the icons unstyled in the footer.
    expect(css).toContain(`[${ENTRIES_ATTRIBUTE}]`)
    expect(css).toContain('display: contents')
  })

  it('paints every top-row background as the same square', () => {
    const css = SHEETS.find(([name]) => name === 'sidebar-layout.css')?.[1] ?? ''
    // The host keeps a 3px transparent side border and paints the hover fill on
    // the padding box, so a 36px button shows a 30×36 rectangle. Dropping the
    // border and clipping to the border box makes that fill the full square,
    // the same shape as a plugin button that brings no border of its own.
    const host = /button\[class\*="panelRow"\] \{[^}]*border: none[^}]*background-clip: border-box/
    const plugin = new RegExp(`\\[${ENTRIES_ATTRIBUTE}\\] button:has\\(svg, img\\) \\{[^}]*border: none[^}]*background-clip: border-box`)
    expect(css).toMatch(host)
    expect(css).toMatch(plugin)
  })

  it('centres a relocated plugin icon instead of the plugin\'s wide pill layout', () => {
    const css = SHEETS.find(([name]) => name === 'sidebar-layout.css')?.[1] ?? ''
    // A plugin that styles its trigger for the footer row sets flex-start and a
    // gap; left alone, the icon sits against the left edge of the 36px square.
    // Only a trigger that carries an icon is normalised — a text-only control in
    // the same slot would be clipped instead of shown.
    const rule = new RegExp(`\\[${ENTRIES_ATTRIBUTE}\\] button:has\\(svg, img\\) \\{[^}]*justify-content: center`)
    expect(css).toMatch(rule)
    expect(css).toMatch(new RegExp(`\\[${ENTRIES_ATTRIBUTE}\\] button:has\\(svg, img\\) \\{[^}]*gap: 0`))
  })

  it('shows a relocated plugin icon without its label', () => {
    const css = SHEETS.find(([name]) => name === 'sidebar-layout.css')?.[1] ?? ''
    // The row is a strip of glyphs. The label markup is the plugin's own, so it
    // is dropped by shape: inside the relocated container an element that
    // carries no icon is text.
    expect(css).toContain(':where(span, label, p, div):not(:empty):not(:has(svg)):not(:has(img))')
    // Text with no element around it has no box to hide; the font size takes it.
    const rule = new RegExp(`\\[${ENTRIES_ATTRIBUTE}\\] button:has\\(svg, img\\) \\{[^}]*font-size: 0`)
    expect(css).toMatch(rule)
  })
})
