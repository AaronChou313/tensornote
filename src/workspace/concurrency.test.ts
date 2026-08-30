import { describe, expect, it } from 'vitest'
import { mapConcurrent } from './concurrency'

describe('mapConcurrent', () => {
  it('preserves order while bounding active provider operations', async () => {
    let active = 0
    let peak = 0
    const values = Array.from({ length: 17 }, (_, index) => index)
    const result = await mapConcurrent(values, 3, async (value) => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      active -= 1
      return value * 2
    })

    expect(result).toEqual(values.map((value) => value * 2))
    expect(peak).toBe(3)
  })

  it('rejects invalid limits', async () => {
    await expect(mapConcurrent([1], 0, async (value) => value)).rejects.toThrow('positive integer')
  })
})
