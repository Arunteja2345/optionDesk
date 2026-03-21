import { calculateBrokerage } from '../utils/brokerage'

describe('calculateBrokerage — BUY side', () => {
  test('brokerage is capped at ₹20 for large orders', () => {
    // turnover = 10 * 65 * 1000 = 650000
    // 0.03% of 650000 = 195 → capped at 20
    const result = calculateBrokerage('BUY', 10, 65, 1000)
    expect(result.brokerage).toBe(20)
  })

  test('brokerage is 0.03% for small orders', () => {
    // turnover = 1 * 65 * 10 = 650
    // 0.03% of 650 = 0.195 → less than 20
    const result = calculateBrokerage('BUY', 1, 65, 10)
    expect(result.brokerage).toBeLessThan(20)
    expect(result.brokerage).toBeCloseTo(0.20, 1)
  })

  test('no STT on BUY side', () => {
    const result = calculateBrokerage('BUY', 1, 65, 100)
    expect(result.stt).toBe(0)
  })

  test('stamp duty charged on BUY side', () => {
    const result = calculateBrokerage('BUY', 1, 65, 100)
    expect(result.stampDuty).toBeGreaterThan(0)
  })

  test('exchange charge on both sides', () => {
    const buy = calculateBrokerage('BUY', 1, 65, 100)
    const sell = calculateBrokerage('SELL', 1, 65, 100)
    expect(buy.exchangeCharge).toBeGreaterThan(0)
    expect(sell.exchangeCharge).toBeGreaterThan(0)
  })

  test('total is sum of all components', () => {
    const r = calculateBrokerage('BUY', 1, 65, 100)
    const expected = r.brokerage + r.stt + r.exchangeCharge +
                     r.gst + r.sebiCharge + r.stampDuty
    expect(r.total).toBeCloseTo(expected, 2)
  })
})

describe('calculateBrokerage — SELL side', () => {
  test('STT charged on SELL side', () => {
    const result = calculateBrokerage('SELL', 1, 65, 100)
    expect(result.stt).toBeGreaterThan(0)
  })

  test('no stamp duty on SELL', () => {
    const result = calculateBrokerage('SELL', 1, 65, 100)
    expect(result.stampDuty).toBe(0)
  })

  test('STT = 0.0625% of turnover on sell', () => {
    // turnover = 1 * 65 * 100 = 6500
    // STT = 6500 * 0.000625 = 4.0625
    const result = calculateBrokerage('SELL', 1, 65, 100)
    expect(result.stt).toBeCloseTo(4.06, 1)
  })

  test('total is sum of all components', () => {
    const r = calculateBrokerage('SELL', 1, 65, 100)
    const expected = r.brokerage + r.stt + r.exchangeCharge +
                     r.gst + r.sebiCharge + r.stampDuty
    expect(r.total).toBeCloseTo(expected, 2)
  })
})

describe('calculateBrokerage — GST', () => {
  test('GST = 18% of brokerage + exchange charge', () => {
    const r = calculateBrokerage('BUY', 1, 65, 100)
    const expectedGst = (r.brokerage + r.exchangeCharge) * 0.18
    expect(r.gst).toBeCloseTo(expectedGst, 2)
  })
})

describe('calculateBrokerage — real trade example', () => {
  test('1 lot NIFTY option at ₹100 BUY charges are reasonable', () => {
    // 1 lot * 65 units * ₹100 = ₹6500 turnover
    const result = calculateBrokerage('BUY', 1, 65, 100)
    // Total charges should be between ₹20 and ₹35 for this size
    expect(result.total).toBeGreaterThan(20)
    expect(result.total).toBeLessThan(40)
  })

  test('charges are higher for SELL due to STT', () => {
    const buy = calculateBrokerage('BUY', 1, 65, 100)
    const sell = calculateBrokerage('SELL', 1, 65, 100)
    expect(sell.total).toBeGreaterThan(buy.total)
  })

  test('charges scale with lot size', () => {
    const oneLot = calculateBrokerage('BUY', 1, 65, 100)
    const fiveLots = calculateBrokerage('BUY', 5, 65, 100)
    // Exchange/STT/stamp/SEBI scale linearly, brokerage caps at 20
    expect(fiveLots.exchangeCharge).toBeCloseTo(oneLot.exchangeCharge * 5, 1)
  })
})