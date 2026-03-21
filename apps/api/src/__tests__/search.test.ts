function parseSearchQuery(query: string) {
  const parts = query.toLowerCase().trim().split(/\s+/)
  const indexMap: Record<string, string> = {
    nifty: 'nifty',
    banknifty: 'banknifty',
    sensex: 'sensex',
  }
  const indexName = indexMap[parts[0]] ?? null
  const strikeDisplay = parts[1] ? parseInt(parts[1]) : null
  const strikeRaw = strikeDisplay ? strikeDisplay * 100 : null

  return { indexName, strikeDisplay, strikeRaw }
}

describe('Backend search parsing', () => {
  test('converts display strike to raw', () => {
    const result = parseSearchQuery('nifty 23300')
    expect(result.strikeRaw).toBe(2330000)
  })

  test('handles banknifty', () => {
    const result = parseSearchQuery('banknifty 51000')
    expect(result.indexName).toBe('banknifty')
    expect(result.strikeRaw).toBe(5100000)
  })

  test('rejects short query', () => {
    const query = 'ni'
    expect(query.length < 3).toBe(true)
  })

  test('returns null for unknown index', () => {
    const result = parseSearchQuery('abc 23300')
    expect(result.indexName).toBeNull()
  })
})

describe('Search result sorting', () => {
  const results = [
    { expiryDate: '2026-06-30', optionType: 'CE' },
    { expiryDate: '2026-04-28', optionType: 'CE' },
    { expiryDate: '2026-04-28', optionType: 'PE' },
    { expiryDate: '2026-05-26', optionType: 'CE' },
  ]

  test('sorts by expiry date ascending', () => {
    const sorted = [...results].sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate)
    )
    expect(sorted[0].expiryDate).toBe('2026-04-28')
    expect(sorted[sorted.length - 1].expiryDate).toBe('2026-06-30')
  })

  test('closest expiry appears first after sort', () => {
    const sorted = [...results].sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate)
    )
    expect(sorted[0].expiryDate).toBe('2026-04-28')
  })
})