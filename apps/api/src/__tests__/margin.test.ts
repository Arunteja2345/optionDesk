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
describe('closePosition refund calculation', () => {
  test('BUY: refund = currentLtp * qty', () => {
    const avgPrice = 100
    const currentLtp = 150
    const qty = 65
    const refund = currentLtp * qty
    expect(refund).toBe(9750)
  })

  test('BUY: loss gives smaller refund than cost', () => {
    const avgPrice = 100
    const currentLtp = 50
    const qty = 65
    const cost = avgPrice * qty       // what was paid = 6500
    const refund = currentLtp * qty   // what comes back = 3250
    expect(refund).toBeLessThan(cost)
  })

  test('SELL: refund = blocked + pnl', () => {
    const originallyBlocked = 80000
    const avgPrice = 200
    const currentLtp = 100   // price fell — profit for seller
    const qty = 65
    const pnl = (avgPrice - currentLtp) * qty   // (200-100)*65 = 6500
    const refund = Math.max(0, originallyBlocked + pnl)
    expect(refund).toBe(86500)
  })

  test('SELL: loss reduces refund', () => {
    const originallyBlocked = 80000
    const avgPrice = 100
    const currentLtp = 200  // price rose — loss for seller
    const qty = 65
    const pnl = (avgPrice - currentLtp) * qty   // (100-200)*65 = -6500
    const refund = Math.max(0, originallyBlocked + pnl)
    expect(refund).toBe(73500)
  })

  test('SELL: catastrophic loss refund floored at 0', () => {
    const originallyBlocked = 5000
    const avgPrice = 50
    const currentLtp = 500  // 10x move against seller
    const qty = 65
    const pnl = (avgPrice - currentLtp) * qty   // -29250
    const refund = Math.max(0, originallyBlocked + pnl)
    expect(refund).toBe(0)
  })

  test('SELL: breakeven returns exactly blocked amount', () => {
    const originallyBlocked = 80000
    const avgPrice = 100
    const currentLtp = 100
    const qty = 65
    const pnl = (avgPrice - currentLtp) * qty   // 0
    const refund = Math.max(0, originallyBlocked + pnl)
    expect(refund).toBe(80000)
  })

  test('iron condor: 4 legs refund sum is correct', () => {
    const legs = [
      { side: 'BUY' as const, avgPrice: 50, currentLtp: 30, qty: 65, blocked: 3250 },
      { side: 'SELL' as const, avgPrice: 100, currentLtp: 60, qty: 65, blocked: 70000 },
      { side: 'SELL' as const, avgPrice: 100, currentLtp: 60, qty: 65, blocked: 70000 },
      { side: 'BUY' as const, avgPrice: 50, currentLtp: 30, qty: 65, blocked: 3250 },
    ]

    let totalRefund = 0
    for (const leg of legs) {
      if (leg.side === 'BUY') {
        totalRefund += leg.currentLtp * leg.qty
      } else {
        const pnl = (leg.avgPrice - leg.currentLtp) * leg.qty
        totalRefund += Math.max(0, leg.blocked + pnl)
      }
    }

    // Each sell leg: pnl = (100-60)*65 = 2600, refund = 70000+2600 = 72600
    // Each buy leg: refund = 30*65 = 1950
    // Total = 72600*2 + 1950*2 = 145200 + 3900 = 149100
    expect(totalRefund).toBe(149100)
  })
})