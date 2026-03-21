interface WatchlistItem {
  id: string
  contractId: string
  expiryDate: string
}

function isExpired(expiryDate: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return expiryDate < today
}

function filterExpired(items: WatchlistItem[]): WatchlistItem[] {
  return items.filter(i => !isExpired(i.expiryDate))
}

function isWatched(items: WatchlistItem[], contractId: string): boolean {
  return items.some(i => i.contractId === contractId)
}

function canAdd(items: WatchlistItem[], contractId: string): {
  allowed: boolean
  reason?: string
} {
  if (items.length >= 50) return { allowed: false, reason: 'Limit reached' }
  if (isWatched(items, contractId)) return { allowed: false, reason: 'Already watching' }
  return { allowed: true }
}

describe('Watchlist expiry auto-removal', () => {
  test('removes expired items', () => {
    const items: WatchlistItem[] = [
      { id: '1', contractId: 'A', expiryDate: '2020-01-01' },
      { id: '2', contractId: 'B', expiryDate: '2099-01-01' },
    ]
    const active = filterExpired(items)
    expect(active).toHaveLength(1)
    expect(active[0].contractId).toBe('B')
  })

  test('keeps all valid items', () => {
    const items: WatchlistItem[] = [
      { id: '1', contractId: 'A', expiryDate: '2099-01-01' },
      { id: '2', contractId: 'B', expiryDate: '2099-06-01' },
    ]
    expect(filterExpired(items)).toHaveLength(2)
  })

  test('empty list stays empty', () => {
    expect(filterExpired([])).toHaveLength(0)
  })
})

describe('Watchlist add validation', () => {
  test('allows adding new contract', () => {
    const result = canAdd([], 'NIFTY2632423300CE')
    expect(result.allowed).toBe(true)
  })

  test('blocks duplicate contract', () => {
    const items: WatchlistItem[] = [
      { id: '1', contractId: 'NIFTY2632423300CE', expiryDate: '2099-01-01' }
    ]
    const result = canAdd(items, 'NIFTY2632423300CE')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Already watching')
  })

  test('blocks when at 50 item limit', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      contractId: `CONTRACT_${i}`,
      expiryDate: '2099-01-01'
    }))
    const result = canAdd(items, 'NEW_CONTRACT')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Limit reached')
  })
})

describe('isWatched', () => {
  const items: WatchlistItem[] = [
    { id: '1', contractId: 'NIFTY2632423300CE', expiryDate: '2099-01-01' }
  ]

  test('returns true for watched contract', () => {
    expect(isWatched(items, 'NIFTY2632423300CE')).toBe(true)
  })

  test('returns false for unwatched contract', () => {
    expect(isWatched(items, 'NIFTY2632423400CE')).toBe(false)
  })
})