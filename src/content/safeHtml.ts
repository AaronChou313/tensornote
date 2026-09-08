import { defaultSchema } from 'rehype-sanitize'

/** Parse untrusted README HTML before trusted math/highlight transforms. */
export const safeHtmlSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), ['align', 'left', 'center', 'right']],
    p: [...(defaultSchema.attributes?.p ?? []), ['align', 'left', 'center', 'right']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./, 'math-inline', 'math-display']],
  },
  strip: [...(defaultSchema.strip ?? []), 'script', 'style', 'iframe', 'object', 'embed', 'form'],
}

export function imageDimension(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string' && /^\d+(?:\.\d+)?%?$/.test(value)) return value
  return undefined
}
