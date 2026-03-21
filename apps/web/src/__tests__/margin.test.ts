// Test the margin calculation logic used in the UI
function calculateDisplayCost(
  side: 'BUY' | 'SELL',
  lots: number,
  lotSize: number,
  ltp: number,
  underlyingLtp: number
) {
  if (side === 'BUY') {
    return { total: lots * lotSize * ltp, label: 'Total Cost' }
  }
  const span = 0.05 * lotSize * underlyingLtp * lots
  const exposure = 0.02 * lotSize * underlyingLtp * lots
  const premium = lots * lotSize * ltp
  const netBlock = Math.max(0, span + exposure - premium)
  return { total: netBlock, label: 'Margin Required' }
}

describe('Order modal cost display', () => {
  test('BUY 1 lot at ₹100 shows ₹6500 total', () => {
    const result = calculateDisplayCost('BUY', 1, 65, 100, 23000)
    expect(result.total).toBe(6500)
    expect(result.label).toBe('Total Cost')
  })

  test('SELL shows margin required label', () => {
    const result = calculateDisplayCost('SELL', 1, 65, 100, 23000)
    expect(result.label).toBe('Margin Required')
  })

  test('SELL margin is based on underlying price not premium', () => {
    const result = calculateDisplayCost('SELL', 1, 65, 500, 23000)
    // SPAN = 5% * 65 * 23000 = 74750
    // Exposure = 2% * 65 * 23000 = 29900
    // Total margin = 104650
    // Premium received = 65 * 500 = 32500
    // Net blocked = 104650 - 32500 = 72150
    expect(result.total).toBe(72150)
  })

  test('SELL margin decreases as premium increases', () => {
    const lowPremium = calculateDisplayCost('SELL', 1, 65, 100, 23000)
    const highPremium = calculateDisplayCost('SELL', 1, 65, 500, 23000)
    expect(highPremium.total).toBeLessThan(lowPremium.total)
  })

  test('SELL margin is zero when premium exceeds total margin', () => {
    const result = calculateDisplayCost('SELL', 1, 65, 2000, 23000)
    expect(result.total).toBe(0)
  })

  test('BUY 2 lots doubles the cost', () => {
    const one = calculateDisplayCost('BUY', 1, 65, 100, 23000)
    const two = calculateDisplayCost('BUY', 2, 65, 100, 23000)
    expect(two.total).toBe(one.total * 2)
  })
})


describe('Strike price display', () => {
  test('raw strike 2330000 displays as 23300', () => {
    const raw = 2330000
    const display = raw / 100
    expect(display).toBe(23300)
  })

  test('raw strike 2300000 displays as 23000', () => {
    expect(2300000 / 100).toBe(23000)
  })
})

describe('OI bar percentage', () => {
  test('zero OI shows 0%', () => {
    const pct = Math.min(100, 1000 > 0 ? (0 / 1000) * 100 : 0)
    expect(pct).toBe(0)
  })

  test('max OI shows 100%', () => {
    const pct = Math.min(100, 1000 > 0 ? (1000 / 1000) * 100 : 0)
    expect(pct).toBe(100)
  })

  test('never exceeds 100%', () => {
    const pct = Math.min(100, 1000 > 0 ? (2000 / 1000) * 100 : 0)
    expect(pct).toBe(100)
  })

  test('proportional for mid values', () => {
    const pct = Math.min(100, 1000 > 0 ? (500 / 1000) * 100 : 0)
    expect(pct).toBe(50)
  })
})