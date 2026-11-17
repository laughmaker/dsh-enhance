// @vitest-environment jsdom
/**
 * Tests for reading annotation entries back out of a sent message.
 *
 * The wire text is produced by `annotationsPrompt`; these tests feed that text
 * straight back in, so a change to the writer and a change to the reader that
 * disagree will fail here before the transcript ever renders.
 */
import { describe, expect, it } from 'vitest'
import { ANNOTATION_RULE_ID, annotationDisplayRule, parseAnnotationEntries } from '../src/client/annotation-display.ts'
import { annotationsPrompt, type Annotation } from '../src/client/annotations.ts'

/** Build a minimal annotation for the writer. */
function anno(passage: string, note = ''): Annotation {
  return { id: `a-${passage}-${note}`, passage, note }
}

describe('parseAnnotationEntries', () => {
  it('reads a single passage with no comment and takes the whole message', () => {
    const text = annotationsPrompt([anno('这是之前')])
    const entries = parseAnnotationEntries(text)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.number).toBe(1)
    expect(entries[0]!.quote).toEqual(['这是之前'])
    expect(entries[0]!.comment).toBeUndefined()
    expect(text.slice(entries[0]!.start, entries[0]!.end)).toBe(text)
  })

  it('reads several entries, keeping their ranges adjacent across the separator', () => {
    const text = annotationsPrompt([anno('第一段', '第一条说明'), anno('第二段', '第二条说明')])
    const entries = parseAnnotationEntries(text)
    expect(entries.map(entry => entry.number)).toEqual([1, 2])
    expect(entries[0]!.quote).toEqual(['第一段'])
    expect(entries[0]!.comment).toEqual(['第一条说明'])
    expect(entries[1]!.quote).toEqual(['第二段'])
    expect(entries[1]!.comment).toEqual(['第二条说明'])
    expect(entries[0]!.end).toBe(entries[1]!.start)
  })

  it('keeps the line breaks of a multi-line passage and a multi-line comment', () => {
    const text = annotationsPrompt([anno('第一行\n第二行', '思考一\n思考二')])
    const [entry] = parseAnnotationEntries(text)
    expect(entry!.quote).toEqual(['第一行', '第二行'])
    expect(entry!.comment).toEqual(['思考一', '思考二'])
  })

  it('keeps a blank line inside a passage', () => {
    const [entry] = parseAnnotationEntries(annotationsPrompt([anno('first\n\nsecond', 'note')]))
    expect(entry!.quote).toEqual(['first', '', 'second'])
  })

  it('keeps every blank line of a run inside a passage', () => {
    const [entry] = parseAnnotationEntries(annotationsPrompt([anno('first\n\n\n\nsecond', 'note')]))
    expect(entry!.quote).toEqual(['first', '', '', '', 'second'])
  })

  it('keeps every blank line of a run inside a comment', () => {
    const [entry] = parseAnnotationEntries(annotationsPrompt([anno('passage', 'one\n\n\ntwo')]))
    expect(entry!.comment).toEqual(['one', '', '', 'two'])
  })

  it('keeps a blank line at the end of a passage before the comment label', () => {
    // The writer trims the passage, so this shape only arrives if a message was
    // edited by hand; the reader still keeps the blank line with the passage.
    const [entry] = parseAnnotationEntries('1. Selected text:\n   first\n\n   User comment:\n   note')
    expect(entry!.quote).toEqual(['first', ''])
    expect(entry!.comment).toEqual(['note'])
  })

  it('leaves a summary before the first entry out of the block', () => {
    const prompt = annotationsPrompt([anno('摘录', '评论')])
    const text = `总结在前。\n${prompt}`
    const [entry] = parseAnnotationEntries(text)
    expect(entry!.start).toBe('总结在前。\n'.length)
    expect(entry!.quote).toEqual(['摘录'])
  })

  it('leaves body text after the last entry out of the block', () => {
    const text = `${annotationsPrompt([anno('摘录', '评论')])}\n\n这是我的问题`
    const [entry] = parseAnnotationEntries(text)
    expect(entry!.comment).toEqual(['评论'])
    expect(text.slice(entry!.end)).toBe('这是我的问题')
  })

  it('keeps a truncated passage', () => {
    const long = 'x'.repeat(300)
    const [entry] = parseAnnotationEntries(annotationsPrompt([anno(long, 'note')]))
    expect(entry!.quote).toHaveLength(1)
    expect(entry!.quote[0]!.endsWith('…')).toBe(true)
    expect(entry!.quote[0]!.length).toBe(140)
  })

  it('separates entries with exactly one blank line', () => {
    const text = annotationsPrompt([anno('a', 'b'), anno('c', 'd')])
    expect(text).toContain('   b\n\n2. Selected text:')
  })
})

