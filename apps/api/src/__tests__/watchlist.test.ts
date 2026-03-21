// Test watchlist business logic

function isExpired(expiryDate: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return expiryDate < today
}

function isDuplicate(
  items: { contractId: string }[],
  contractId: string
): boolean {
  return items.some(i => i.contractId === contractId)
}

function isLimitReached(items: any[]): boolean {
  return items.length >= 50
}

describe('Watchlist expiry logic', () => {
  test('past date is expired', () => {
    expect(isExpired('2020-01-01')).toBe(true)
  })

  test('future date is not expired', () => {
    expect(isExpired('2099-12-31')).toBe(false)
  })

  test('today is not expired', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(isExpired(today)).toBe(false)
  })
})

describe('Watchlist duplicate detection', () => {
  const items = [
    { contractId: 'NIFTY2632423300CE' },
    { contractId: 'NIFTY2632423300PE' },
  ]

  test('detects existing contract', () => {
    expect(isDuplicate(items, 'NIFTY2632423300CE')).toBe(true)
  })

  test('allows new contract', () => {
    expect(isDuplicate(items, 'NIFTY2632423400CE')).toBe(false)
  })

  test('empty list has no duplicates', () => {
    expect(isDuplicate([], 'NIFTY2632423300CE')).toBe(false)
  })
})

describe('Watchlist limit', () => {
  test('50 items is at limit', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }))
    expect(isLimitReached(items)).toBe(true)
  })

  test('49 items is not at limit', () => {
    const items = Array.from({ length: 49 }, (_, i) => ({ id: String(i) }))
    expect(isLimitReached(items)).toBe(false)
  })

  test('empty list is not at limit', () => {
    expect(isLimitReached([])).toBe(false)
  })
})