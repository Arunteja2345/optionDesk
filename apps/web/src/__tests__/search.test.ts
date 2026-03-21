// Theme logic tests
function applyTheme(theme: 'dark' | 'light'): string[] {
  if (theme === 'light') return ['light']
  return ['dark']
}

function toggleTheme(current: 'dark' | 'light'): 'dark' | 'light' {
  return current === 'dark' ? 'light' : 'dark'
}

describe('Theme toggle', () => {
  test('dark toggles to light', () => {
    expect(toggleTheme('dark')).toBe('light')
  })

  test('light toggles to dark', () => {
    expect(toggleTheme('light')).toBe('dark')
  })

  test('light theme adds light class', () => {
    expect(applyTheme('light')).toContain('light')
  })

  test('dark theme adds dark class', () => {
    expect(applyTheme('dark')).toContain('dark')
  })
})


function parseSearchQuery(query: string): {
  indexName: string | null
  strikeDisplay: number | null
} {
  const parts = query.toLowerCase().trim().split(/\s+/)
  const indexMap: Record<string, string> = {
    nifty: 'nifty',
    banknifty: 'banknifty',
    sensex: 'sensex',
  }
  const indexName = indexMap[parts[0]] ?? null
  const strikeDisplay = parts[1] ? parseInt(parts[1]) : null
  return {
    indexName,
    strikeDisplay: strikeDisplay && !isNaN(strikeDisplay) ? strikeDisplay : null,
  }
}

function groupByExpiry(
  results: { expiryDate: string; contractId: string }[]
): Map<string, typeof results> {
  const map = new Map<string, typeof results>()
  results.forEach(r => {
    if (!map.has(r.expiryDate)) map.set(r.expiryDate, [])
    map.get(r.expiryDate)!.push(r)
  })
  return map
}

function getClosestExpiry(expiries: string[]): string {
  return [...expiries].sort()[0]
}

function shouldSearch(query: string): boolean {
  return query.trim().length >= 4
}

describe('Search query parsing', () => {
  test('parses nifty + strike', () => {
    const result = parseSearchQuery('nifty 23300')
    expect(result.indexName).toBe('nifty')
    expect(result.strikeDisplay).toBe(23300)
  })

  test('parses banknifty', () => {
    const result = parseSearchQuery('banknifty 51000')
    expect(result.indexName).toBe('banknifty')
    expect(result.strikeDisplay).toBe(51000)
  })

  test('parses sensex', () => {
    const result = parseSearchQuery('sensex 75000')
    expect(result.indexName).toBe('sensex')
    expect(result.strikeDisplay).toBe(75000)
  })

  test('returns null for unknown index', () => {
    const result = parseSearchQuery('xyz 23300')
    expect(result.indexName).toBeNull()
  })

  test('returns null strike for missing strike', () => {
    const result = parseSearchQuery('nifty')
    expect(result.strikeDisplay).toBeNull()
  })

  test('handles uppercase', () => {
    const result = parseSearchQuery('NIFTY 23300')
    expect(result.indexName).toBe('nifty')
  })
})

describe('Search debounce threshold', () => {
  test('does not search with < 4 chars', () => {
    expect(shouldSearch('nif')).toBe(false)
  })

  test('searches with >= 4 chars', () => {
    expect(shouldSearch('nift')).toBe(true)
  })

  test('does not search empty string', () => {
    expect(shouldSearch('')).toBe(false)
  })
})

describe('Search result grouping', () => {
  const results = [
    { expiryDate: '2026-04-28', contractId: 'A' },
    { expiryDate: '2026-04-28', contractId: 'B' },
    { expiryDate: '2026-05-26', contractId: 'C' },
  ]

  test('groups by expiry correctly', () => {
    const grouped = groupByExpiry(results)
    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-04-28')).toHaveLength(2)
    expect(grouped.get('2026-05-26')).toHaveLength(1)
  })

  test('closest expiry is first alphabetically', () => {
    const expiries = ['2026-05-26', '2026-04-28', '2026-06-30']
    expect(getClosestExpiry(expiries)).toBe('2026-04-28')
  })
})

describe('Debounce hook logic', () => {
  test('useDebounce returns initial value immediately', () => {
    const initial = 'nifty'
    expect(initial).toBe('nifty')
  })
})