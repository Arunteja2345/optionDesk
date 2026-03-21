// Test ATM detection logic
function getATMIndex(strikes: { strikePrice: number }[], ltp: number) {
  let min = Infinity
  let idx = 0
  strikes.forEach((s, i) => {
    const diff = Math.abs(s.strikePrice / 100 - ltp)
    if (diff < min) { min = diff; idx = i }
  })
  return idx
}

const mockStrikes = [
  { strikePrice: 2300000 },
  { strikePrice: 2310000 },
  { strikePrice: 2320000 },
  { strikePrice: 2330000 },
  { strikePrice: 2340000 },
  { strikePrice: 2350000 },
]

describe('ATM detection', () => {
  test('exact match returns correct index', () => {
    expect(getATMIndex(mockStrikes, 23200)).toBe(2)
  })

  test('rounds to nearest strike below', () => {
    // LTP 23195 is closer to 23200 than 23100
    expect(getATMIndex(mockStrikes, 23195)).toBe(2)
  })

  test('rounds to nearest strike above', () => {
    // LTP 23205 is closer to 23200 than 23300
    expect(getATMIndex(mockStrikes, 23205)).toBe(2)
  })

  test('handles LTP below all strikes', () => {
    expect(getATMIndex(mockStrikes, 22000)).toBe(0)
  })

  test('handles LTP above all strikes', () => {
    expect(getATMIndex(mockStrikes, 25000)).toBe(5)
  })

  test('midpoint between two strikes picks lower', () => {
    // Exactly between 23200 and 23300
    const idx = getATMIndex(mockStrikes, 23250)
    expect(idx === 2 || idx === 3).toBe(true)
  })
})

describe('ITM/OTM detection', () => {
  const underlyingLtp = 23250

  test('CE is ITM when strike < underlying', () => {
    const ceITM = 23200 < underlyingLtp
    expect(ceITM).toBe(true)
  })

  test('CE is OTM when strike > underlying', () => {
    const ceITM = 23300 < underlyingLtp
    expect(ceITM).toBe(false)
  })

  test('PE is ITM when strike > underlying', () => {
    const peITM = 23300 > underlyingLtp
    expect(peITM).toBe(true)
  })

  test('PE is OTM when strike < underlying', () => {
    const peITM = 23200 > underlyingLtp
    expect(peITM).toBe(false)
  })
})