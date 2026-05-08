import { describe, expect, it } from 'vitest'

import { tryParsePartial } from './partial-json'

describe('tryParsePartial', () => {
  it('parses complete JSON object as complete', () => {
    expect(tryParsePartial('{"a":1,"b":"x"}')).toEqual({
      value: { a: 1, b: 'x' },
      complete: true,
    })
  })

  it('parses complete array as complete', () => {
    expect(tryParsePartial('[1,2,3]')).toEqual({ value: [1, 2, 3], complete: true })
  })

  it('returns undefined for empty buffer', () => {
    expect(tryParsePartial('')).toEqual({ value: undefined, complete: false })
    expect(tryParsePartial('   ')).toEqual({ value: undefined, complete: false })
  })

  it('closes unbalanced object', () => {
    const result = tryParsePartial<{ a: number }>('{"a":1')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 1 })
  })

  it('closes unbalanced array', () => {
    const result = tryParsePartial<number[]>('[1,2')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual([1, 2])
  })

  it('handles truncated string in value', () => {
    const result = tryParsePartial<{ a: string }>('{"a":"hel')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 'hel' })
  })

  it('drops trailing comma', () => {
    const result = tryParsePartial<{ a: number }>('{"a":1,')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 1 })
  })

  it('drops trailing colon (incomplete pair)', () => {
    const result = tryParsePartial<{ a: number }>('{"a":1,"b":')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 1 })
  })

  it('drops incomplete key after comma', () => {
    const result = tryParsePartial<{ a: number }>('{"a":1,"bc')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 1 })
  })

  it('handles nested partial structures', () => {
    const result = tryParsePartial<{ a: { b: number[] } }>('{"a":{"b":[1,2')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: { b: [1, 2] } })
  })

  it('mid-array of objects', () => {
    const result = tryParsePartial<{ id: number }[]>('[{"id":1},{"id":2')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('drops trailing partial number', () => {
    const result = tryParsePartial<{ a: number }>('{"a":1.')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 1 })
  })

  it('drops trailing dangling backslash in string', () => {
    const result = tryParsePartial<{ a: string }>('{"a":"foo\\')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 'foo' })
  })

  it('drops incomplete unicode escape', () => {
    const result = tryParsePartial<{ a: string }>(String.raw`{"a":"smile \u26`)

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 'smile ' })
  })

  it('preserves valid escapes', () => {
    const result = tryParsePartial<{ a: string }>(String.raw`{"a":"line\nbreak"`)

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 'line\nbreak' })
  })

  it('handles strings containing brackets', () => {
    const result = tryParsePartial<{ a: string }>('{"a":"hello {world}","b":[1,2')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: 'hello {world}', b: [1, 2] })
  })

  it('parses recommendations-shaped partial', () => {
    const buf =
      '{"reply":"hi","confidence":0.9,"summary":"ok","tableOps":[],"recommendations":[{"id":"a","brand":"X","name":"Y","tag":"test"},{"id":"b","brand":"Z'
    const result = tryParsePartial<{ recommendations: { id: string; brand: string }[] }>(buf)

    expect(result.complete).toBe(false)
    expect(result.value?.recommendations?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(result.value?.recommendations?.[0]).toEqual({ brand: 'X', id: 'a', name: 'Y', tag: 'test' })
  })

  it('returns complete=true on JSON pretty-printed with whitespace', () => {
    const result = tryParsePartial('  {\n  "a": 1\n}  \n')

    expect(result.complete).toBe(true)
    expect(result.value).toEqual({ a: 1 })
  })

  it('handles deeply nested partials', () => {
    const result = tryParsePartial<{ a: { b: { c: { d: number } } } }>('{"a":{"b":{"c":{"d":42')

    expect(result.complete).toBe(false)
    expect(result.value).toEqual({ a: { b: { c: { d: 42 } } } })
  })

  it('returns undefined if cannot repair (garbage)', () => {
    const result = tryParsePartial('not json at all xyz')

    expect(result.value).toBeUndefined()
    expect(result.complete).toBe(false)
  })
})