describe('parseAnnotationEntries — ordinary messages stay ordinary', () => {
  it('ignores a prose mention of the label', () => {
    expect(parseAnnotationEntries('I saw "Selected text:" in your message')).toEqual([])
  })

  it('ignores a header without a number', () => {
    expect(parseAnnotationEntries('Selected text:\n   foo')).toEqual([])
  })

  it('ignores a header that has trailing text', () => {
    expect(parseAnnotationEntries('1. Selected text: foo\n   bar')).toEqual([])
  })

  it('ignores an entry whose number does not continue the run', () => {
    expect(parseAnnotationEntries('1. Selected text:\n   a\n\n3. Selected text:\n   b')).toHaveLength(1)
  })

  it('ignores a stray numbered header after real body text', () => {
    const text = `${annotationsPrompt([anno('a', 'b')])}\n\n9. Selected text:\n   not part of it`
    expect(parseAnnotationEntries(text)).toHaveLength(1)
  })

  it('ignores a comment label with no comment under it', () => {
    expect(parseAnnotationEntries('1. Selected text:\n   quote\n   User comment:')).toEqual([])
  })
})

describe('parseAnnotationEntries — code blocks stay code', () => {
  it('ignores an example that looks like an entry inside a fenced block', () => {
    const text = [
      '看看这个格式：',
      '```',
      '1. Selected text:',
      '   这是示例',
      '   User comment:',
      '   示例评论',
      '```',
    ].join('\n')
    expect(parseAnnotationEntries(text)).toEqual([])
  })

  it('ignores a tilde-fenced example', () => {
    const text = ['~~~', '1. Selected text:', '   这是示例', '~~~'].join('\n')
    expect(parseAnnotationEntries(text)).toEqual([])
  })

  it('still reads the real entries that follow a fenced block', () => {
    const text = [
      '```',
      '1. Selected text:',
      '   这是示例',
      '```',
      '',
      annotationsPrompt([anno('真的摘录', '真的评论')]),
    ].join('\n')
    const entries = parseAnnotationEntries(text)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.quote).toEqual(['真的摘录'])
    expect(entries[0]!.comment).toEqual(['真的评论'])
  })

  it('treats a fence inside a passage as plain text, not as a code block', () => {
    const [entry] = parseAnnotationEntries(annotationsPrompt([anno('```\n1. Selected text:\n   x\n```', 'note')]))
    expect(entry!.quote).toEqual(['```', '1. Selected text:', '   x', '```'])
  })

  it('still reads the entries after an unterminated fence', () => {
    const text = ['```', '', annotationsPrompt([anno('真的摘录', '真的评论')])].join('\n')
    const entries = parseAnnotationEntries(text)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.quote).toEqual(['真的摘录'])
    expect(entries[0]!.comment).toEqual(['真的评论'])
  })
})

describe('annotationDisplayRule', () => {
  const text = annotationsPrompt([anno('第一段', '说明一'), anno('第二段', '说明二')])

  it('walks the entries one call at a time', () => {
    const first = annotationDisplayRule.match(text, 0)
    expect(first?.id).toBe(ANNOTATION_RULE_ID)
    expect(first?.data.number).toBe(1)
    expect(first?.start).toBe(0)

    const second = annotationDisplayRule.match(text, first!.end)
    expect(second?.data.number).toBe(2)

    expect(annotationDisplayRule.match(text, second!.end)).toBeUndefined()
  })

  it('publishes stable data across calls so node identity can be reused', () => {
    const a = annotationDisplayRule.match(text, 0)
    const b = annotationDisplayRule.match(text, 0)
    expect(b!.data).toEqual(a!.data)
    expect(b!.start).toBe(a!.start)
    expect(b!.end).toBe(a!.end)
  })

  it('does not match inside its own entry when asked from the middle', () => {
    const first = annotationDisplayRule.match(text, 0)!
    const second = annotationDisplayRule.match(text, first.start + 1)
    expect(second?.data.number).toBe(2)
  })
})
