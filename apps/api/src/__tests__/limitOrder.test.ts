import { shouldFill } from '../workers/limitOrderExecutor'
import { calculateMargin } from '../services/OrderService'

describe('shouldFill — limit order trigger logic', () => {
  describe('BUY limit orders', () => {
    test('fills when market price equals limit price', () => {
      expect(shouldFill('BUY', 100, 100)).toBe(true)
    })

    test('fills when market price drops below limit price', () => {
      expect(shouldFill('BUY', 95, 100)).toBe(true)
    })

    test('does not fill when market price is above limit price', () => {
      expect(shouldFill('BUY', 105, 100)).toBe(false)
    })
  })

  describe('SELL limit orders', () => {
    test('fills when market price equals limit price', () => {
      expect(shouldFill('SELL', 100, 100)).toBe(true)
    })

    test('fills when market price rises above limit price', () => {
      expect(shouldFill('SELL', 110, 100)).toBe(true)
    })

    test('does not fill when market price is below limit price', () => {
      expect(shouldFill('SELL', 90, 100)).toBe(false)
    })
  })
})

describe('calculateMargin — edge cases', () => {
  const lotSize = 65
  const underlyingLtp = 23000

  test('BUY: zero price means zero cost', () => {
    const result = calculateMargin('BUY', 1, lotSize, 0, underlyingLtp)
    expect(result.requiredAmount).toBe(0)
  })

  test('SELL: zero underlying means zero margin', () => {
    const result = calculateMargin('SELL', 1, lotSize, 100, 0)
    expect(result.spanMargin).toBe(0)
    expect(result.exposureMargin).toBe(0)
    // Premium received = 65 * 100 = 6500, netBlock = max(0, 0 - 6500) = 0
    expect(result.requiredAmount).toBe(0)
  })

  test('SELL: 5 lots multiplies margin correctly', () => {
    const single = calculateMargin('SELL', 1, lotSize, 100, underlyingLtp)
    const five = calculateMargin('SELL', 5, lotSize, 100, underlyingLtp)
    expect(five.spanMargin).toBeCloseTo(single.spanMargin! * 5)
    expect(five.exposureMargin).toBeCloseTo(single.exposureMargin! * 5)
  })

  test('BUY: lot size affects total cost', () => {
    const nifty = calculateMargin('BUY', 1, 65, 100, underlyingLtp)
    const bankNifty = calculateMargin('BUY', 1, 30, 100, underlyingLtp)
    expect(nifty.requiredAmount).toBe(6500)
    expect(bankNifty.requiredAmount).toBe(3000)
  })
})

describe('P&L scenarios', () => {
  const qty = 65

  test('BUY: breakeven when exit equals entry', () => {
    const pnl = (100 - 100) * qty
    expect(pnl).toBe(0)
  })

  test('BUY: 50% gain on option price', () => {
    const pnl = (150 - 100) * qty
    expect(pnl).toBe(3250)
  })

  test('BUY: option expires worthless = full premium loss', () => {
    const pnl = (0 - 100) * qty
    expect(pnl).toBe(-6500)
  })

  test('SELL: option expires worthless = full premium profit', () => {
    const pnl = (100 - 0) * qty
    expect(pnl).toBe(6500)
  })

  test('SELL: breakeven when exit equals entry', () => {
    const pnl = (100 - 100) * qty
    expect(pnl).toBe(0)
  })

  test('SELL: 50% loss when price doubles', () => {
    const pnl = (100 - 200) * qty
    expect(pnl).toBe(-6500)
  })
})