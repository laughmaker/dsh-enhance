#!/usr/bin/env node
/**
 * Sync a `styles/<name>.ts` sheet's `css` literal into the built `lib/client.js`.
 *
 * The bundler in this checkout cannot run here: `@rolldown/binding-darwin-universal`
 * is missing and the arm64 native binding is rejected by macOS code-signing at
 * dlopen time. The committed bundle is a flat `//#region src/...` concatenation
 * with types already stripped, so a stylesheet edit needs no bundler at all —
 * only the one region's `String.raw` payload replaced. Every other region, the
 * import order and the module footer stay byte-identical.
 *
 * Usage: node script/sync-style.mjs [sheet-name ...]   (default: every sheet)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT = join(ROOT, 'lib/client.js')
const STYLES_DIR = join(ROOT, 'src/client/styles')

/**
 * Pull the CSS out of a stylesheet source: the text between the opening
 * backtick of `String.raw` and the closing backtick that ends the template.
 * @param source - the `.ts` file contents.
 * @returns the raw CSS payload.
 */
function extractCss(source) {
  const start = source.indexOf('String.raw`')
  if (start < 0) throw new Error('no String.raw template found')
  const from = start + 'String.raw`'.length
  // The template has no interpolations, so the first unescaped backtick closes it.
  let index = from
  while (index < source.length) {
    if (source[index] === '\\') { index += 2; continue }
    if (source[index] === '`') return source.slice(from, index)
    index += 1
  }
  throw new Error('unterminated template')
}

/**
 * Reject CSS that cannot live inside a `String.raw` template.
 *
 * The sheet is injected as a template literal, so a backtick or a `${` in a
 * comment (easy to write when documenting a CSS variable) closes the literal
 * early and silently truncates every rule after it — the bundle still parses,
 * the stylesheet is just gone.
 * @param sheet - stylesheet name, for the message.
 * @param css - the extracted payload.
 */
function assertTemplateSafe(sheet, source) {
  const open = source.indexOf('String.raw`')
  if (open < 0) return
  const from = open + 'String.raw`'.length
  const close = source.indexOf('`', from)
  if (close < 0) throw new Error(`${sheet}: unterminated template`)
  // Anything after the closing delimiter that still looks like CSS means the
  // literal closed early — almost always a backtick inside a comment.
  const rest = source.slice(close + 1).trim()
  if (rest.length > 0 && !rest.startsWith('//')) {
    throw new Error(`${sheet}: template appears truncated at offset ${close}; a backtick inside the CSS closed it early`)
  }
  if (source.slice(from, close).includes('${')) {
    throw new Error(`${sheet}: interpolation in CSS would be evaluated`)
  }
}

/**
 * Replace one region's payload inside the bundle.
 *
 * The bundler emits regions either as `//#region <path>` … `//#endregion` or,
 * at a lower comment level, as a bare `// <path>` separator line. Both forms
 * are accepted so the script keeps working across tsdown/rolldown versions.
 * @param bundle - current `lib/client.js` contents.
 * @param sheet - stylesheet base name, e.g. `sidebar-density`.
 * @param css - the new CSS payload.
 * @returns updated bundle contents.
 */
function replaceRegion(bundle, sheet, css) {
  const sourcePath = `src/client/styles/${sheet}.ts`
  const marked = `//#region ${sourcePath}`
  let at = bundle.indexOf(marked)
  let end = at < 0 ? -1 : bundle.indexOf('//#endregion', at)
  if (at < 0) {
    // Bare form: the header line is the whole marker, and the region ends where
    // the next source file starts (or at the bundle footer).
    const escaped = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const header = new RegExp(`^[ \\t]*// ${escaped}$`, 'm').exec(bundle)
    if (header === null) throw new Error(`region not found: ${sheet}`)
    at = header.index
    const next = new RegExp(`^[ \\t]*// src/client/[^\\n]+$`, 'gm')
    next.lastIndex = header.index + header[0].length
    const following = next.exec(bundle)
    end = following === null ? bundle.indexOf('return module.exports', at) : following.index
    if (end < 0) throw new Error(`region end not found: ${sheet}`)
  }

  const region = bundle.slice(at, end)
  const open = region.indexOf('String.raw`')
  if (open < 0) throw new Error(`no template in region: ${sheet}`)
  const close = region.lastIndexOf('`')
  if (close < open) throw new Error(`unterminated template in region: ${sheet}`)

  const rebuilt = `${region.slice(0, open)}String.raw\`${css}\`${region.slice(close + 1)}`
  return bundle.slice(0, at) + rebuilt + bundle.slice(end)
}

const requested = process.argv.slice(2)
const sheets = requested.length > 0
  ? requested
  : ['document-preview', 'chat-markdown', 'rightbar-handle', 'running-spinner', 'sidebar-density', 'sidebar-layout', 'toolbar']

let bundle = readFileSync(CLIENT, 'utf8')
for (const sheet of sheets) {
  const source = readFileSync(join(STYLES_DIR, `${sheet}.ts`), 'utf8')
  // Scan the whole source, not just the extracted slice: extraction stops at the
  // first backtick, so a stray one inside a comment silently truncates the
  // payload and the truncated result contains no backtick to check.
  assertTemplateSafe(sheet, source)
  const css = extractCss(source)
  bundle = replaceRegion(bundle, sheet, css)
  console.log(`synced ${sheet}.ts -> lib/client.js (${css.length} chars)`)
}
writeFileSync(CLIENT, bundle)
console.log(`wrote ${CLIENT}`)
