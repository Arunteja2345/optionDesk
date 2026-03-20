import { calculateMargin } from '../services/OrderService'

describe('calculateMargin', () => {
  const lotSize = 65
  const underlyingLtp = 23000

  test('BUY: deducts full premium cost', () => {
    const result = calculateMargin('BUY', 1, lotSize, 100, underlyingLtp)
    // 1 lot * 65 * ₹100 = ₹6500
    expect(result.requiredAmount).toBe(6500)
  })

  test('BUY: 2 lots doubles the cost', () => {
    const result = calculateMargin('BUY', 2, lotSize, 100, underlyingLtp)
    expect(result.requiredAmount).toBe(13000)
  })

  test('SELL: blocks SPAN + Exposure minus premium received', () => {
    const result = calculateMargin('SELL', 1, lotSize, 100, underlyingLtp)
    // SPAN = 5% * 65 * 23000 = 74750
    // Exposure = 2% * 65 * 23000 = 29900
    // Total margin = 104650
    // Premium received = 1 * 65 * 100 = 6500
    // Net blocked = 104650 - 6500 = 98150
    expect(result.spanMargin).toBeCloseTo(74750)
    expect(result.exposureMargin).toBeCloseTo(29900)
    expect(result.premiumReceived).toBe(6500)
    expect(result.requiredAmount).toBeCloseTo(98150)
  })

  test('SELL: higher premium reduces net blocked amount', () => {
    const lowPremium = calculateMargin('SELL', 1, lotSize, 50, underlyingLtp)
    const highPremium = calculateMargin('SELL', 1, lotSize, 500, underlyingLtp)
    // Higher premium received = less blocked
    expect(highPremium.requiredAmount).toBeLessThan(lowPremium.requiredAmount)
  })

  test('SELL: net blocked never goes negative', () => {
    // Extremely high premium
    const result = calculateMargin('SELL', 1, lotSize, 5000, underlyingLtp)
    expect(result.requiredAmount).toBeGreaterThanOrEqual(0)
  })
})

describe('P&L calculation', () => {
  test('BUY: profit when price goes up', () => {
    const qty = 65
    const avgPrice = 100
    const currentLtp = 150
    const pnl = (currentLtp - avgPrice) * qty
    expect(pnl).toBe(3250)
  })

  test('BUY: loss when price goes down', () => {
    const qty = 65
    const avgPrice = 100
    const currentLtp = 60
    const pnl = (currentLtp - avgPrice) * qty
    expect(pnl).toBe(-2600)
  })

  test('SELL: profit when price goes down', () => {
    const qty = 65
    const avgPrice = 100
    const currentLtp = 60
    const pnl = (avgPrice - currentLtp) * qty
    expect(pnl).toBe(2600)
  })

  test('SELL: loss when price goes up', () => {
    const qty = 65
    const avgPrice = 100
    const currentLtp = 150
    const pnl = (avgPrice - currentLtp) * qty
    expect(pnl).toBe(-3250)
  })
})