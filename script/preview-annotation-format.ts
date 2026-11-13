/**
 * Print the text an outgoing message carries, for each shape of annotation.
 *
 * The composer folds the marked passages into the draft at send time, so the
 * format has to be checked without sending anything. This script calls the same
 * functions the composer calls, on the built source, and prints the result.
 *
 * Run with:
 *   node --experimental-strip-types script/preview-annotation-format.ts
 */
import { annotationBlock, annotationInsertion, annotationsPrompt } from '../src/client/annotations.ts'
import type { Annotation } from '../src/client/annotations.ts'

/** One annotation, as the reader made it. */
const single: Annotation = { id: 'a', passage: '亲密关系里的一点任性。', note: '这句话有一点语病，怎么优化一下？但还是 这个意思。' }

/** A passage and a comment that each cover several lines. */
const multiLine: Annotation = {
  id: 'b',
  passage: '亲密关系里的一点任性，值得被理解。\n它有它的样子。',
  note: '值得被理解和接纳？感觉表达不完整。\n人与宠的关系。',
}

/** A second annotation, to show the separator between entries. */
const second: Annotation = { id: 'c', passage: '有防丢功能的宠物饰品。', note: '是不是可以这么表达，不仅仅是一个装饰品，它还有…讲述它的功能。' }

/** The summary the reader typed before marking anything. */
const summary = '先把这几个问题讨论完整，再进行下一阶段。'

/**
 * Print one case, labelled.
 * @param title - what the case shows.
 * @param annotations - the annotations to render.
 */
function show(title: string, annotations: readonly Annotation[]): void {
  console.log(`\n===== ${title} =====`)
  console.log(annotationsPrompt(annotations))
}

show('一条批注', [single])
show('多条批注', [single, second])
show('多行摘录与多行评论', [multiLine])

console.log('\n===== 一条批注的块（不带编号） =====')
console.log(annotationBlock(single))

console.log('\n===== 最终发出的消息：总说明 + 一条批注 =====')
console.log(`${summary}${annotationInsertion(summary, [single])}`)

console.log('\n===== 最终发出的消息：总说明 + 多条批注 =====')
console.log(`${summary}${annotationInsertion(summary, [single, second])}`)

console.log('\n===== 断言 =====')
const one = annotationInsertion(summary, [single])
const many = annotationInsertion(summary, [single, second])
const multiline = annotationBlock(multiLine)

const checks: [string, boolean][] = [
  ['总说明与第一条批注之间换行', `${summary}${one}`.split('\n')[0] === summary && `${summary}${one}`.split('\n')[1].startsWith('1. Selected text:')],
  ['总说明与第一条批注不再连成一句', !`${summary}${one}`.includes(`${summary}1.`)],
  ['摘录后下一行直接接 User comment', !/\n\n\s*User comment:/.test(annotationBlock(single))],
  ['批注条目之间恰好一个空行', many.replace(/\n+$/, '').split('\n\n').length === 2 && /\n\n2\. Selected text:/.test(many)],
  ['摘录原始换行保留', multiline.includes('   亲密关系里的一点任性，值得被理解。') && multiline.includes('   它有它的样子。')],
  ['评论原始换行保留', multiline.includes('   值得被理解和接纳？感觉表达不完整。') && multiline.includes('   人与宠的关系。')],
]
for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`)
