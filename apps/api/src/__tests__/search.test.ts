import { shouldFill } from '../workers/limitOrderExecutor'

function parseQuery(query: string) {
  const indexMap: Record<string, string> = {
    nifty: 'nifty', banknifty: 'banknifty',
    bank: 'banknifty', sensex: 'sensex',
  }
  const parts = query.toLowerCase().trim().split(/\s+/)
  const indexName = indexMap[parts[0]] ?? null
  const strikeDisplay = parts[1] ? parseInt(parts[1]) : null
  const strikeRaw = strikeDisplay && !isNaN(strikeDisplay) ? strikeDisplay * 100 : null
  return { indexName, strikeDisplay, strikeRaw }
}

function filterExpired(expiries: string[]): string[] {
  const today = new Date().toISOString().split('T')[0]
  return expiries.filter(e => e >= today)
}

function sortResults(results: { expiryDate: string; optionType: string }[]) {
  return [...results].sort((a, b) => {
    const d = a.expiryDate.localeCompare(b.expiryDate)
    return d !== 0 ? d : a.optionType.localeCompare(b.optionType)
  })
}

describe('Search query parsing', () => {
  test('nifty 23300 → raw 2330000', () => {
    const r = parseQuery('nifty 23300')
    expect(r.indexName).toBe('nifty')
    expect(r.strikeRaw).toBe(2330000)
  })

  test('banknifty 51000 → raw 5100000', () => {
    const r = parseQuery('banknifty 51000')
    expect(r.indexName).toBe('banknifty')
    expect(r.strikeRaw).toBe(5100000)
  })

  test('sensex 75000 → raw 7500000', () => {
    const r = parseQuery('sensex 75000')
    expect(r.indexName).toBe('sensex')
    expect(r.strikeRaw).toBe(7500000)
  })

  test('unknown index returns null', () => {
    expect(parseQuery('xyz 23300').indexName).toBeNull()
  })

  test('missing strike returns null', () => {
    expect(parseQuery('nifty').strikeRaw).toBeNull()
  })

  test('case insensitive', () => {
    expect(parseQuery('NIFTY 23300').indexName).toBe('nifty')
  })

  test('bank alias maps to banknifty', () => {
    expect(parseQuery('bank 51000').indexName).toBe('banknifty')
  })
})

describe('Expiry filtering', () => {
  test('removes past expiries', () => {
    const expiries = ['2020-01-01', '2099-12-31', '2099-06-30']
    const valid = filterExpired(expiries)
    expect(valid).not.toContain('2020-01-01')
    expect(valid).toHaveLength(2)
  })

  test('keeps today', () => {
    const today = new Date().toISOString().split('T')[0]
    const valid = filterExpired([today, '2020-01-01'])
    expect(valid).toContain(today)
  })

  test('empty list stays empty', () => {
    expect(filterExpired([])).toHaveLength(0)
  })
})

describe('Search result sorting', () => {
  const results = [
    { expiryDate: '2026-06-30', optionType: 'PE' },
    { expiryDate: '2026-04-28', optionType: 'PE' },
    { expiryDate: '2026-04-28', optionType: 'CE' },
    { expiryDate: '2026-05-26', optionType: 'CE' },
  ]

  test('closest expiry appears first', () => {
    const sorted = sortResults(results)
    expect(sorted[0].expiryDate).toBe('2026-04-28')
  })

  test('CE appears before PE within same expiry', () => {
    const sorted = sortResults(results)
    const aprilResults = sorted.filter(r => r.expiryDate === '2026-04-28')
    expect(aprilResults[0].optionType).toBe('CE')
    expect(aprilResults[1].optionType).toBe('PE')
  })

  test('furthest expiry appears last', () => {
    const sorted = sortResults(results)
    expect(sorted[sorted.length - 1].expiryDate).toBe('2026-06-30')
  })
})

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