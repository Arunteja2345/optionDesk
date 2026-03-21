// Test basket leg logic
interface BasketLeg {
  id: string
  side: 'BUY' | 'SELL'
  optionType: 'CE' | 'PE'
  strikePrice: number
  quantity: number
  ltp: number
}

function isSpread(legs: BasketLeg[]): boolean {
  const hasBuy = legs.some(l => l.side === 'BUY')
  const hasSell = legs.some(l => l.side === 'SELL')
  return hasBuy && hasSell
}

function totalBuyCost(legs: BasketLeg[], lotSize: number): number {
  return legs
    .filter(l => l.side === 'BUY')
    .reduce((sum, l) => sum + l.quantity * lotSize * l.ltp, 0)
}

function maxLegsReached(legs: BasketLeg[]): boolean {
  return legs.length >= 4
}

describe('Basket leg validation', () => {
  test('empty basket is not a spread', () => {
    expect(isSpread([])).toBe(false)
  })

  test('only buy legs is not a spread', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'BUY', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 }
    ]
    expect(isSpread(legs)).toBe(false)
  })

  test('only sell legs is not a spread', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'SELL', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 }
    ]
    expect(isSpread(legs)).toBe(false)
  })

  test('buy + sell is a spread', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'BUY', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 },
      { id: '2', side: 'SELL', optionType: 'CE', strikePrice: 2340000, quantity: 1, ltp: 50 },
    ]
    expect(isSpread(legs)).toBe(true)
  })

  test('max 4 legs allowed', () => {
    const legs: BasketLeg[] = Array.from({ length: 4 }, (_, i) => ({
      id: String(i), side: 'BUY', optionType: 'CE',
      strikePrice: 2330000 + i * 10000, quantity: 1, ltp: 100
    }))
    expect(maxLegsReached(legs)).toBe(true)
  })

  test('3 legs not at max', () => {
    const legs: BasketLeg[] = Array.from({ length: 3 }, (_, i) => ({
      id: String(i), side: 'BUY', optionType: 'CE',
      strikePrice: 2330000 + i * 10000, quantity: 1, ltp: 100
    }))
    expect(maxLegsReached(legs)).toBe(false)
  })
})

describe('Basket cost calculation', () => {
  const lotSize = 65

  test('single buy leg cost', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'BUY', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 }
    ]
    expect(totalBuyCost(legs, lotSize)).toBe(6500)
  })

  test('two buy legs sum correctly', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'BUY', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 },
      { id: '2', side: 'BUY', optionType: 'PE', strikePrice: 2330000, quantity: 1, ltp: 80 },
    ]
    expect(totalBuyCost(legs, lotSize)).toBe(65 * 100 + 65 * 80)
  })

  test('sell legs excluded from buy cost', () => {
    const legs: BasketLeg[] = [
      { id: '1', side: 'BUY', optionType: 'CE', strikePrice: 2330000, quantity: 1, ltp: 100 },
      { id: '2', side: 'SELL', optionType: 'CE', strikePrice: 2340000, quantity: 1, ltp: 50 },
    ]
    expect(totalBuyCost(legs, lotSize)).toBe(6500)
  })
})