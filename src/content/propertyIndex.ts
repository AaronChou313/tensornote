import type { Note } from '../types'

export type PropertyFieldType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'unknown' | 'mixed'

export interface PropertyField {
  key: string
  type: PropertyFieldType
  documents: number
  values: string[]
}

export interface PropertyRow {
  note: Note
  values: Record<string, unknown>
}

export interface PropertyQueryResult {
  rows: PropertyRow[]
  error?: string
}

export interface PropertyIndex {
  rows: PropertyRow[]
  fields: PropertyField[]
  query: (expression: string) => PropertyQueryResult
}

type PropertyComparison = {
  key: string
  operator: '=' | '!='
  value: string | number | boolean | null
}

type ParsedValue =
  | { value: PropertyComparison['value'] }
  | { error: string }

function fieldType(value: unknown): Exclude<PropertyFieldType, 'mixed'> {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'unknown'
}

function valuesEqual(left: unknown, right: PropertyComparison['value']) {
  return typeof left === typeof right && left === right
}

function matchesValue(value: unknown, expected: PropertyComparison['value']) {
  return Array.isArray(value)
    ? value.some((item) => valuesEqual(item, expected))
    : valuesEqual(value, expected)
}

function splitAnd(expression: string): string[] | string {
  const clauses: string[] = []
  let start = 0
  let quote: '"' | "'" | undefined
  let escaped = false

  for (let index = 0; index < expression.length; index += 1) {
    const character = expression[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = undefined
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (
      expression.slice(index, index + 3).toLocaleLowerCase() === 'and'
      && /\s/.test(expression[index - 1] ?? '')
      && /\s/.test(expression[index + 3] ?? '')
    ) {
      clauses.push(expression.slice(start, index).trim())
      start = index + 3
      index += 2
    }
  }

  if (quote) return '查询格式无效：字符串引号未闭合。'
  clauses.push(expression.slice(start).trim())
  return clauses
}

function parseValue(source: string): ParsedValue {
  const value = source.trim()
  if (!value) return { error: '查询格式无效：比较值不能为空。' }

  const first = value[0]
  if (first === '"' || first === "'") {
    if (value.length < 2 || value.at(-1) !== first) return { error: '查询格式无效：字符串引号未闭合。' }
    const body = value.slice(1, -1)
    let result = ''
    let escaped = false
    for (const character of body) {
      if (escaped) {
        result += character
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else {
        result += character
      }
    }
    if (escaped) return { error: '查询格式无效：字符串转义未完成。' }
    return { value: result }
  }
  if (/^null$/i.test(value)) return { value: null }
  if (/^true$/i.test(value)) return { value: true }
  if (/^false$/i.test(value)) return { value: false }
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return { value: Number(value) }
  return { value }
}

function parseComparison(source: string): PropertyComparison | string {
  const match = source.match(/^([^!=]+?)\s*(!=|=)\s*(.*?)$/)
  if (!match || !match[1].trim()) return `查询格式无效：无法解析条件“${source || '（空）'}”。`
  if (/^[!=]/.test(match[3].trim())) return `查询格式无效：无法解析条件“${source}”。`
  const parsedValue = parseValue(match[3])
  if ('error' in parsedValue) return parsedValue.error
  return { key: match[1].trim(), operator: match[2] as PropertyComparison['operator'], value: parsedValue.value }
}

function parseQuery(expression: string): PropertyComparison[] | string {
  const clauses = splitAnd(expression)
  if (typeof clauses === 'string') return clauses
  const comparisons = clauses.map(parseComparison)
  const error = comparisons.find((comparison): comparison is string => typeof comparison === 'string')
  return error ?? comparisons as PropertyComparison[]
}

function displayValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(displayValues)
  if (value === null) return ['null']
  if (typeof value === 'object') {
    try {
      return [JSON.stringify(value)]
    } catch {
      return [String(value)]
    }
  }
  return [String(value)]
}

function uniqueValues(values: string[]) {
  return values.filter((value, index) => values.findIndex((candidate) => Object.is(candidate, value)) === index)
}

export function buildPropertyIndex(documents: Note[]): PropertyIndex {
  const rows = documents.map((note) => ({ note, values: note.properties }))
  const fieldsByKey = new Map<string, { key: string; documents: Set<Note>; values: string[]; types: Set<PropertyFieldType> }>()

  for (const note of documents) {
    for (const [key, value] of Object.entries(note.properties)) {
      const lookupKey = key.toLocaleLowerCase()
      const field = fieldsByKey.get(lookupKey) ?? { key, documents: new Set<Note>(), values: [], types: new Set<PropertyFieldType>() }
      field.documents.add(note)
      field.values.push(...displayValues(value))
      field.types.add(fieldType(value))
      fieldsByKey.set(lookupKey, field)
    }
  }

  const fields = [...fieldsByKey.values()]
    .map(({ key, documents, values, types }) => ({
      key,
      documents: documents.size,
      values: uniqueValues(values),
      type: types.size === 1 ? [...types][0] : 'mixed' as const,
    }))
    .sort((left, right) => left.key.localeCompare(right.key, 'zh-CN'))

  const query = (expression: string): PropertyQueryResult => {
    if (!expression.trim()) return { rows }
    const comparisons = parseQuery(expression)
    if (typeof comparisons === 'string') return { rows: [], error: comparisons }
    return {
      rows: rows.filter((row) => comparisons.every((comparison) => {
        const property = Object.entries(row.values).find(([key]) => key.toLocaleLowerCase() === comparison.key.toLocaleLowerCase())
        const equal = property ? matchesValue(property[1], comparison.value) : false
        return comparison.operator === '=' ? equal : !equal
      })),
    }
  }

  return { rows, fields, query }
}
